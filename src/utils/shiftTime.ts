export interface ShiftTimingDetails {
  shiftStartHour: number;
  shiftDurationHours: number;
  shiftEndHour: number;
  shiftStartTimeStr: string;
  shiftEndTimeStr: string;
  shiftWindowLabel: string;
  shiftNameLabel: string;
}

/**
 * Formats an hour-of-day decimal (e.g., 8, 13.5, 16, 18.25, 26) into "HH:MM AM/PM".
 */
export function formatHourOfDay(hourDecimal: number): string {
  const safeVal = Number.isFinite(hourDecimal) ? hourDecimal : 8;
  const wrapped = ((safeVal % 24) + 24) % 24;
  let totalMinutes = Math.round(wrapped * 60);
  if (totalMinutes >= 24 * 60) {
    totalMinutes = totalMinutes % (24 * 60);
  }
  const hrs24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const ampm = hrs24 >= 12 ? 'PM' : 'AM';
  const hrs12 = hrs24 % 12 === 0 ? 12 : hrs24 % 12;
  return `${hrs12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Formats an hour-of-day decimal into 24-hour "HH:MM" notation.
 */
export function formatHourOfDay24(hourDecimal: number): string {
  const safeVal = Number.isFinite(hourDecimal) ? hourDecimal : 8;
  const wrapped = ((safeVal % 24) + 24) % 24;
  let totalMinutes = Math.round(wrapped * 60);
  if (totalMinutes >= 24 * 60) {
    totalMinutes = totalMinutes % (24 * 60);
  }
  const hrs24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${hrs24.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Computes all real-time shift timing labels from live operational configuration.
 * Never hardcodes shift end timings.
 */
export function getShiftTimingDetails(
  rawStartHour: number = 8,
  rawDurationHours: number = 8
): ShiftTimingDetails {
  const shiftStartHour = Number.isFinite(rawStartHour) ? rawStartHour : 8;
  const shiftDurationHours = Number.isFinite(rawDurationHours) && rawDurationHours > 0 ? rawDurationHours : 8;
  const shiftEndHour = shiftStartHour + shiftDurationHours;
  const shiftStartTimeStr = formatHourOfDay(shiftStartHour);
  const shiftEndTimeStr = formatHourOfDay(shiftEndHour);
  const durStr = Number.isInteger(shiftDurationHours)
    ? `${shiftDurationHours}.0`
    : shiftDurationHours.toFixed(1);

  return {
    shiftStartHour,
    shiftDurationHours,
    shiftEndHour,
    shiftStartTimeStr,
    shiftEndTimeStr,
    shiftWindowLabel: `${shiftStartTimeStr} – ${shiftEndTimeStr} (${durStr} Hours)`,
    shiftNameLabel: `Shift 1: Day (${shiftStartTimeStr} – ${shiftEndTimeStr})`,
  };
}

/**
 * Computes whether a shift has ended based on simulated seconds of day and dynamic shift configuration.
 */
export function isShiftCurrentlyEnded(
  simulatedSecondsOfDay: number,
  shiftStartHour: number = 8,
  shiftDurationHours: number = 8,
  isShiftOpen: boolean = true
): boolean {
  if (!isShiftOpen) return true;
  const currentHour = ((simulatedSecondsOfDay || 0) / 3600) % 24;
  const shiftEnd = shiftStartHour + shiftDurationHours;
  return currentHour >= shiftEnd;
}
