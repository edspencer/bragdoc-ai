// The Projects page's Gantt (SPEC R6), as pure functions over calendar days: the window fitted to the data, where a
// day sits in it, the gridlines, the bars, and projects packed into as few rows as don't overlap, per company.
// Adapted from the Scrapbook prototype's shared/gantt.ts, whose window and "today" were hard-coded to its seed data:
// here both are parameters (tested in test/gantt.test.ts).
import { addDays, daysBetween, isoDay, parseDay } from './dates.ts';

export interface GanttProject {
  id: string;
  name: string;
  start: string;
  end: string | null;
  companyId: string | null;
}

export interface GanttCompany {
  id: string;
  name: string;
  start?: string;
  end?: string | null;
}

export interface GanttWindow {
  /** The first day drawn (the 1st of a month). */
  start: string;
  /** The first day after the window (the 1st of a month). */
  end: string;
  days: number;
}

/** The fewest months a window spans, so one short project doesn't fill the whole width. */
const MIN_MONTHS = 6;

const firstOfMonth = (d: string) => `${d.slice(0, 7)}-01`;
function addMonths(d: string, n: number): string {
  const x = parseDay(firstOfMonth(d));
  x.setUTCMonth(x.getUTCMonth() + n);
  return isoDay(x);
}
const monthsBetween = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));

/** Where a project's bar stops: its end, or today while it's ongoing (and its start, if that's still to come). */
export function effectiveEnd(p: Pick<GanttProject, 'start' | 'end'>, today: string): string {
  if (p.end) return p.end < p.start ? p.start : p.end;
  return p.start > today ? p.start : today;
}

/**
 * The window that fits every project and today, from the 1st of the earliest start's month to the 1st of the month
 * after the latest end (with three weeks' room after it, for the today label), at least MIN_MONTHS wide (grown to the left,
 * since the future is mostly empty). With no projects, the last few months up to today.
 */
export function fitWindow(projects: readonly Pick<GanttProject, 'start' | 'end'>[], today: string): GanttWindow {
  let lo = today;
  let hi = today;
  for (const p of projects) {
    if (p.start < lo) lo = p.start;
    const e = effectiveEnd(p, today);
    if (e > hi) hi = e;
  }
  const end = addMonths(addDays(hi, 21), 1);
  let start = firstOfMonth(lo);
  if (monthsBetween(start, end) < MIN_MONTHS) start = addMonths(end, -MIN_MONTHS);
  return { start, end, days: daysBetween(start, end) };
}

/** A day's position across the window, 0–100 (clamped). */
export function pct(w: GanttWindow, d: string): number {
  return (Math.max(0, Math.min(w.days, daysBetween(w.start, d))) / w.days) * 100;
}

export interface Gridline {
  date: string;
  left: number;
  /** `Mar`, or `2027` / `Jan 2027` at a year boundary. */
  label: string;
  /** A year boundary (drawn stronger). */
  major: boolean;
}

/**
 * Month gridlines, thinned out as the window grows: every month up to two years, every quarter up to six, then every
 * January. Year boundaries are labelled with the year, so a timeline across New Year reads right.
 */
export function gridlines(w: GanttWindow): Gridline[] {
  const n = monthsBetween(w.start, w.end);
  const step = n <= 24 ? 1 : n <= 72 ? 3 : 12;
  const out: Gridline[] = [];
  for (let d = w.start; d < w.end; d = addMonths(d, 1)) {
    const m = parseDay(d).getUTCMonth();
    if (m % step !== 0) continue;
    const mon = parseDay(d).toLocaleString('en', { month: 'short', timeZone: 'UTC' });
    const year = d.slice(0, 4);
    const major = m === 0;
    out.push({ date: d, left: pct(w, d), label: major ? (step === 12 ? year : `${mon} ${year}`) : out.length === 0 ? `${mon} ${year}` : mon, major });
  }
  return out;
}

export interface Bar {
  left: number;
  width: number;
  /** No end date: striped, and drawn up to today. */
  ongoing: boolean;
  /** Ends (or starts) after today: drawn past the today line. */
  future: boolean;
}

/** The narrowest a bar gets, in percent, so a one-day project is still something to click. */
export const MIN_BAR = 1.2;

