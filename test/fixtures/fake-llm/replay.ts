// The fake's rows for a recorded live eval (D68): a request asked exactly as it was recorded (by hash) gets the
// answer that was recorded. Its own module, so the server can load it without importing test/ai-replay.ts (which
// imports the server).
import { askedHash, type Recording } from '../../../scripts/eval/lib.ts';
import type { AnswerRule } from './answers.ts';

export function replayRules(rec: Recording): AnswerRule[] {
  const byHash = new Map(rec.cases.flatMap((c) => c.calls.map((x) => [x.hash, x.answer] as const)));
  return [{ name: 'replay', when: (r) => byHash.has(askedHash(r.system, r.prompt)), answer: (r) => byHash.get(askedHash(r.system, r.prompt)) }];
}
