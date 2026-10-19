// Found and the judge's seam (SPEC R21, D56): a verdict is written only to a pending candidate, replaces the old one
// whole, and never changes its status; dismissing clears it (a verdict's quote and why are the screenshot's text),
// and undo brings it back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import YAML from 'yaml';
import { storeHome } from './store-fixture.ts';

const VERDICT = { keep: true, confidence: 0.86, quote: 'Alex fixed the deploy in an hour', why: 'Praise from a teammate for a fix', from: 'Jordan Lee', suggestedProjects: [], by: 'qwen3.5:4b on this computer', at: '2026-10-17T09:00:00Z', inputHash: `sha256:${'a'.repeat(64)}` };

function candidate(h: ReturnType<typeof storeHome>, key = 'screenshot:' + 'b'.repeat(64)) {
  return h.services.found.add({ source: 'screenshots', externalKey: key, title: 'Praise from Jordan', quote: { text: 'Alex fixed the deploy in an hour', from: 'Jordan Lee' }, matchedRules: ['your name'] }).candidate!;
}

test('setVerdict writes the verdict of a pending candidate, and nothing else', () => {
  const h = storeHome();
  try {
    const c = candidate(h);
    const r = h.services.found.setVerdict(c.id, VERDICT);
    assert.equal(r.written, true);
    assert.equal(r.candidate.status, 'pending', 'the judge never keeps or dismisses');
    assert.deepEqual(r.candidate.verdict, VERDICT);
    assert.deepEqual({ ...r.candidate, verdict: null }, { ...c, verdict: null }, 'nothing else changed');
    // a second verdict replaces the first whole: no quote left over from the old one
    const again = h.services.found.setVerdict(c.id, { keep: false, confidence: 0.7, why: 'Sarcastic', suggestedProjects: [], by: 'gemma4:e4b on this computer' });
    assert.deepEqual(again.candidate.verdict, { keep: false, confidence: 0.7, why: 'Sarcastic', suggestedProjects: [], by: 'gemma4:e4b on this computer' });
    assert.deepEqual(Object.keys(YAML.parse(h.read(`found/${c.id}.yaml`)).verdict).sort(), ['by', 'confidence', 'keep', 'suggestedProjects', 'why'], 'on disk too');
    // invalid verdicts are refused
    assert.throws(() => h.services.found.setVerdict(c.id, { keep: true, confidence: 2 } as never));
    assert.throws(() => h.services.found.setVerdict(c.id, { ...VERDICT, inputHash: 'not-a-hash' }));
  } finally {
    h.cleanup();
  }
});

test('setVerdict on a decided candidate writes nothing', async () => {
  const h = storeHome();
  try {
    const c = candidate(h);
    h.services.found.dismiss(c.id);
    const before = h.read(`found/${c.id}.yaml`);
    const r = h.services.found.setVerdict(c.id, VERDICT);
    assert.deepEqual([r.written, r.reason, r.candidate.status], [false, 'decided', 'dismissed']);
    assert.equal(h.read(`found/${c.id}.yaml`), before, 'byte for byte');
    const k = candidate(h, 'screenshot:' + 'c'.repeat(64));
    await h.services.found.keep(k.id);
    assert.equal(h.services.found.setVerdict(k.id, VERDICT).written, false);
    assert.equal(h.services.found.get(k.id).verdict, null);
  } finally {
    h.cleanup();
  }
});

test('dismissing clears the verdict (no quote, no why: only the key hashes), and undo brings it back', () => {
  const h = storeHome();
  try {
    const c = candidate(h);
    h.services.found.setVerdict(c.id, VERDICT);
    const d = h.services.found.dismiss(c.id);
    assert.equal(d.verdict, null);
    const file = h.read(`found/${c.id}.yaml`);
    assert.doesNotMatch(file, /verdict:\s*\n|quote|teammate|Jordan|fixed the deploy/, file);
    assert.match(file, /keyHashes/);
    const u = h.services.found.undo(c.id);
    assert.equal(u.status, 'pending');
    assert.deepEqual(u.verdict, VERDICT);
    // and after a restart the files agree with what the service said
    assert.deepEqual(h.reopen().get('found', c.id)!.verdict, VERDICT);
  } finally {
    h.cleanup();
  }
});

test('a v0.1 candidate (verdict: null) and one with the new fields both load without problems', () => {
  const h = storeHome();
  try {
    const c = candidate(h);
    h.services.found.setVerdict(c.id, { ...VERDICT, impact: 7 });
    const s = h.reopen();
    assert.deepEqual(s.problems(), []);
    assert.equal(s.get('found', c.id)!.verdict!.impact, 7);
  } finally {
    h.cleanup();
  }
});
