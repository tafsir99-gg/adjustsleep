import type { ScheduleDay, TimeBlock } from './types';

function formatDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatHoursToICSLocalStr(baseDateStr: string, hour: number): string {
  const [y, m, d] = baseDateStr.split('-');
  const h = Math.floor(hour).toString().padStart(2, '0');
  const min = Math.floor((hour % 1) * 60).toString().padStart(2, '0');
  return `${y}${m}${d}T${h}${min}00`;
}

export function generateICS(schedule: ScheduleDay[], arrivalTZ: string): Blob {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AdjustSleep//JetLagCalculator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Adjust Sleep Plan`,
    `X-WR-TIMEZONE:${arrivalTZ}`
  ];

  const nowStr = formatDate(new Date());

  schedule.forEach((day, dayIndex) => {
    // In a real app we'd map day.date precisely based on departure/arrival date
    const baseDateStr = new Date(Date.now() + dayIndex * 86400000).toISOString().split('T')[0];

    day.blocks.forEach((block, blockIndex) => {
      if (block.type === 'sleep') return;

      const uid = `${Date.now()}-${dayIndex}-${blockIndex}@adjustsleep.com`;
      const startStr = formatHoursToICSLocalStr(baseDateStr, block.startHour);
      const endStr = formatHoursToICSLocalStr(baseDateStr, block.endHour);
      
      let summary = block.label;
      if (block.type === 'seek-light') summary = `☀️ ${summary}`;
      if (block.type === 'avoid-light') summary = `😎 ${summary}`;
      if (block.type === 'melatonin') summary = `💊 ${summary}`;

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${nowStr}`,
        `DTSTART;TZID=${arrivalTZ}:${startStr}`,
        `DTEND;TZID=${arrivalTZ}:${endStr}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${block.note || ''}`,
        'CATEGORIES:ADJUST_SLEEP',
        'END:VEVENT'
      );
    });
  });

  lines.push('END:VCALENDAR');

  return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
