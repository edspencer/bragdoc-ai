// Found's judge words and grouping (src/found/judge.ts, PR25): pure, so tested here. The groups' order, and the plain
// sentences for when the judge runs by itself and why it isn't running now.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AiJudgeSchedule } from '../shared/api.ts';
import type { FoundCandidate } from '../shared/schema/index.ts';
import { countsLine, errorWords, groupFound, judgeEmptyLine, scheduleLine } from '../src/found/judge.ts';

const c = (id: string, verdict?: { keep: boolean; confidence?: number }) => ({ id, verdict: verdict ? { ...verdict, suggestedProjects: [] } : undefined }) as unknown as FoundCandidate;

const sched = (o: Partial<AiJudgeSchedule> = {}): AiJudgeSchedule => ({
  background: true,
  onArrival: true,
  everyHours: null,
  cloud: false,
  power: 'ac',
  hold: null,
  nextRunAt: null,
  arrivalsWaiting: false,
  backoff: null,
  lastRun: null,
  ...o,
});

describe('groupFound', () => {
  test('no verdict at all: not grouped (v0.1\'s list)', () => {
    const g = groupFound([c('a'), c('b')]);
    assert.equal(g.grouped, false);
    assert.deepEqual(g.unjudged.map((x) => x.id), ['a', 'b']);
  });

  test('wins surest first, unjudged in list order, probably-not surest first; ties keep the list order', () => {
    const g = groupFound([c('u1'), c('w60', { keep: true, confidence: 0.6 }), c('n70', { keep: false, confidence: 0.7 }), c('w90', { keep: true, confidence: 0.9 }), c('u2'), c('n95', { keep: false, confidence: 0.95 }), c('w90b', { keep: true, confidence: 0.9 })]);
    assert.equal(g.grouped, true);
    assert.deepEqual(g.wins.map((x) => x.id), ['w90', 'w90b', 'w60']);
    assert.deepEqual(g.unjudged.map((x) => x.id), ['u1', 'u2']);
    assert.deepEqual(g.probablyNot.map((x) => x.id), ['n95', 'n70']);
  });
});

describe('scheduleLine', () => {
  const now = new Date(2026, 9, 18, 14, 0);
  test('off, running and not ready', () => {
    assert.equal(scheduleLine(sched({ background: false, onArrival: false, hold: { code: 'off', until: null } }), null, now), 'It runs only when you press Judge now.');
    assert.equal(scheduleLine(sched({ hold: { code: 'running', until: null } }), null, now), null);
    assert.equal(scheduleLine(sched({ hold: { code: 'not-ready', until: null } }), null, now), null);
  });

  test('what holds it, in plain words', () => {
    const at = (h: number, m: number) => new Date(2026, 9, 18, h, m).toISOString();
    assert.match(scheduleLine(sched({ hold: { code: 'window', until: at(19, 0) } }), { from: '19:00', to: '08:00' }, now)!, /^It judges as new candidates arrive\. Waiting for .*(19:00|7:00).* \(only between 19:00 and 08:00\)\.$/);
    assert.equal(scheduleLine(sched({ hold: { code: 'battery', until: null } }), null, now), 'It judges as new candidates arrive. On battery: it waits until this computer is plugged in.');
    assert.match(scheduleLine(sched({ hold: { code: 'backoff', until: at(14, 20) }, backoff: { until: at(14, 20), failures: 1, error: 'unreachable' } }), null, now)!, /the runner isn’t answering\): backing off until .*(14:20|2:20).*\. Judge now still works\.$/);
    assert.match(scheduleLine(sched({ cloud: true, hold: { code: 'cloud', until: null } }), null, now)!, /not with a cloud model until you tick “also in the background”/);
  });

  test('both triggers, and the next scheduled run', () => {
    const line = scheduleLine(sched({ everyHours: 6, nextRunAt: new Date(2026, 9, 18, 20, 0).toISOString(), hold: { code: 'nothing', until: null } }), null, now)!;
    assert.match(line, /^It judges as new candidates arrive, and every 6 hours\. Next run at .*(20:00|8:00)/);
    assert.match(scheduleLine(sched({ arrivalsWaiting: true }), null, now)!, /New ones are waiting: it starts in a moment\./);
  });
});

describe('words', () => {
  test('counts and why a run stopped', () => {
    assert.equal(countsLine({ win: 3, 'probably-not': 2, failed: 1 }), '3 wins · 2 probably not · 1 failed');
    assert.equal(countsLine({ win: 1 }), '1 win');
    assert.equal(countsLine({}), 'nothing judged');
    assert.equal(errorWords('battery'), 'stopped: this computer went onto battery');
    assert.equal(errorWords('window'), 'stopped: the “only between” window closed');
    assert.equal(errorWords('unreachable'), 'the runner isn’t answering');
    assert.equal(errorWords('something-new'), 'something-new');
  });

  test('Found\'s empty state line about the judge', () => {
    assert.equal(judgeEmptyLine({ kinds: { screenshots: true, github: false }, schedule: sched({ background: false, onArrival: false }) }), 'looks at new screenshots when you press Judge now');
    assert.equal(judgeEmptyLine({ kinds: { screenshots: true, github: true }, schedule: sched({ everyHours: 3 }) }), 'looks at new screenshots and merged PRs as they arrive and every 3 hours');
  });
});
