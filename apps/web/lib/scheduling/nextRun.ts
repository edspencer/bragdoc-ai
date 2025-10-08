import { addDays, set, isAfter } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { Weekday, orderedDays, type WeekdayKey } from './weekdayMask';

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

  let local = toZonedTime(nowUtc, tz);

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

  let local = toZonedTime(nowUtc, tz);

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
