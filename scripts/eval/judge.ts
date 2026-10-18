// `npm run eval:judge`: how well the Found judge does on a real model (SPEC R21, R28; D74). Synthetic inputs only:
//
// - **The 218 labelled messages** from the Found spike (test/fixtures/screenshots/messages.json), each drawn as a
//   screenshot of its channel (test/screenshots.ts) → read by the real OCR → the screenshot rules → the judge, exactly
//   as a screenshot in the folder would be. A message the rules drop makes no call (the judge never sees it).
// - **20 synthetic merged PRs** on `altimetry-example/*`: notable or routine.
//
// It reports the pipeline's precision and recall (rules, then judge: what Found would show as "looks like a win"), the
// judge's own on what the rules passed, sarcasm kept, valid answers, latency and PR accuracy. Ambiguous messages are
// left out of precision and recall, as in the spike.
//
//   BRAGDOC_LIVE_AI=1 npm run eval:judge -- --connection ollama@http://127.0.0.1:11434 --model gemma4:e4b
//       [--perfect-text] [--judge-all] [--only messages|prs] [--limit N] [--record]
//
//   --perfect-text  the text a perfect OCR would read, instead of real OCR (fast, and the same on every machine:
//                   recordings are made this way, so the replay tests in CI need no OCR)
//   --judge-all     judge every message, skipping the rules (the judge alone, as the spike's hosted table measured it)
//   --only          just the messages, or just the PRs
//   --instructions <file>  judge by this what-counts.md instead of the starter (try your own; not with --record)
import fs from 'node:fs';
import path from 'node:path';
import { checkAnswer, inputHashOf, type Prepared } from '../../server/ai/judge/index.ts';
import { githubInput, inputBudget, screenshotInput } from '../../server/ai/judge/input.ts';
import { whatCountsStarter } from '../../server/ai/judge/starter.ts';
import { JUDGE_GITHUB_SCHEMA_NAME, JudgeGithubAnswer, judgeGithubPrompt } from '../../server/ai/prompts/judge-github.ts';
import { JUDGE_SCREENSHOT_SCHEMA_NAME, JudgeScreenshotAnswer, judgeScreenshotPrompt } from '../../server/ai/prompts/judge-screenshot.ts';
import { DEFAULT_CONTEXT_TOKENS } from '../../shared/ai/connections.ts';
import { compileRules } from '../../shared/rules/screenshot.ts';
import type { JudgeAnswer } from '../../shared/judge.ts';
import { ALEX, DATASET, datasetShot, png, type DatasetMessage } from '../../test/screenshots.ts';
import { isMain, main, type Cell, type EvalRow, type EvalSpec } from './lib.ts';

/** The made-up person the dataset is about, as profile.yaml would have them. */
export const PROFILE = { ...ALEX, role: 'a senior engineer on the payments and platform teams' };
/** Their projects (the spike's list): the judge answers with these names. */
export const PROJECTS = ['Checkout v2', 'Billing Migration', 'Deploy Pipeline', 'Search Relevance', 'Mobile Offline Sync', 'On-call & Incidents', 'Mentoring', 'Ledger Platform'];
/** The instructions: the starter what-counts.md BragDoc writes from that profile (what a new user would have). */
export const INSTRUCTIONS = whatCountsStarter(PROFILE);
const PROJECT_IDS = new Map(PROJECTS.map((p, i) => [p.toLowerCase(), `01JPROJECT000000000000000${i}`]));

