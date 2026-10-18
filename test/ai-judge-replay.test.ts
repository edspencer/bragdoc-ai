// The judge's eval, replayed (D68, D74, D82): the answers two real local models gave on the dev box (`npm run eval:judge
// -- --perfect-text --record`), and Jev's through OpenRouter (`… --jev`), served back by the fake model server, so CI runs the whole judge pipeline after the
// model (the input, the prompt, the checks, the scoring) on real answers without calling a model. A prompt, schema or
// case that changed makes a case stale: re-record it on a machine with the model, never by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { formatReport, readRecording, RECORDINGS } from '../scripts/eval/lib.ts';
import { judgeSpec } from '../scripts/eval/judge.ts';
import { replay } from './ai-replay.ts';

/** What each model scored live on the box: a replay must score the same. */
const EXPECTED: Record<string, Record<string, string>> = {
  'gemma4-e4b.json': {
    'judge P / R on passed': '83% / 100% (44 of 44 wins the rules passed)',
    'sarcasm kept': '8 of 20 (the rules passed 17)',
    'PR accuracy': '100% (20 of 20)',
  },
  // Jev (D82), through a Jev connection: the fake's /systemone answers from the recording. One sarcastic message came
  // back at P(win) 0.54 when recorded (a borderline call; it dropped in a run without the rules)
  'typesafe-jev-1.14.json': {
    'judge P / R on passed': '98% / 100% (44 of 44 wins the rules passed)',
    'sarcasm kept': '1 of 20 (the rules passed 17)',
    'PR accuracy': '100% (20 of 20)',
  },
  'qwen3.5-4b.json': {
    'judge P / R on passed': '89% / 95% (41 of 43 wins the rules passed)',
    'sarcasm kept': '5 of 20 (the rules passed 17)',
    'PR accuracy': '100% (20 of 20)',
  },
};

test('the judge recordings from real models replay: nothing stale, the same scores as live', async () => {
  const dir = path.join(RECORDINGS, 'judge');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
  assert.deepEqual(files, ['gemma4-e4b.json', 'qwen3.5-4b.json', 'typesafe-jev-1.14.json'], 'a recording from each recommended model, and Jev');
  for (const f of files) {
    const rec = readRecording(path.join(dir, f));
    const jev = f.startsWith('typesafe-jev');
    assert.equal(rec.where, jev ? 'internet' : 'this-computer', f);
    const spec = judgeSpec({ perfectText: true, judgeAll: false, jev });
    const r = await replay(spec, rec, jev ? 'jev' : 'openai-compatible');
    await spec.close();
    assert.deepEqual([r.stale, r.missing], [[], []], `${f}: re-record it (the prompt, the schema or the cases changed)`);
    // a case that failed when it was recorded (a timeout on a shared CPU) is skipped, and there are few
    assert.ok(r.unanswered.length <= 3, `${f}: ${r.unanswered.length} unanswered`);
    assert.ok(r.report.rows.every((x) => x.error === null), `${f}:\n${formatReport(r.report)}`);
    for (const [k, v] of Object.entries(EXPECTED[f] ?? {})) assert.equal(r.report.summary[k], v, `${f}: ${k}`);
  }
});
