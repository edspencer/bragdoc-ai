import { addMinutes } from 'date-fns';
import { computeNextRunUTC } from '../scheduling/nextRun';

/**
 * Calculate all standup occurrences within a date range
 *
 * @param startDate - Start of date range (UTC)
 * @param endDate - End of date range (UTC)
 * @param timezone - IANA timezone string
 * @param meetingTime - Time in HH:mm format
 * @param daysMask - Bitmask of enabled days
 * @returns Array of Date objects representing each standup occurrence in UTC
 */
export function calculateStandupOccurrences(
  startDate: Date,
  endDate: Date,
  timezone: string,
  meetingTime: string,
  daysMask: number,
): Date[] {
  const occurrences: Date[] = [];

  // Start from the first occurrence on or after startDate
  let currentDate = computeNextRunUTC(startDate, timezone, meetingTime, daysMask);

  // Keep finding next occurrences until we exceed endDate
  while (currentDate <= endDate) {
    occurrences.push(currentDate);

    // Find the next occurrence by advancing 1 minute past current and computing next run
    currentDate = computeNextRunUTC(
      addMinutes(currentDate, 1),
      timezone,
      meetingTime,
      daysMask,
    );
  }

  return occurrences;
}