/** 20 merged PRs, on made-up `altimetry-example` repos: ten notable, ten routine. */
export const PRS: { id: string; repo: string; title: string; body: string; notable: boolean }[] = [
  { id: 'pr01', repo: 'altimetry-example/ledger', title: 'Batch ledger writes: one round trip per 50 rows', body: 'Writes to the ledger now go in batches of 50. p95 for settlement drops from 840 ms to 120 ms in staging.', notable: true },
  { id: 'pr02', repo: 'altimetry-example/ledger', title: 'Bump zod from 4.1.3 to 4.1.5', body: 'Bumps zod. Release notes: bug fixes.', notable: false },
  { id: 'pr03', repo: 'altimetry-example/checkout', title: 'Checkout v2: saved cards and one-click pay', body: 'Ships saved cards behind the checkout-v2 flag, with tokenised storage and the new one-click button. Rolled out to 10% of customers.', notable: true },
  { id: 'pr04', repo: 'altimetry-example/checkout', title: 'Fix typo in the refund email', body: 'Recieve → receive.', notable: false },
  { id: 'pr05', repo: 'altimetry-example/deploy-tools', title: 'Blue/green deploys for the payments API', body: 'Adds blue/green deploys with automatic rollback on a failed health check. No more maintenance window for payments releases.', notable: true },
  { id: 'pr06', repo: 'altimetry-example/deploy-tools', title: 'Revert "Speed up the image build"', body: 'This reverts commit 4f2a9c1: it broke ARM builds.', notable: false },
  { id: 'pr07', repo: 'altimetry-example/search', title: 'Search relevance: boost exact merchant-name matches', body: 'Exact merchant-name matches now rank first. In the offline eval, click-through on the first result goes from 41% to 58%.', notable: true },
  { id: 'pr08', repo: 'altimetry-example/search', title: 'chore: update the lockfile', body: 'npm install, nothing else.', notable: false },
  { id: 'pr09', repo: 'altimetry-example/mobile', title: 'Offline sync: queue payments while offline and replay them in order', body: 'Payments made offline are queued on the device and replayed in order when the connection comes back, with idempotency keys so nothing is charged twice.', notable: true },
  { id: 'pr10', repo: 'altimetry-example/mobile', title: 'Bump the app version to 4.12.1', body: 'Version bump for the release.', notable: false },
  { id: 'pr11', repo: 'altimetry-example/billing', title: 'Migrate every customer to the new billing engine', body: 'The last 30% of accounts move to the new billing engine. The old one is switched off; this removes 12,000 lines and a nightly batch job.', notable: true },
  { id: 'pr12', repo: 'altimetry-example/billing', title: 'Format the billing module with the new prettier config', body: 'Formatting only. No behaviour change.', notable: false },
  { id: 'pr13', repo: 'altimetry-example/ledger', title: 'Fix double-counted refunds in the monthly ledger report', body: 'Refunds issued on the last day of the month were counted twice. Finance found a $48k discrepancy; this fixes the report and backfills the last six months.', notable: true },
  { id: 'pr14', repo: 'altimetry-example/ledger', title: 'Rename LedgerWriter to LedgerSink', body: 'A rename for consistency with the other sinks.', notable: false },
  { id: 'pr15', repo: 'altimetry-example/oncall', title: 'Runbook automation: page the right team from the alert itself', body: 'Alerts now carry their owning team and page it directly. Mean time to acknowledge drops from 14 minutes to 3 in the last month of incidents.', notable: true },
  { id: 'pr16', repo: 'altimetry-example/oncall', title: 'Update the on-call rota for November', body: 'Swaps two shifts.', notable: false },
  { id: 'pr17', repo: 'altimetry-example/platform', title: 'Shared rate limiter for every public API', body: 'One rate limiter, adopted by the payments, search and accounts teams, replacing three home-grown ones. Documented in the platform handbook.', notable: true },
  { id: 'pr18', repo: 'altimetry-example/platform', title: 'Bump actions/checkout from v4 to v5', body: 'Dependabot.', notable: false },
  { id: 'pr19', repo: 'altimetry-example/mentoring', title: 'Onboarding guide: your first week on payments', body: 'A step-by-step guide for new starters, written with the last three hires. Each of them shipped a change in their first week.', notable: true },
  { id: 'pr20', repo: 'altimetry-example/platform', title: 'WIP: try a different logger', body: 'Experiment, not for review yet.', notable: false },
];

type Input = { kind: 'message'; m: DatasetMessage } | { kind: 'pr'; pr: (typeof PRS)[number] };

export interface Answer {
  /** Passed the rules (always true for a PR, or with --judge-all). */
  rules: boolean;
  /** Asked the model. */
  judged: boolean;
  keep: boolean;
  /** The model gave a quote, and it was verbatim (kept). */
  quote: 'kept' | 'dropped' | 'none';
  impact?: number;
}

export interface JudgeEvalOptions {
  perfectText: boolean;
  judgeAll: boolean;
  only?: 'messages' | 'prs';
  /** Instead of the starter what-counts.md. */
  instructions?: string;
}

