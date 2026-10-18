// The index at scale: 5,000 achievements boot in under 2 s and search in under 50 ms (PLAN PR3 acceptance; CI runners
// are slower than laptops, so these are the budgets, not the expected times).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ulid } from '../shared/ulid.ts';
import { relPathFor } from '../server/store/files.ts';
import { Store } from '../server/store/index.ts';
import { rmTmp, tmpDir } from './fixture.ts';

const N = 5000;
const WORDS = ['migration', 'latency', 'onboarding', 'pipeline', 'dashboard', 'incident', 'refactor', 'billing', 'search', 'mentoring', 'release', 'outage'];
let root: string;
let home: string;
const projects = Array.from({ length: 20 }, () => ulid());

before(() => {
  root = tmpDir('bragdoc-perf-');
  home = path.join(root, '.bragdoc');
  const start = Date.parse('2022-01-01T00:00:00Z');
  for (let i = 0; i < N; i++) {
    const id = ulid(start + i * 3600_000 * 7);
    const w = (k: number) => WORDS[(i * 7 + k) % WORDS.length];
    const p = path.join(home, relPathFor('achievement', id));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(
      p,
      `---\nschemaVersion: 1\nid: ${id}\ntitle: Improved ${w(0)} for the ${w(1)} team (${i})\nsummary: Worked on ${w(2)} and ${w(3)}.\nhappenedAt: 2024-${String((i % 12) + 1).padStart(2, '0')}-15\nimpact: ${(i % 10) + 1}\nprojects: [${projects[i % 20]}]\nevidence:\n  - id: ${ulid()}\n    kind: quote\n    quote:\n      text: Thanks for the ${w(4)} work\n      from: Sam\ncreatedAt: 2024-01-01T00:00:00Z\nupdatedAt: 2024-01-01T00:00:00Z\n---\nA paragraph about ${w(5)}, ${w(6)} and number ${i}.\n`,
    );
  }
});
after(() => rmTmp(root));

let store: Store;

test(`boot: ${N} achievements load in under 2 s`, () => {
  const t0 = performance.now();
  store = new Store(home).load();
  const ms = performance.now() - t0;
  assert.equal(store.all('achievement').length, N);
  assert.ok(ms < 2000, `boot took ${ms.toFixed(0)} ms`);
  console.log(`# boot ${ms.toFixed(0)} ms`);
});

test('search: under 50 ms', () => {
  store.search('warmup');
  for (const q of ['migration', 'latency dashboard', 'mentor', 'number 4321', 'Sam incident']) {
    // the best of three: the budget is the index's speed, and one GC pause or a busy shared CI runner isn't that
    let r: ReturnType<typeof store.search> = [];
    let ms = Infinity;
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      r = store.search(q);
      ms = Math.min(ms, performance.now() - t0);
    }
    assert.ok(r.length > 0, q);
    assert.ok(ms < 50, `search "${q}" took ${ms.toFixed(1)} ms`);
  }
  assert.equal(store.achievementIdsIn('project', projects[0]).size, N / 20);
});
