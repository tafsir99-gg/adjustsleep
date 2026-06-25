export function getUTCOffsetMinutes(ianaTimezone: string, date: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      timeZoneName: 'longOffset',
    }).formatToParts(date);
    
    const offsetStr = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (!offsetStr) return 0;
    if (offsetStr === 'GMT') return 0;

    // e.g. GMT-04:00, GMT+05:30
    const match = offsetStr.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (!match) return 0;

    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);

    return sign * ((hours * 60) + minutes);
  } catch (e) {
    console.error(`Invalid timezone: ${ianaTimezone}`, e);
    return 0;
  }
}

export function createDateInTZ(dateStr: string, timeStr: string, ianaTimezone: string): Date {
  // Construct it as UTC first to avoid system local timezone bias
  const utcDate = new Date(`${dateStr}T${timeStr}:00Z`);
  
  // Get offset of this UTC date in the target timezone
  const offset1 = getUTCOffsetMinutes(ianaTimezone, utcDate);
  
  // Subtract the offset to get closer to the real absolute time
  const targetDate = new Date(utcDate.getTime() - offset1 * 60000);
  
  // Get offset of this new date to see if it crossed a DST boundary
  const offset2 = getUTCOffsetMinutes(ianaTimezone, targetDate);
  
  // If the offset changed, adjust again
  if (offset1 !== offset2) {
      return new Date(utcDate.getTime() - offset2 * 60000);
  }
  
  return targetDate;
}
