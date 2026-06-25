import { calculateSchedule } from './src/lib/circadian.ts';
import type { TripInput } from './src/lib/types.ts';

const scenarios: {name: string, input: TripInput}[] = [
  {
    name: "Eastward: Dhaka (+6) to New York (-4)",
    input: {
      departureTZ: 'Asia/Dhaka',
      arrivalTZ: 'America/New_York',
      departureDate: '2026-07-01',
      departureTime: '10:00',
      arrivalDate: '2026-07-01',
      arrivalTime: '18:00',
      normalSleepStart: '23:00',
      normalWakeTime: '07:00',
      strategy: 'pre-flight',
      includeMelatonin: true,
      preDays: 3
    }
  },
  {
    name: "Westward: London (+1) to Tokyo (+9)",
    input: {
      departureTZ: 'Europe/London',
      arrivalTZ: 'Asia/Tokyo',
      departureDate: '2026-07-01',
      departureTime: '14:00',
      arrivalDate: '2026-07-02',
      arrivalTime: '09:00',
      normalSleepStart: '23:30',
      normalWakeTime: '07:30',
      strategy: 'in-flight',
      includeMelatonin: false,
      preDays: 3
    }
  },
  {
    name: "DST Boundary Crossing (March 2026)",
    input: {
      departureTZ: 'America/New_York',
      arrivalTZ: 'Europe/London',
      departureDate: '2026-03-08',
      departureTime: '10:00',
      arrivalDate: '2026-03-09',
      arrivalTime: '08:00',
      normalSleepStart: '22:00',
      normalWakeTime: '06:00',
      strategy: 'pre-flight',
      includeMelatonin: true,
      preDays: 3
    }
  },
  {
    name: "Zero Timezone Change (North-South)",
    input: {
      departureTZ: 'America/New_York',
      arrivalTZ: 'America/Toronto',
      departureDate: '2026-07-01',
      departureTime: '09:00',
      arrivalDate: '2026-07-01',
      arrivalTime: '15:00',
      normalSleepStart: '23:00',
      normalWakeTime: '07:00',
      strategy: 'post-flight',
      includeMelatonin: false,
      preDays: 3
    }
  },
  {
    name: "Maximum 12-Hour Flip (New York to Beijing)",
    input: {
      departureTZ: 'America/New_York',
      arrivalTZ: 'Asia/Shanghai',
      departureDate: '2026-07-01',
      departureTime: '12:00',
      arrivalDate: '2026-07-02',
      arrivalTime: '14:00',
      normalSleepStart: '23:00',
      normalWakeTime: '07:00',
      strategy: 'pre-flight',
      includeMelatonin: true,
      preDays: 3
    }
  }
];

function runTests() {
  console.log("=== RUNNING CIRCADIAN ALGORITHM TESTS ===\n");
  let passed = 0;

  for (const scenario of scenarios) {
    console.log(`Testing: ${scenario.name}`);
    try {
      const result = calculateSchedule(scenario.input);
      console.log(`  Δ: ${result.deltaHours}h | Direction: ${result.direction} | Days: ${result.totalAdjustmentDays}`);

      if (result.deltaHours > 12 || result.deltaHours < -12) {
        throw new Error(`Delta hours out of normalized bounds: ${result.deltaHours}`);
      }

      if (scenario.name.includes('Zero Timezone') && result.deltaHours !== 0) {
        throw new Error(`Expected 0 delta, got ${result.deltaHours}`);
      }

      result.schedule.forEach(day => {
        day.blocks.forEach(block => {
          if (isNaN(block.startHour) || isNaN(block.endHour)) {
            throw new Error(`NaN found in block: ${JSON.stringify(block)}`);
          }
          if (block.startHour < 0 || block.startHour > 24 || block.endHour < 0 || block.endHour > 24) {
            throw new Error(`Block time out of bounds: ${JSON.stringify(block)}`);
          }
        });
      });

      console.log(`  ✅ Passed. Blocks generated: ${result.schedule.reduce((acc, d) => acc + d.blocks.length, 0)}`);
      passed++;
    } catch (e: any) {
      console.log(`  ❌ Failed: ${e.message}`);
    }
    console.log("");
  }

  console.log(`Tests completed: ${passed} / ${scenarios.length} passed.\n`);
}

