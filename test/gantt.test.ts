// The Gantt's maths (src/lib/gantt.ts): the fitted window, gridlines across year boundaries, bars for ongoing and
// future projects, row packing for overlaps, and company swimlanes with "No company".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bar, chartWidth, labelPlacement, durationLabel, fitWindow, gridlines, packRows, pct, swimlanes } from '../src/lib/gantt.ts';

const TODAY = '2026-10-17';
const p = (id: string, start: string, end: string | null, companyId: string | null = null) => ({ id, name: id, start, end, companyId });

test('the window fits the data, from the 1st of the first month to past the last end', () => {
  const w = fitWindow([p('a', '2025-11-03', '2026-02-27'), p('b', '2026-09-07', null)], TODAY);
  assert.equal(w.start, '2025-11-01');
  assert.equal(w.end, '2026-12-01'); // today + three weeks is in November → the 1st of the month after
  assert.equal(pct(w, w.start), 0);
  assert.equal(pct(w, w.end), 100);
  assert.equal(pct(w, '1999-01-01'), 0, 'clamped');
});

test('a project ending in the future widens the window past today', () => {
  const w = fitWindow([p('a', '2026-08-01', '2027-03-31')], TODAY);
  assert.equal(w.end, '2027-05-01');
});

test('no projects, or one short one: at least six months, ending a little after today', () => {
  for (const ps of [[], [p('a', '2026-10-01', '2026-10-10')]]) {
    const w = fitWindow(ps, TODAY);
    assert.equal(w.end, '2026-12-01');
    assert.equal(w.start, '2026-06-01');
  }
});

test('gridlines label the year at January and on the first line; thin out for long windows', () => {
  const w = fitWindow([p('a', '2025-11-03', null)], TODAY);
  const g = gridlines(w);
  assert.deepEqual(g.slice(0, 4).map((x) => x.label), ['Nov', 'Dec', 'Jan', 'Feb']);
  assert.deepEqual(g.slice(0, 4).map((x) => x.year), ['2025', undefined, '2026', undefined]);
  assert.equal(g[2].major, true);
  const long = gridlines(fitWindow([p('a', '2016-03-01', '2018-01-01')], TODAY));
  assert.ok(long.every((x) => x.date.endsWith('-01-01')), 'yearly lines for a ten-year window');
  assert.ok(long.some((x) => x.label === '2020'));
  const mid = gridlines(fitWindow([p('a', '2023-01-15', null)], TODAY));
  assert.ok(mid.every((x) => ['01', '04', '07', '10'].includes(x.date.slice(5, 7))), 'quarterly for a few years');
});

test('bars: ongoing stops at today, a future end draws past it, tiny ones stay clickable', () => {
  const w = fitWindow([p('a', '2026-01-01', null)], TODAY);
  const ongoing = bar(w, p('a', '2026-01-01', null), TODAY);
  assert.equal(ongoing.ongoing, true);
  assert.equal(ongoing.future, false);
  assert.ok(Math.abs(ongoing.left + ongoing.width - pct(w, '2026-10-18')) < 1e-9);
  const future = bar(w, p('b', '2026-09-01', '2027-01-31'), TODAY);
  assert.equal(future.future, true);
  assert.ok(future.left + future.width > pct(w, TODAY));
  const tiny = bar(w, p('c', '2026-05-05', '2026-05-05'), TODAY);
  assert.ok(tiny.width >= 1.2);
  const backwards = bar(w, p('d', '2026-05-05', '2026-04-01'), TODAY);
  assert.ok(backwards.width >= 1.2, 'an end before the start (a hand edit) still draws');
  const notYet = bar(w, p('e', '2026-12-01', null), TODAY);
  assert.equal(notYet.future, true);
  assert.ok(notYet.left <= 100 - 1.2, 'stays inside the chart');
});

test('overlapping projects go into separate rows; a later one reuses a free row', () => {
  const rows = packRows([p('a', '2026-01-01', '2026-03-31'), p('b', '2026-03-01', '2026-06-30'), p('c', '2026-04-01', null), p('d', '2026-03-31', '2026-04-15')], TODAY);
  assert.deepEqual(
    rows.map((r) => r.map((x) => x.id)),
    [['a', 'c'], ['b'], ['d']],
  );
  assert.deepEqual(packRows([], TODAY), []);
});

test('swimlanes: companies most recent first, empty companies kept, the rest (and dangling ids) in "No company"', () => {
  const companies = [
    { id: 'q', name: 'Quillfeather', start: '2023-01-01', end: '2026-06-30' },
    { id: 'alt', name: 'Altimetry', start: '2026-07-01', end: null },
    { id: 'new', name: 'Empty Co' , end: '2020-01-01' },
  ];
  const lanes = swimlanes([p('a', '2025-11-03', '2026-02-27', 'q'), p('b', '2026-09-07', null, 'alt'), p('c', '2026-01-01', null, null), p('d', '2026-01-01', null, 'gone')], companies, TODAY);
  assert.deepEqual(
    lanes.map((l) => l.company?.name ?? 'No company'),
    ['Altimetry', 'Quillfeather', 'Empty Co', 'No company'],
  );
  assert.equal(lanes[3].count, 2);
  assert.equal(lanes[2].count, 0);
  assert.deepEqual(swimlanes([], [], TODAY), []);
});

test('durations read like people say them', () => {
  assert.equal(durationLabel(p('a', '2026-09-07', null), TODAY), '6 weeks · ongoing');
  assert.equal(durationLabel(p('a', '2026-10-17', '2026-10-17'), TODAY), '1 day');
  assert.equal(durationLabel(p('a', '2025-11-03', '2026-02-27'), TODAY), '4 months');
  assert.equal(durationLabel(p('a', '2023-01-01', '2025-04-15'), TODAY), '2 years 3 months');
  assert.equal(durationLabel(p('a', '2027-01-01', null), TODAY), 'starts soon');
});

test('the chart grows with its window, within bounds', () => {
  assert.equal(chartWidth(fitWindow([], TODAY)), 760);
  assert.equal(chartWidth(fitWindow([p('a', '2006-01-01', null)], TODAY)), 2400);
});

test('a short bar\'s name goes beside it when there\'s room', () => {
  assert.equal(labelPlacement({ left: 10, width: 20 }, 100, 1000), 'inside');
  assert.equal(labelPlacement({ left: 10, width: 2 }, 100, 1000), 'after');
  assert.equal(labelPlacement({ left: 90, width: 2 }, 100, 1000, 100, 0), 'before');
  assert.equal(labelPlacement({ left: 50, width: 2 }, 100, 1000, 55, 45), 'inside', 'boxed in: cut short inside');
});
