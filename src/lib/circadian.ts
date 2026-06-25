import { type TripInput, type CalculationResult, type ScheduleDay, type TimeBlock, type FlightSegment } from './types';
import { getUTCOffsetMinutes, createDateInTZ } from './timezone';

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h + m / 60;
}

function normalizeHours(h: number): number {
  while (h < 0) h += 24;
  while (h >= 24) h -= 24;
  return h;
}

export function calculateSchedule(input: TripInput): CalculationResult {
  const depDate = createDateInTZ(input.departureDate, input.departureTime, input.departureTZ);
  const arrDate = createDateInTZ(input.arrivalDate, input.arrivalTime, input.arrivalTZ);

  const depOffset = getUTCOffsetMinutes(input.departureTZ, depDate);
  const arrOffset = getUTCOffsetMinutes(input.arrivalTZ, arrDate);

  let deltaHours = (arrOffset - depOffset) / 60;
  if (deltaHours > 12) deltaHours -= 24;
  if (deltaHours <= -12) deltaHours += 24;

  const direction = deltaHours > 0 ? 'east' : 'west';

  const wakeHour  = parseTime(input.normalWakeTime);
  const sleepHour = parseTime(input.normalSleepStart);

  // CBTmin ≈ 2 h before natural wake
  const baseCBTmin = normalizeHours(wakeHour - 2);

  // ── Sleep-window offsets (derived from actual user schedule, not hardcoded) ─
  //
  // sleepOffset: how many hours BEFORE CBTmin the user normally falls asleep.
  //   Example: sleep=23:00, CBTmin=05:00 → 6 hours before CBTmin
  //   Formula: (baseCBTmin - sleepHour + 24) % 24
  //
  // wakeOffset: how many hours AFTER CBTmin the user normally wakes up.
  //   Example: wake=07:00, CBTmin=05:00 → 2 hours after CBTmin
  //   Formula: (wakeHour - baseCBTmin + 24) % 24
  //
  // This makes the rendered windows accurate regardless of chronotype.
  // ─────────────────────────────────────────────────────────────────────────────
  const sleepOffset = ((baseCBTmin - sleepHour) + 24) % 24;   // e.g. (5-23+24)%24 = 6
  const wakeOffset  = ((wakeHour  - baseCBTmin) + 24) % 24;   // e.g. (7-5+24)%24  = 2

  const shiftPerDay = 1.0;
  const totalAdjustmentDays = Math.ceil(Math.abs(deltaHours) / shiftPerDay);

  const schedule: ScheduleDay[] = [];
  const flightPlan: FlightSegment[] = [];

  const preDays = input.strategy === 'pre-flight'
    ? Math.min(input.preDays, totalAdjustmentDays)
    : 0;

  // ── Sign convention ───────────────────────────────────────────────────────
  // Phase ADVANCE (east, Δ > 0): clock must move EARLIER → shift is NEGATIVE
  // Phase DELAY  (west, Δ < 0): clock must move LATER  → shift is POSITIVE
  // stepSign = -Math.sign(deltaHours) gives us the correct accumulation sign.
  // ─────────────────────────────────────────────────────────────────────────
  const stepSign = -Math.sign(deltaHours);
  let currentShift = 0;

  for (let i = preDays; i > 0; i--) {
    currentShift += shiftPerDay * stepSign;
    if (Math.abs(currentShift) > Math.abs(deltaHours)) {
      currentShift = -deltaHours;
    }
    schedule.push(generateDaySchedule(
      `Day -${i} (Pre-flight)`,
      baseCBTmin, currentShift, direction,
      sleepOffset, wakeOffset,
      input.includeMelatonin
    ));
  }

  schedule.push(generateDaySchedule(
    'Flight Day',
    baseCBTmin, currentShift, direction,
    sleepOffset, wakeOffset,
    input.includeMelatonin
  ));

  let postDay = 1;
  while (Math.abs(currentShift) < Math.abs(deltaHours)) {
    currentShift += shiftPerDay * stepSign;
    if (Math.abs(currentShift) > Math.abs(deltaHours)) {
      currentShift = -deltaHours;
    }
    schedule.push(generateDaySchedule(
      `Day ${postDay} (Post-arrival)`,
      baseCBTmin, currentShift, direction,
      sleepOffset, wakeOffset,
      input.includeMelatonin
    ));
    postDay++;
  }

  if (postDay === 1 && preDays === 0) {
    schedule.push(generateDaySchedule(
      'Day 1 (Post-arrival) — Fully Adjusted',
      baseCBTmin, -deltaHours, direction,
      sleepOffset, wakeOffset,
      input.includeMelatonin
    ));
  }

  // ── Flight duration (pure elapsed UTC milliseconds, no deltaHours subtraction) ──
  const flightDurationHours = (arrDate.getTime() - depDate.getTime()) / (1000 * 60 * 60);
  const depTimeHour = parseTime(input.departureTime);
  let flightElapsed = 0;
  const safeDuration = Math.max(flightDurationHours, 0.5);

  while (flightElapsed < safeDuration) {
    const segStart = flightElapsed;
    const segEnd   = Math.min(flightElapsed + 3, safeDuration);
    const currentBodyTime = normalizeHours(depTimeHour + flightElapsed);
    const shiftedCBTmin   = normalizeHours(baseCBTmin + currentShift);

    let type: FlightSegment['type'] = 'stay-awake';
    let label = 'Stay awake, hydrate';

    const isSleepWindow = isTimeInWindow(currentBodyTime, shiftedCBTmin - 3, shiftedCBTmin + 5);
    if (isSleepWindow) {
      type = 'eye-mask';
      label = 'Eye mask on, try to sleep';
    } else if (direction === 'east' && isTimeInWindow(currentBodyTime, shiftedCBTmin, shiftedCBTmin + 4)) {
      type  = 'cabin-light';
      label = 'Seek cabin light / open window shade';
    } else if (direction === 'west' && isTimeInWindow(currentBodyTime, shiftedCBTmin - 4, shiftedCBTmin)) {
      type  = 'cabin-light';
      label = 'Seek cabin light / open window shade';
    }

    flightPlan.push({
      startMinute: Math.round(segStart * 60),
      endMinute:   Math.round(segEnd   * 60),
      label,
      type
    });
    flightElapsed = segEnd;
  }

  return {
    deltaHours,
    direction,
    totalAdjustmentDays: Math.max(totalAdjustmentDays, 1),
    schedule,
    flightPlan
  };
}

