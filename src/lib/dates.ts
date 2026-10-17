// Calendar dates for the board and Folio. An achievement's date is a calendar day (`YYYY-MM-DD`), not an instant, so
// everything here does arithmetic on the day itself (in UTC, where days have no DST gaps) and never shifts it by a
// time zone. "Today" is the user's local day. Weeks start on Monday. Ported from the Scrapbook prototype's
// shared/dates.ts, with "today" passed in rather than read from its seed data (tested in test/dates.test.ts).

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = MONTHS.map((m) => m.slice(0, 3));
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** `YYYY-MM-DD` (or the start of an ISO timestamp) → that day at 00:00 UTC. */
export function parseDay(d: string): Date {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

/** A Date's UTC day as `YYYY-MM-DD`. */
export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The user's local calendar day, `YYYY-MM-DD`. */
export function todayIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function addDays(d: string, n: number): string {
  const x = parseDay(d);
  x.setUTCDate(x.getUTCDate() + n);
  return isoDay(x);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);
}

/** The Monday on or before `d`. */
export function weekStart(d: string): string {
  const x = parseDay(d);
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return isoDay(x);
}

export const fmt = {
  day: (d: string) => parseDay(d).getUTCDate(),
  dow: (d: string) => DAYS[parseDay(d).getUTCDay()],
  dowShort: (d: string) => DAYS[parseDay(d).getUTCDay()].slice(0, 3),
  month: (d: string) => MONTHS[parseDay(d).getUTCMonth()],
  mon: (d: string) => MON[parseDay(d).getUTCMonth()],
  /** 7 Sep */
  short: (d: string) => `${parseDay(d).getUTCDate()} ${MON[parseDay(d).getUTCMonth()]}`,
  /** 7 September 2026 */
  long: (d: string) => `${parseDay(d).getUTCDate()} ${MONTHS[parseDay(d).getUTCMonth()]} ${parseDay(d).getUTCFullYear()}`,
  /** Sep 2026 */
  monYear: (d: string) => `${MON[parseDay(d).getUTCMonth()]} ${parseDay(d).getUTCFullYear()}`,
  /** 7–13 Sep, or 28 Sep – 4 Oct, or 29 Dec 2025 – 4 Jan 2026 across a year */
  range: (a: string, b: string) => {
    const A = parseDay(a);
    const B = parseDay(b);
    if (A.getUTCFullYear() !== B.getUTCFullYear()) return `${fmt.short(a)} ${A.getUTCFullYear()} – ${fmt.short(b)} ${B.getUTCFullYear()}`;
    if (A.getUTCMonth() === B.getUTCMonth()) return `${A.getUTCDate()}–${B.getUTCDate()} ${MON[B.getUTCMonth()]}`;
    return `${fmt.short(a)} – ${fmt.short(b)}`;
  },
  /** today, yesterday, 3 days ago, last week, 5 weeks ago, 4 months ago; a future day is "in the future" */
  relative: (d: string, today: string = todayIso()) => {
    const n = daysBetween(d.slice(0, 10), today);
    if (n < 0) return 'in the future';
    if (n === 0) return 'today';
    if (n === 1) return 'yesterday';
    if (n < 7) return `${n} days ago`;
    if (n < 14) return 'last week';
    if (n < 60) return `${Math.round(n / 7)} weeks ago`;
    return `${Math.round(n / 30)} months ago`;
  },
};

/** "This week", "Last week", or "Week of 7 Sep" (with the year when it isn't this year's). */
export function weekLabel(start: string, today: string = todayIso()): string {
  const thisWeek = weekStart(today);
  if (start === thisWeek) return 'This week';
  if (start === addDays(thisWeek, -7)) return 'Last week';
  return start.slice(0, 4) === today.slice(0, 4) ? `Week of ${fmt.short(start)}` : `Week of ${fmt.long(start)}`;
}

export interface WeekGroup<T> {
  /** Monday */
  start: string;
  /** Sunday */
  end: string;
  items: T[];
}

/** Items grouped into Monday-to-Sunday weeks, newest week first and newest item first within each. */
export function groupByWeek<T extends { date: string }>(items: readonly T[]): WeekGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const it of [...items].sort((a, b) => b.date.localeCompare(a.date))) {
    const ws = weekStart(it.date);
    let list = map.get(ws);
    if (!list) map.set(ws, (list = []));
    list.push(it);
  }
  return [...map.entries()].map(([start, list]) => ({ start, end: addDays(start, 6), items: list }));
}
