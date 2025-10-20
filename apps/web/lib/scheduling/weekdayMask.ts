/**
 * Weekday bitmask utilities for scheduling
 * Each day is represented by a bit: Mon=1, Tue=2, Wed=4, etc.
 */

export const Weekday = {
  Mon: 1 << 0, // 1
  Tue: 1 << 1, // 2
  Wed: 1 << 2, // 4
  Thu: 1 << 3, // 8
  Fri: 1 << 4, // 16
  Sat: 1 << 5, // 32
  Sun: 1 << 6, // 64
} as const;

export type WeekdayKey = keyof typeof Weekday;

/**
 * Convert an array of weekday keys to a bitmask
 * @param days Array of weekday keys (e.g., ['Mon', 'Wed', 'Fri'])
 * @returns Bitmask representing the days
 */
export function toMask(days: WeekdayKey[]): number {
  return days.reduce((mask, day) => mask | Weekday[day], 0);
}

/**
 * Convert a bitmask to an array of weekday keys
 * @param mask Bitmask representing days
 * @returns Array of weekday keys
 */
export function fromMask(mask: number): WeekdayKey[] {
  const out: WeekdayKey[] = [];
  (Object.keys(Weekday) as WeekdayKey[]).forEach((key) => {
    if (mask & Weekday[key]) {
      out.push(key);
    }
  });
  return out;
}

/**
 * Ordered array of weekdays for UI rendering (Mon-Sun)
 */
export const orderedDays: WeekdayKey[] = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
];

/**
 * Get the display label for a weekday (single letter)
 */
export function getWeekdayLabel(day: WeekdayKey): string {
  return day.charAt(0);
}

/**
 * Check if a specific day is set in a mask
 */
export function isDaySet(mask: number, day: WeekdayKey): boolean {
  return (mask & Weekday[day]) !== 0;
}

/**
 * Toggle a day in a mask
 */
export function toggleDay(mask: number, day: WeekdayKey): number {
  return mask ^ Weekday[day];
}
