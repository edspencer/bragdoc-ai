// Replaying a live eval's recording (D68): the fake model server answers each request that was recorded with what the
// real model said, so a feature's whole pipeline after the model (validation, post-processing, scoring) runs in CI
// on a real model's answers without calling one. A request the recording doesn't have (its prompt changed since)
// gets the fake's own answer, and its case is reported `stale`: re-record it on a machine with the model.
import { adHoc, runEval, type EvalReport, type EvalSpec, type Recording } from '../scripts/eval/lib.ts';
import { replayRules } from './fixtures/fake-llm/replay.ts';
import { startFakeLlm } from './fixtures/fake-llm/server.ts';

export { replayRules };

export interface Replayed {
  report: EvalReport;
  /** Cases whose requests aren't the recorded ones any more (the prompt or the case changed). */
  stale: string[];
  /** Recorded cases the spec doesn't have any more. */
  missing: string[];
}

/** Run `spec`'s recorded cases against the fake model server, answering from `rec`. */
export async function replay<I, A>(spec: EvalSpec<I, A>, rec: Recording): Promise<Replayed> {
  const fake = await startFakeLlm({ rules: replayRules(rec) });
  const a = adHoc('openai-compatible', `${fake.url}/v1`, rec.model, spec.feature);
  try {
    const ids = new Set(rec.cases.map((c) => c.id));
    const report = await runEval({ ...spec, cases: spec.cases.filter((c) => ids.has(c.id)) }, { ai: a.ai, slot: a.slot });
    const asked = new Map(rec.cases.map((c) => [c.id, c.calls.map((x) => x.hash).join(' ')]));
    return {
      report,
      stale: report.recording.cases.filter((c) => asked.get(c.id) !== c.calls.map((x) => x.hash).join(' ')).map((c) => c.id),
      missing: rec.cases.filter((c) => !spec.cases.some((s) => s.id === c.id)).map((c) => c.id),
    };
  } finally {
    a.close();
    await fake.close();
  }
}