export function bar(w: GanttWindow, p: Pick<GanttProject, 'start' | 'end'>, today: string): Bar {
  const left = pct(w, p.start);
  // a bar covers its last day: it runs to the start of the day after
  const right = pct(w, addDays(effectiveEnd(p, today), 1));
  return { left: Math.min(left, 100 - MIN_BAR), width: Math.max(right - left, MIN_BAR), ongoing: !p.end, future: effectiveEnd(p, today) > today };
}

/**
 * Projects packed into rows, earliest first: each goes into the first row whose last bar ends before it starts (a
 * project ending the day another starts still overlaps it, since both days are drawn).
 */
export function packRows<P extends Pick<GanttProject, 'start' | 'end' | 'name'>>(projects: readonly P[], today: string): P[][] {
  const rows: { items: P[]; last: string }[] = [];
  const sorted = [...projects].sort((a, b) => (a.start !== b.start ? (a.start < b.start ? -1 : 1) : a.name.localeCompare(b.name)));
  for (const p of sorted) {
    const row = rows.find((r) => r.last < p.start);
    const e = effectiveEnd(p, today);
    if (row) {
      row.items.push(p);
      row.last = e;
    } else rows.push({ items: [p], last: e });
  }
  return rows.map((r) => r.items);
}

export interface Swimlane<P, C> {
  /** null: the "No company" lane. */
  company: C | null;
  rows: P[][];
  count: number;
}

/**
 * One lane per company (even one without projects yet, so it can be seen and edited), most recent first, then "No
 * company" for the rest (including projects whose company no longer exists), shown only when it has projects.
 */
export function swimlanes<P extends GanttProject, C extends GanttCompany>(projects: readonly P[], companies: readonly C[], today: string): Swimlane<P, C>[] {
  const known = new Set(companies.map((c) => c.id));
  const byCompany = new Map<string | null, P[]>();
  for (const p of projects) {
    const k = p.companyId && known.has(p.companyId) ? p.companyId : null;
    byCompany.set(k, [...(byCompany.get(k) ?? []), p]);
  }
  // a company's place: its latest project end (or its own end), newest first
  const recency = (c: C) => {
    const ps = byCompany.get(c.id) ?? [];
    let r = c.end ?? (c.start ? today : '');
    for (const p of ps) if (effectiveEnd(p, today) > r) r = effectiveEnd(p, today);
    return r;
  };
  const lanes: Swimlane<P, C>[] = [...companies]
    .sort((a, b) => {
      const ra = recency(a);
      const rb = recency(b);
      return ra !== rb ? (ra < rb ? 1 : -1) : a.name.localeCompare(b.name);
    })
    .map((c) => {
      const ps = byCompany.get(c.id) ?? [];
      return { company: c, rows: packRows(ps, today), count: ps.length };
    });
  const none = byCompany.get(null) ?? [];
  if (none.length) lanes.push({ company: null, rows: packRows(none, today), count: none.length });
  return lanes;
}

/** `3 weeks`, `5 months`, `2 years 3 months`; with `· ongoing` (or `· starts soon`) when it has no end. */
export function durationLabel(p: Pick<GanttProject, 'start' | 'end'>, today: string): string {
  if (!p.end && p.start > today) return 'starts soon';
  const days = daysBetween(p.start, effectiveEnd(p, today)) + 1;
  let s: string;
  if (days < 7) s = days === 1 ? '1 day' : `${days} days`;
  else if (days < 7 * 13) s = `${Math.round(days / 7)} week${Math.round(days / 7) === 1 ? '' : 's'}`;
  else {
    const months = Math.round(days / 30.44);
    const y = Math.floor(months / 12);
    const m = months % 12;
    s = y ? `${y} year${y === 1 ? '' : 's'}${m ? ` ${m} month${m === 1 ? '' : 's'}` : ''}` : `${months} months`;
  }
  return p.end ? s : `${s} · ongoing`;
}

/** How wide the chart is drawn, in px: roomier for longer windows, so months stay readable; it scrolls sideways. */
export function chartWidth(w: GanttWindow): number {
  return Math.round(Math.min(2400, Math.max(760, monthsBetween(w.start, w.end) * 56)));
}
