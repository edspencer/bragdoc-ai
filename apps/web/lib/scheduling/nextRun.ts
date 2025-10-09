import { addDays, set, isAfter, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { Weekday, orderedDays, } from './weekdayMask';

/**
 * Compute the next scheduled run time in UTC
 *
 * @param nowUtc Current time in UTC
 * @param tz IANA timezone string (e.g., "America/New_York")
 * @param hhmm Time string in HH:mm format (e.g., "09:00")
 * @param daysMask Bitmask of enabled days (from weekdayMask)
 * @returns Next scheduled run time in UTC
 */
export function computeNextRunUTC(
  nowUtc: Date,
  tz: string,
  hhmm: string,
  daysMask: number,
): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Invalid time format: ${hhmm}. Expected HH:mm`);
  }

  const local = toZonedTime(nowUtc, tz);

  // Helper to map JS getDay (0=Sun, 1=Mon, etc.) to our Mon=0..Sun=6 index
  const toIdx = (d: number): number => (d + 6) % 7;

  // Try today first, then advance days until we hit a checked day with future time
  for (let i = 0; i < 7; i++) {
    const candidate = set(addDays(local, i), {
      hours,
      minutes,
      seconds: 0,
      milliseconds: 0,
    });

    const idx = toIdx(candidate.getDay());
    const key = orderedDays[idx];
    if (!key) continue;
    const bit = Weekday[key];

    // Check if this day is enabled and the time is in the future
    if (daysMask & bit && (i > 0 || isAfter(candidate, local))) {
      return fromZonedTime(candidate, tz);
    }
  }

  // Fallback: one week later at the same day/time
  const next = set(addDays(local, 7), {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });

  return fromZonedTime(next, tz);
}

/**
 * Compute the next run time, but return it in the specified timezone
 * Useful for display purposes
 */
export function computeNextRunInTimezone(
  nowUtc: Date,
  tz: string,
  hhmm: string,
  daysMask: number,
): Date {
  const nextUtc = computeNextRunUTC(nowUtc, tz, hhmm, daysMask);
  return toZonedTime(nextUtc, tz);
}

/**
 * Get the previous run time based on the schedule
 * Useful for determining which achievements to include
 */
export function computePreviousRunUTC(
  nowUtc: Date,
  tz: string,
  hhmm: string,
  daysMask: number,
): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Invalid time format: ${hhmm}. Expected HH:mm`);
  }

  const local = toZonedTime(nowUtc, tz);

  // Helper to map JS getDay to our index
  const toIdx = (d: number): number => (d + 6) % 7;

  // Look backwards up to 7 days to find the previous scheduled time
  for (let i = 0; i <= 7; i++) {
    const candidate = set(addDays(local, -i), {
      hours,
      minutes,
      seconds: 0,
      milliseconds: 0,
    });

    const idx = toIdx(candidate.getDay());
    const key = orderedDays[idx];
    if (!key) continue;
    const bit = Weekday[key];

    // Check if this day is enabled and the time is in the past
    if (daysMask & bit && (i > 0 || !isAfter(candidate, local))) {
      return fromZonedTime(candidate, tz);
    }
  }

  // Fallback: 7 days ago
  const prev = set(addDays(local, -7), {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });

  return fromZonedTime(prev, tz);
}

/**
 * Calculate the date range for achievements relevant to a standup
 * Returns from midnight at the start of the previous standup day
 * to midnight at the end of the next standup day
 *
 * @param nowUtc Current time in UTC
 * @param tz IANA timezone string
 * @param hhmm Time string in HH:mm format
 * @param daysMask Bitmask of enabled days
 * @returns Object with startDate and endDate in UTC
 */
export function getStandupAchievementDateRange(
  nowUtc: Date,
  tz: string,
  hhmm: string,
  daysMask: number,
): { startDate: Date; endDate: Date } {
  // Get previous and next standup occurrences in UTC
  const previousRunUtc = computePreviousRunUTC(nowUtc, tz, hhmm, daysMask);
  const nextRunUtc = computeNextRunUTC(nowUtc, tz, hhmm, daysMask);

  // Convert to timezone to get start/end of day in local time
  const previousRunLocal = toZonedTime(previousRunUtc, tz);
  const nextRunLocal = toZonedTime(nextRunUtc, tz);

  // Get start of previous standup day and end of next standup day
  const startLocal = startOfDay(previousRunLocal);
  const endLocal = endOfDay(nextRunLocal);

  // Convert back to UTC
  return {
    startDate: fromZonedTime(startLocal, tz),
    endDate: fromZonedTime(endLocal, tz),
  };
}