// ────────────────────────────────────────────────────────────────────────────
// generateDaySchedule
//
// sleepOffset  – hours BEFORE shiftedCBTmin when sleep starts (e.g. 6h)
// wakeOffset   – hours AFTER  shiftedCBTmin when wake happens  (e.g. 2h)
//
// Direction-specific light windows:
//
//   EASTWARD (phase advance, shift < 0):
//     Sleep moves EARLIER. Seek light immediately AFTER CBTmin (morning).
//     sleepStart = shiftedCBTmin - sleepOffset  → moves left ✓
//
//   WESTWARD (phase delay,   shift > 0):
//     Sleep moves LATER. Seek light in the EVENING, 4h before new sleep start.
//     Anchoring to (shiftedSleepStart - 4h) keeps the window in social daylight,
//     NOT in the 2–6 AM middle-of-night that the old CBTmin-anchored formula
//     was incorrectly producing.
// ────────────────────────────────────────────────────────────────────────────
function generateDaySchedule(
  label: string,
  baseCBTmin: number,
  shift: number,
  direction: 'east' | 'west',
  sleepOffset: number,
  wakeOffset: number,
  useMelatonin: boolean
): ScheduleDay {
  const shiftedCBTmin  = normalizeHours(baseCBTmin + shift);
  const sleepStart     = normalizeHours(shiftedCBTmin - sleepOffset);
  const sleepEnd       = normalizeHours(shiftedCBTmin + wakeOffset);

  const blocks: TimeBlock[] = [];

  blocks.push({
    type: 'sleep',
    startHour: sleepStart,
    endHour:   sleepEnd,
    label: 'Sleep / Avoid Light',
    note: 'Keep your environment dark.'
  });

  if (direction === 'east') {
    // ── Phase advance: seek bright light in the morning AFTER CBTmin ──────
    blocks.push({
      type: 'seek-light',
      startHour: shiftedCBTmin,
      endHour:   normalizeHours(shiftedCBTmin + 4),
      label: 'Seek Bright Light',
      note: 'Get outside or use a 10,000 lux lamp to advance your clock.'
    });

    if (useMelatonin) {
      blocks.push({
        type: 'melatonin',
        startHour: normalizeHours(sleepStart - 0.5),
        endHour:   sleepStart,
        label: 'Melatonin (0.5–3 mg)',
        note: 'Take low-dose melatonin to signal an earlier night.'
      });
    }
  } else {
    // ── Phase delay: seek bright light in the EVENING before bed ──────────
    // Anchor to (sleepStart - 4h) so the window falls in early/late evening,
    // NOT in the early morning hours that the old (shiftedCBTmin - 4h) formula
    // was incorrectly producing for westward travel.
    blocks.push({
      type: 'seek-light',
      startHour: normalizeHours(sleepStart - 4),
      endHour:   sleepStart,
      label: 'Seek Bright Light',
      note: 'Bright evening light delays your clock to match the new timezone.'
    });
  }

  // Split any block that wraps past midnight into two segments for clean Gantt rendering
  const finalBlocks: TimeBlock[] = [];
  for (const block of blocks) {
    if (block.startHour > block.endHour) {
      finalBlocks.push({ ...block, endHour: 24 });
      finalBlocks.push({ ...block, startHour: 0 });
    } else {
      finalBlocks.push(block);
    }
  }

  return {
    date: new Date().toISOString().split('T')[0],
    label,
    blocks: finalBlocks
  };
}

function isTimeInWindow(t: number, start: number, end: number): boolean {
  const nStart = normalizeHours(start);
  const nEnd   = normalizeHours(end);
  if (nStart <= nEnd) {
    return t >= nStart && t < nEnd;
  } else {
    return t >= nStart || t < nEnd;
  }
}