/** Build the spec for these options. Exported for the replay tests (perfect text: the recordings' mode). */
export function judgeSpec({ perfectText, judgeAll, only, instructions = INSTRUCTIONS }: JudgeEvalOptions): EvalSpec<Input, Answer> & { close(): Promise<void> } {
  const INSTRUCTIONS = instructions;
  const rules = compileRules(PROFILE);
  let ocr: { read(i: { bytes: Uint8Array }): Promise<{ text: string }> } | null = null;
  const textOf = async (m: DatasetMessage): Promise<string> => {
    const shot = datasetShot(m);
    if (perfectText) return shot.text;
    ocr ??= (await import('../../server/ocr/index.ts')).createOcr();
    return (await ocr.read({ bytes: png(shot.svg) })).text;
  };
  const cases = [
    ...(only === 'prs' ? [] : DATASET.messages.map((m) => ({ id: m.id, input: { kind: 'message' as const, m } }))),
    ...(only === 'messages' ? [] : PRS.map((pr) => ({ id: pr.id, input: { kind: 'pr' as const, pr } }))),
  ];
  return {
    name: 'judge',
    feature: 'judge',
    description: `The Found judge on the spike's 218 labelled messages (drawn, ${perfectText ? 'perfect text' : 'read by OCR'}, ${judgeAll ? 'every one judged' : 'then the rules'}) and 20 synthetic PRs.`,
    cases,
    async run(c, ask) {
      if (c.input.kind === 'pr') {
        const { pr } = c.input;
        const input = githubInput({ repo: pr.repo, title: pr.title, body: pr.body, mergedAt: '2026-10-14' });
        const { system, prompt } = judgeGithubPrompt({ profile: PROFILE, projects: PROJECTS, instructions: INSTRUCTIONS, input: input.text });
        const a = await ask.object({ system, prompt, schema: JudgeGithubAnswer, schemaName: JUDGE_GITHUB_SCHEMA_NAME, maxOutputTokens: 400 });
        const v = checkAnswer({ ...a, quote: '', from: '' }, { kind: 'github', input, inputHash: inputHashOf('github', input.text, INSTRUCTIONS), projects: PROJECT_IDS });
        return { rules: true, judged: true, keep: v.keep, quote: 'none', ...(v.impact !== undefined ? { impact: v.impact } : {}) };
      }
      const { m } = c.input;
      const text = await textOf(m);
      const r = rules(text);
      if (!r.pass && !judgeAll) return { rules: false, judged: false, keep: false, quote: 'none' };
      const quote = r.pass && r.quote ? { text: r.quote, ...(r.from ? { from: r.from } : {}), ...(r.where ? { where: r.where } : {}) } : { text: datasetShot(m).text.split('\n').at(-1)! };
      const systemChars = judgeScreenshotPrompt({ profile: PROFILE, projects: PROJECTS, instructions: INSTRUCTIONS, input: '' }).system.length;
      const input = screenshotInput({ ocrText: text, quote, profile: PROFILE, maxChars: inputBudget({ contextTokens: DEFAULT_CONTEXT_TOKENS, systemChars }) ?? 0 });
      const { system, prompt } = judgeScreenshotPrompt({ profile: PROFILE, projects: PROJECTS, instructions: INSTRUCTIONS, input: input.text });
      const a = await ask.object({ system, prompt, schema: JudgeScreenshotAnswer, schemaName: JUDGE_SCREENSHOT_SCHEMA_NAME, maxOutputTokens: 400 });
      const p: Pick<Prepared, 'kind' | 'input' | 'inputHash' | 'projects'> = { kind: 'screenshots', input, inputHash: inputHashOf('screenshots', input.text, INSTRUCTIONS), projects: PROJECT_IDS };
      const v = checkAnswer(a as JudgeAnswer, p);
      return { rules: r.pass, judged: true, keep: v.keep, quote: !a.keep || !a.quote.trim() ? 'none' : v.quote ? 'kept' : 'dropped' };
    },
    score(c, a) {
      if (c.input.kind === 'pr') return { pass: a.keep === c.input.pr.notable, cells: { label: c.input.pr.notable ? 'notable' : 'routine', rules: '–', judge: a.keep ? 'keep' : 'drop', impact: a.impact ?? null } };
      const { m } = c.input;
      const cells: Record<string, Cell> = { label: m.label, rules: a.rules ? 'pass' : 'drop', judge: a.judged ? (a.keep ? 'keep' : 'drop') : '–', quote: a.quote };
      // ambiguous ones aren't scored (the spike's "null"): they pass whatever happens
      return { pass: m.keep === null ? true : a.keep === m.keep, cells };
    },
    summarise: (rows) => summariseJudge(rows),
    // the OCR worker thread, if it was started
    close: async () => {
      await (ocr as { close?: () => Promise<void> } | null)?.close?.();
    },
  };
}

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '–');

