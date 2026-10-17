// Calendar days and week grouping for the board (src/lib/dates.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysBetween, fmt, groupByWeek, todayIso, weekLabel, weekStart } from '../src/lib/dates.ts';

test('weeks start on Monday, including across months and years', () => {
  assert.equal(weekStart('2026-10-17'), '2026-10-12'); // Saturday
  assert.equal(weekStart('2026-10-12'), '2026-10-12'); // Monday
  assert.equal(weekStart('2026-10-18'), '2026-10-12'); // Sunday
  assert.equal(weekStart('2026-01-01'), '2025-12-29');
  assert.equal(weekStart('2026-03-29T23:30:00Z'), '2026-03-23'); // a timestamp: its day, not shifted
});

test('day arithmetic ignores DST and month lengths', () => {
  assert.equal(addDays('2026-03-28', 2), '2026-03-30');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(daysBetween('2026-10-01', '2026-10-17'), 16);
});

test('todayIso is the local calendar day', () => {
  assert.equal(todayIso(new Date(2026, 9, 7, 23, 59)), '2026-10-07');
});

test('week labels', () => {
  const today = '2026-10-17';
  assert.equal(weekLabel('2026-10-12', today), 'This week');
  assert.equal(weekLabel('2026-10-05', today), 'Last week');
  assert.equal(weekLabel('2026-09-07', today), 'Week of 7 Sep');
  assert.equal(weekLabel('2025-12-29', today), 'Week of 29 December 2025');
});

test('date formats', () => {
  assert.equal(fmt.short('2026-09-07'), '7 Sep');
  assert.equal(fmt.long('2026-09-07'), '7 September 2026');
  assert.equal(fmt.dowShort('2026-10-17'), 'Sat');
  assert.equal(fmt.range('2026-10-12', '2026-10-18'), '12–18 Oct');
  assert.equal(fmt.range('2026-09-28', '2026-10-04'), '28 Sep – 4 Oct');
  assert.equal(fmt.range('2025-12-29', '2026-01-04'), '29 Dec 2025 – 4 Jan 2026');
  assert.equal(fmt.relative('2026-10-17', '2026-10-17'), 'today');
  assert.equal(fmt.relative('2026-10-16', '2026-10-17'), 'yesterday');
  assert.equal(fmt.relative('2026-10-14', '2026-10-17'), '3 days ago');
  assert.equal(fmt.relative('2026-10-18', '2026-10-17'), 'in the future');
});

test('groupByWeek: newest week first, newest item first, every item once', () => {
  const items = [
    { id: 'a', date: '2026-10-13' },
    { id: 'b', date: '2026-10-05' },
    { id: 'c', date: '2026-10-18' },
    { id: 'd', date: '2026-10-11' },
  ];
  const weeks = groupByWeek(items);
  assert.deepEqual(
    weeks.map((w) => [w.start, w.end, w.items.map((i) => i.id)]),
    [
      ['2026-10-12', '2026-10-18', ['c', 'a']],
      ['2026-10-05', '2026-10-11', ['d', 'b']],
    ],
  );
  assert.deepEqual(groupByWeek([]), []);
});
