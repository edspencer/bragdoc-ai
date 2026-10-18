// Grounding checks for AI output (shared/ai/grounding.ts): invented facts are flagged, judge quotes must be verbatim.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isVerbatim, normaliseForMatch, ungrounded } from '../shared/ai/grounding.ts';

test('every number form is a fact, flagged when the source lacks it', () => {
  const src = 'Alex Marlowe fixed the importer.';
  assert.deepEqual(ungrounded('Cut load time by 40% across 1,200 pages.', src), ['40%', '1,200']);
  assert.deepEqual(ungrounded('Handled 1 200 requests in 3.5 seconds.', src), ['1 200', '3.5']);
  assert.deepEqual(ungrounded('Saved $1.2M, €300 and £5k; USD 300 more.', src), ['$1.2M', '€300', '£5k', 'USD 300']);
  assert.deepEqual(ungrounded('Grew from 5k to 1.2M users, worth 3bn.', src), ['5k', '1.2M', '3bn']);
  assert.deepEqual(ungrounded('A 3x speedup, then 10× more.', src), ['3x', '10×']);
  assert.deepEqual(ungrounded('Came 1st in the v2 rollout.', src), ['1st', 'v2']);
  assert.deepEqual(ungrounded('Reached 40 percent and 25 per cent.', src), ['40 percent', '25 per cent']);
});

test('numbers match across forms by value', () => {
  assert.deepEqual(ungrounded('Migrated 1,200 accounts.', 'migrated 1.2k accounts'), []);
  assert.deepEqual(ungrounded('Migrated 1.2k accounts.', 'migrated 1 200 accounts'), []);
  assert.deepEqual(ungrounded('Migrated 1200 accounts.', 'migrated 1,200 accounts'), []);
  assert.deepEqual(ungrounded('Up 40%.', 'up 40 percent'), []);
  assert.deepEqual(ungrounded('Up 40 per cent.', 'up 40%'), []);
  assert.deepEqual(ungrounded('Saved $1.2M.', 'saved $1,200,000 this year'), []);
  assert.deepEqual(ungrounded('Saved $1.2M.', 'saved 1.2 million dollars'), []);
  assert.deepEqual(ungrounded('Saved €1.2M.', 'saved $1.2M'), []); // the value is the fact, not the symbol
  assert.deepEqual(ungrounded('A 3× speedup.', 'a 3x speedup'), []);
});

test('a number only matches the same number, unit and all', () => {
  assert.deepEqual(ungrounded('Up 40%.', 'there were 400 tickets'), ['40%']);
  assert.deepEqual(ungrounded('Up 40%.', '40 tickets closed'), ['40%']); // 40 isn't 40%
  assert.deepEqual(ungrounded('A 3x speedup.', 'took 3 days'), ['3x']);
  assert.deepEqual(ungrounded('Saved $1.3M.', 'saved $1.2M'), ['$1.3M']);
  assert.deepEqual(ungrounded('Closed 12 tickets.', 'closed 120 tickets'), ['12']);
});

test('dates: ISO, month and day, day month year, month year, quarter', () => {
  const src = 'Notes from the sprint.';
  assert.deepEqual(ungrounded('Shipped on 2026-10-17.', src), ['2026-10-17']);
  assert.deepEqual(ungrounded('Shipped Oct 17 and October 20, 2026.', src), ['Oct 17', 'October 20, 2026']);
  assert.deepEqual(ungrounded('Shipped 17 October 2026.', src), ['17 October 2026']);
  assert.deepEqual(ungrounded('Planned for Q3 2026, started March 2026.', src), ['Q3 2026', 'March 2026']);
  assert.deepEqual(ungrounded('Shipped in March.', src), []); // a month alone isn't a date
});

test('dates match across forms', () => {
  assert.deepEqual(ungrounded('Shipped 17 October 2026.', 'deployed 2026-10-17'), []);
  assert.deepEqual(ungrounded('Shipped on 2026-10-17.', 'deployed Oct 17th, 2026'), []);
  assert.deepEqual(ungrounded('Shipped Oct 17.', 'deployed 2026-10-17'), []);
  assert.deepEqual(ungrounded('Shipped in October 2026.', 'deployed 2026-10-17'), []);
  assert.deepEqual(ungrounded('Planned for Q3 2026.', 'roadmap: q3 2026'), []);
  assert.deepEqual(ungrounded('Shipped on 2026-10-18.', 'deployed 2026-10-17'), ['2026-10-18']);
  assert.deepEqual(ungrounded('Shipped Oct 17, 2026.', 'deployed Oct 17'), ['Oct 17, 2026']); // the year was invented
});