runTests();

// ─── PHASE DIRECTION AUDIT ────────────────────────────────────────────────────
// For EASTWARD travel, each pre-flight day's sleep window should shift EARLIER.
// We verify that CBTmin moves left (decreasing hour value) day over day.

console.log("=== PHASE DIRECTION AUDIT (NY→London, Eastward, 5h shift) ===\n");
const eastResult = calculateSchedule({
  departureTZ: 'America/New_York',
  arrivalTZ: 'Europe/London',
  departureDate: '2026-07-04',
  departureTime: '19:00',
  arrivalDate: '2026-07-05',
  arrivalTime: '07:00',
  normalSleepStart: '23:00',
  normalWakeTime: '07:00',
  strategy: 'pre-flight',
  includeMelatonin: true,
  preDays: 3
});

console.log(`Direction: ${eastResult.direction} | Δ: ${eastResult.deltaHours}h`);
let prevSleepStart: number | null = null;
for (const day of eastResult.schedule) {
  const sleepBlock = day.blocks.find(b => b.type === 'sleep');
  if (!sleepBlock) continue;
  const marker = prevSleepStart !== null
    ? (sleepBlock.startHour < prevSleepStart ? '← earlier ✅' : sleepBlock.startHour > prevSleepStart ? '→ LATER ❌' : '= same')
    : '';
  console.log(`  ${day.label.padEnd(30)} sleep starts at ${sleepBlock.startHour.toFixed(2)}h  ${marker}`);
  prevSleepStart = sleepBlock.startHour;
}

// ─── FLIGHT DURATION AUDIT ────────────────────────────────────────────────────
// NY 25-Jun 10:00 → London 26-Jun 08:00 BST = 7 hours flight time (10:00 EDT = 14:00 UTC; 08:00 BST = 07:00 UTC; Δ = 17h... but date is next day so 17h elapsed)

console.log("\n=== FLIGHT DURATION AUDIT (NY 25-Jun 10:00 → London 26-Jun 08:00) ===\n");
const flightResult = calculateSchedule({
  departureTZ: 'America/New_York',
  arrivalTZ: 'Europe/London',
  departureDate: '2026-06-25',
  departureTime: '10:00',
  arrivalDate: '2026-06-26',
  arrivalTime: '08:00',
  normalSleepStart: '23:00',
  normalWakeTime: '07:00',
  strategy: 'pre-flight',
  includeMelatonin: true,
  preDays: 3
});

const totalFlightMinutes = flightResult.flightPlan.reduce((sum, seg) => sum + (seg.endMinute - seg.startMinute), 0);
const totalFlightHours = totalFlightMinutes / 60;

console.log(`  Total in-flight segments: ${flightResult.flightPlan.length}`);
console.log(`  Total flight duration covered: ${totalFlightHours.toFixed(2)} hours`);
// NY (EDT = UTC-4) 10:00 = 14:00 UTC. London (BST = UTC+1) 26-Jun 08:00 = 07:00 UTC. Elapsed = 17h.
console.log(`  Expected: ~17 hours (10:00 EDT to next-day 08:00 BST via UTC)`);

if (totalFlightHours > 12) {
  console.log(`  ✅ Duration exceeds 12h — no hard cap applied`);
} else {
  console.log(`  ❌ Duration seems capped — check calculation`);
}

flightResult.flightPlan.forEach((seg, i) => {
  const h = (min: number) => `${Math.floor(min/60)}h${String(min%60).padStart(2,'0')}m`;
  console.log(`    Seg ${i+1}: +${h(seg.startMinute)} → +${h(seg.endMinute)}  [${seg.type}] ${seg.label}`);
});
