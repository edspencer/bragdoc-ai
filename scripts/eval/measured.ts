// What the judge's eval measured on real models (`npm run eval:judge`, D74, D82): one table, read by the two places
// that state it, so they can't drift. test/ai-judge-replay.test.ts asserts that each recorded model's replay scores
// exactly this, and `npm run sync:reference` writes the docs site's table on ai/choosing-a-model from it
// (test/docs.test.ts checks the page is up to date). A row without a recording was a live run only: the page says so.
//
// All of it is the synthetic set (test/fixtures/screenshots/messages.json: 218 chat messages about a made-up
// engineer, 20 of them sarcastic, plus 20 made-up merged PRs). Precision and recall are the judge's own, on the
// messages the screenshot rules let through (70 of 218 on perfect text), which is what it's asked in the app.
// Change a row only with a new eval run, and re-record when you do.

export interface JudgeMeasurement {
  /** The model, as the connection names it. */
  model: string;
  /** In plain words: what ran it, and where. */
  ranOn: string;
  where: 'this-computer' | 'internet';
  /** How the screenshots were read: perfect text (the recordings), or the real OCR. */
  input: 'perfect text' | 'real OCR';
  /** The judge's precision and recall (%) on the messages the rules passed. */
  precision: number;
  recall: number;
  /** Wins kept, of the wins the rules passed (the cases that answered), for a recorded row; null for a live one. */
  wins: [kept: number, of: number] | null;
  /** Sarcastic messages kept as wins, of the set's 20. */
  sarcasmKept: number;
  /** Merged PRs called right (notable or routine), of 20. */
  prsRight: number;
  /** Median seconds per call, as measured live (a replay can't measure time); null when the runner was shared. */
  p50s: number | null;
  /** The recording CI replays (test/fixtures/ai-recordings/judge/), or null for a live run only. */
  recording: string | null;
}

/** The set's sarcastic messages, and how many of them the screenshot rules pass (on perfect text). */
export const SARCASM_TOTAL = 20;
export const SARCASM_PASSED = 17;

export const JUDGE_MEASURED: readonly JudgeMeasurement[] = [
  { model: 'gemma4:e4b', ranOn: 'Ollama, CPU only (a 2020 desktop, no GPU)', where: 'this-computer', input: 'perfect text', precision: 83, recall: 100, wins: [44, 44], sarcasmKept: 8, prsRight: 20, p50s: 10.2, recording: 'gemma4-e4b.json' },
  { model: 'qwen3.5:4b', ranOn: 'Ollama, CPU only (a 2020 desktop, no GPU)', where: 'this-computer', input: 'perfect text', precision: 89, recall: 95, wins: [41, 43], sarcasmKept: 5, prsRight: 20, p50s: null, recording: 'qwen3.5-4b.json' },
  { model: 'typesafe/jev-1.14', ranOn: 'Jev, through OpenRouter', where: 'internet', input: 'perfect text', precision: 100, recall: 100, wins: [44, 44], sarcasmKept: 0, prsRight: 20, p50s: 0.2, recording: 'typesafe-jev-1.14.json' },
  { model: 'anthropic/claude-haiku-5.5', ranOn: 'OpenRouter', where: 'internet', input: 'real OCR', precision: 100, recall: 98, wins: null, sarcasmKept: 0, prsRight: 20, p50s: 1.6, recording: null },
  { model: 'google/gemini-3.5-flash-lite', ranOn: 'OpenRouter', where: 'internet', input: 'real OCR', precision: 95, recall: 100, wins: null, sarcasmKept: 1, prsRight: 20, p50s: 0.8, recording: null },
];

/** A recorded row's scores, in the eval report's own words (what the replay test compares). */
export function reportedScores(m: JudgeMeasurement): Record<string, string> {
  return {
    'judge P / R on passed': `${m.precision}% / ${m.recall}% (${m.wins?.[0]} of ${m.wins?.[1]} wins the rules passed)`,
    'sarcasm kept': `${m.sarcasmKept} of ${SARCASM_TOTAL} (the rules passed ${SARCASM_PASSED})`,
    'PR accuracy': `${Math.round((m.prsRight / 20) * 100)}% (${m.prsRight} of 20)`,
  };
}