test('capitalised multi-word names', () => {
  const src = 'jordan lee and I worked on project atlas in new york.';
  assert.deepEqual(ungrounded('Worked with Jordan Lee on Project Atlas in New York.', src), []);
  assert.deepEqual(ungrounded('Worked with Alex Marlowe on Project Orion.', src), ['Alex Marlowe', 'Project Orion']);
  assert.deepEqual(ungrounded('Jordan Lee said it helped.', 'nothing about people'), ['Jordan Lee']); // sentence start
  assert.deepEqual(ungrounded('Led Project Atlas end to end.', src), []); // a sentence-initial verb isn't the name
  assert.deepEqual(ungrounded('Mentored the Casey team. Atlas shipped.', src), []); // single capitalised words are noise
  assert.deepEqual(ungrounded('Mentored Casey.', src), ['Mentored Casey']); // but two at a sentence start count
  assert.deepEqual(ungrounded('Moved the AWS API Gateway config.', src), ['AWS API Gateway']);
  assert.deepEqual(ungrounded('I Fixed it.', src), []); // "I" never starts a run
  assert.deepEqual(ungrounded("Jordan Lee's review landed.", src), []);
  assert.deepEqual(ungrounded('Thanks, Jordan\nLee.', 'none'), []); // a run doesn't cross lines
});

test('sources can be a list; any of them grounds a fact', () => {
  const sources = ['Alex Marlowe closed 12 tickets.', 'Project Atlas went live on 2026-10-17.'];
  assert.deepEqual(ungrounded('Alex Marlowe closed 12 tickets; Project Atlas went live 17 October 2026.', sources), []);
  assert.deepEqual(ungrounded('Alex Marlowe closed 14 tickets for Project Atlas.', sources), ['14']);
});

test('facts are distinct, in order of first appearance', () => {
  const out = ungrounded('Jordan Lee saved 40%. Then jordan lee saved 40% again, plus $5k and 40% more.', 'none');
  assert.deepEqual(out, ['Jordan Lee', '40%', '$5k']);
});

test('verbatim facts are never flagged, and empty output has no facts', () => {
  assert.deepEqual(ungrounded('Ran v2.1-beta for 7 nights.', 'ran   V2.1-BETA for 7 nights'), []);
  assert.deepEqual(ungrounded('', 'anything'), []);
  assert.deepEqual(ungrounded('Fixed the flaky test.', []), []);
});

test('normaliseForMatch folds typography, whitespace and case', () => {
  assert.equal(normaliseForMatch('  “Smart” quotes — and…\n  impro-\n vement '), '"smart" quotes - and... improvement');
});

test('isVerbatim tolerates whitespace, case, typography and OCR breaks', () => {
  const input = 'Hi team,\n\nThe “new importer” saved us hours — great impro-\nvement, really. It’s well-\nknown now.';
  assert.equal(isVerbatim('The “new importer” saved us hours', input), true); // exact
  assert.equal(isVerbatim('Hi team, The   "new importer"', input), true); // whitespace and newlines
  assert.equal(isVerbatim('the "NEW importer" SAVED us', input), true); // case, straight quotes
  assert.equal(isVerbatim('saved us hours - great improvement', input), true); // dash, OCR hyphenation
  assert.equal(isVerbatim("It's well-known now", input), true); // a real compound split across lines
  assert.equal(isVerbatim('"great improvement, really."', input), true); // wrapping quotes, trailing punctuation
  assert.equal(isVerbatim('importer', input), true); // a fragment
  assert.equal(isVerbatim('saved us days', input), false); // one word changed
  assert.equal(isVerbatim('great improvements', input), false);
  assert.equal(isVerbatim('', input), false);
  assert.equal(isVerbatim(' \n ', input), false);
  assert.equal(isVerbatim('"."', input), false);
});