/** The numbers under the table: from the rows' cells, so a replay gives the same summary as the live run. */
export function summariseJudge(rows: EvalRow[]): Record<string, Cell> {
  const msgs = rows.filter((r) => !String(r.id).startsWith('pr'));
  const prs = rows.filter((r) => String(r.id).startsWith('pr'));
  const scored = msgs.filter((r) => r.cells.label !== 'ambiguous');
  const win = (r: EvalRow) => r.cells.label === 'win_alex';
  const kept = (r: EvalRow) => r.cells.judge === 'keep';
  // the pipeline keeps what the rules passed AND the judge kept (with --judge-all the judge also saw the rest)
  const shown = (r: EvalRow) => r.cells.rules === 'pass' && kept(r);
  const tp = scored.filter((r) => win(r) && shown(r)).length;
  const fp = scored.filter((r) => !win(r) && shown(r)).length;
  const all = scored.filter((r) => r.cells.judge !== '–');
  const atp = all.filter((r) => win(r) && kept(r)).length;
  const afp = all.filter((r) => !win(r) && kept(r)).length;
  const wins = scored.filter(win).length;
  // the judge on what the rules let through (what it's actually asked)
  const passed = scored.filter((r) => r.cells.rules === 'pass');
  const ptp = passed.filter((r) => win(r) && kept(r)).length;
  const pfp = passed.filter((r) => !win(r) && kept(r)).length;
  const pwins = passed.filter(win).length;
  const judged = msgs.filter((r) => r.cells.judge !== '–' || r.error);
  // latency over the calls only: a message the rules dropped takes no time, and would drag p50 to zero
  const asked = [...judged, ...prs];
  const ms = asked.filter((r) => !r.error).map((r) => r.ms).sort((a, b) => a - b);
  const q = (f: number) => (ms.length ? `${(ms[Math.min(ms.length - 1, Math.floor(f * ms.length))]! / 1000).toFixed(1)} s` : '–');
  const quotes = msgs.filter((r) => r.cells.quote === 'kept' || r.cells.quote === 'dropped');
  const sarcasm = msgs.filter((r) => r.cells.label === 'sarcasm');
  return {
    ...(msgs.length
      ? {
          'messages judged': `${judged.length} of ${msgs.length} (the rules passed ${msgs.filter((r) => r.cells.rules === 'pass').length})`,
          'pipeline P / R': `${pct(tp, tp + fp)} / ${pct(tp, wins)} (${tp} of ${wins} wins kept, ${fp} false keeps)`,
          ...(scored.some((r) => r.cells.rules === 'drop' && r.cells.judge !== '–') ? { 'judge alone P / R': `${pct(atp, atp + afp)} / ${pct(atp, all.filter(win).length)} (every message judged, rules ignored)` } : {}),
          'judge P / R on passed': `${pct(ptp, ptp + pfp)} / ${pct(ptp, pwins)} (${ptp} of ${pwins} wins the rules passed)`,
          'sarcasm kept': `${sarcasm.filter(shown).length} of ${sarcasm.length} (the rules passed ${sarcasm.filter((r) => r.cells.rules === 'pass').length}${scored.some((r) => r.cells.rules === 'drop' && r.cells.judge !== '–') ? `; the judge alone kept ${sarcasm.filter(kept).length}` : ''})`,
          'valid answers': `${asked.filter((r) => !r.error).length} of ${asked.length}${asked.some((r) => r.repaired) ? ` (${asked.filter((r) => r.repaired).length} after a repair)` : ''}`,
          'p50 / p90': `${q(0.5)} / ${q(0.9)} per call`,
          'quotes verbatim': `${quotes.filter((r) => r.cells.quote === 'kept').length} of ${quotes.length}`,
        }
      : {}),
    ...(prs.length ? { 'PR accuracy': `${pct(prs.filter((r) => r.pass).length, prs.length)} (${prs.filter((r) => r.pass).length} of ${prs.length})` } : {}),
  };
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  const take = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? (argv.splice(i, 1), true) : false;
  };
  const value = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv.splice(i, 2)[1] : undefined;
  };
  const perfectText = take('--perfect-text');
  const judgeAll = take('--judge-all');
  const only = value('--only');
  const instructionsFile = value('--instructions');
  if (only !== undefined && only !== 'messages' && only !== 'prs') {
    process.stderr.write('--only is messages or prs\n');
    process.exitCode = 2;
  } else if (argv.includes('--record') && (!perfectText || judgeAll || only || instructionsFile)) {
    // recordings are replayed in CI, where there's no OCR: only the perfect-text pipeline over every case is recorded
    process.stderr.write(`--record needs --perfect-text, and no --judge-all, --only or --instructions (${path.basename(import.meta.url)})\n`);
    process.exitCode = 2;
  } else {
    const spec = judgeSpec({ perfectText, judgeAll, ...(only ? { only: only as 'messages' | 'prs' } : {}), ...(instructionsFile ? { instructions: fs.readFileSync(instructionsFile, 'utf8') } : {}) });
    process.exitCode = await main(spec, argv);
    await spec.close();
  }
}
