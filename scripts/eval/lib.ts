// The live-eval harness (SPEC R28, D68): how well a feature's prompt does on a real model, on synthetic inputs only.
// A feature's eval is a spec (its cases, how to ask, how to score) run by `npm run eval:<name> -- …`; this file is
// everything else:
//
//   BRAGDOC_LIVE_AI=1 npm run eval:smoke -- --connection <id | kind@url> --model <m> [--limit N] [--record]
//                                          [--data-dir <home>]
//
// - **It refuses** without BRAGDOC_LIVE_AI=1, and whenever CI is set: CI never calls a real model. Tests run the same
//   core (runEval) against the fake model server, and replay recordings through it (test/ai-replay.ts).
// - **Every call goes through ctx.ai** (createAi: the gates, the queue, egress), so it's logged, gated and refused
//   exactly as the app's own calls are.
//   - `--connection <id>`: a connection in the data home's config.yaml (`--data-dir`, else $BRAGDOC_HOME, else
//     ~/.bragdoc), with its key and consent. Its master switch is read live, so turning AI off mid-eval stops the
//     eval. Only the feature's own switch is taken as on: running an eval is the opt-in. The calls are in that home's
//     Network activity and AI activity (one run, trigger `eval`).
//   - `--connection kind@url` (`ollama@http://127.0.0.1:11434`): a connection made up for this run, on this computer
//     or your network only (a cloud one needs consent: add it in Settings first). Its logs go to a temp folder,
//     removed afterwards.
// - **A run-level failure stops it** (the runner is down, the model isn't installed, AI was turned off, the key was
//   refused): the table so far, the reason, exit 1, and no recording. An item-level one (an answer that isn't valid
//   even after the repair, a timeout) is that item's row, and the eval goes on.
// - **`--record`** writes each answer to test/fixtures/ai-recordings/<eval>/<model>.json, keyed by a hash of exactly
//   what was asked, for replay tests. A recording holds the model's name, where it ran (`this-computer`) and the
//   answers: never a key, a host or an address (checked before it's written).
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { z } from 'zod';
import type { AiWhere } from '../../shared/api.ts';
import { AI_KINDS, baseUrlOf, type AiCallFeature, type AiKind } from '../../shared/ai/connections.ts';
import { hostClass } from '../../shared/ai/hosts.ts';
import { AiActivity, type ActivityRun } from '../../server/ai/activity.ts';
import { AiError, createAi, type Ai } from '../../server/ai/run.ts';
import type { Slot } from '../../server/ai/policy.ts';
import { ConfigSchema, ConfigStore, type Config } from '../../server/config.ts';
import { Egress } from '../../server/egress.ts';
import { resolveDataDir } from '../../server/paths.ts';
import { Secrets } from '../../server/secrets.ts';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const RECORDINGS = path.join(ROOT, 'test/fixtures/ai-recordings');

export type Cell = string | number | boolean | null;

export interface EvalCase<I> {
  /** Stable: a recording's answers are matched to cases by id and by what was asked. */
  id: string;
  input: I;
}

/** How a spec asks the model: ctx.ai with the eval's slot, run, signal and purpose filled in. */
export interface Ask {
  object<T>(call: { system: string; prompt: string; schema: z.ZodType<T>; schemaName?: string; maxOutputTokens?: number; timeoutMs?: number }): Promise<T>;
  text(call: { system: string; prompt: string; maxOutputTokens?: number; timeoutMs?: number }): Promise<string>;
}

export interface EvalSpec<I, A> {
  /** `npm run eval:<name>`, and the recordings' folder. */
  name: string;
  /** What the calls are gated and logged as. */
  feature: AiCallFeature;
  /** One line, for --help. */
  description: string;
  /** Synthetic inputs only (D68). */
  cases: EvalCase<I>[];
  /** Ask about one case (one or more calls through `ask`) and return the answer to score. */
  run(c: EvalCase<I>, ask: Ask): Promise<A>;
  /** Did it get this one right, and anything else worth a column. */
  score(c: EvalCase<I>, answer: A): { pass: boolean; cells?: Record<string, Cell> };
  /** Lines under the table, from every row (precision, recall…). */
  summarise?(rows: EvalRow[]): Record<string, Cell>;
}

export interface EvalRow {
  id: string;
  /** null when the case failed before it could be scored. */
  pass: boolean | null;
  /** The AiError code, when a call failed. */
  error: string | null;
  ms: number;
  tokensIn: number | null;
  tokensOut: number | null;
  repaired: boolean;
  cells: Record<string, Cell>;
}

export interface RecordedCall {
  /** `sha256:` of the system prompt and the prompt: what was asked, exactly. */
  hash: string;
  /** The validated object, or the text. */
  answer: unknown;
  ms: number;
  tokensIn: number | null;
  tokensOut: number | null;
}

export interface Recording {
  format: 1;
  eval: string;
  feature: AiCallFeature;
  model: string;
  where: AiWhere;
  recordedAt: string;
  cases: { id: string; calls: RecordedCall[] }[];
}

export interface EvalReport {
  name: string;
  model: string;
  where: AiWhere | null;
  rows: EvalRow[];
  /** Why it stopped early, or null when every case ran. */
  stopped: { code: string; message: string } | null;
  summary: Record<string, Cell>;
  recording: Recording;
}

/** These end the eval: nothing after them could go differently. Anything else is one item's failure. */
const FATAL = new Set(['ai_off', 'no_model', 'not_consented', 'no_key', 'unreachable', 'model_missing', 'key_refused', 'quota', 'rate_limited', 'cancelled', 'busy']);

export const askedHash = (system: string, prompt: string) => `sha256:${crypto.createHash('sha256').update(system).update('\0').update(prompt).digest('hex')}`;

/** Why the harness won't run here, or null. */
export function refusal(env: NodeJS.ProcessEnv): string | null {
  if (env.CI) return 'refusing to call a real model with CI set: CI uses the fake model server and recordings (npm test)';
  if (env.BRAGDOC_LIVE_AI !== '1') return 'a live eval calls a real model: set BRAGDOC_LIVE_AI=1 to say you mean it';
  return null;
}

export interface RunOptions {
  ai: Ai;
  slot: Slot;
  /** The eval is one run in the AI activity log. */
  activity?: AiActivity;
  limit?: number;
  signal?: AbortSignal;
  /** Each row as it finishes (progress). */
  onRow?: (row: EvalRow, i: number, n: number) => void;
  now?: () => number;
}

/** Run a spec's cases, one at a time. Never throws for a model's failure: it's in the report. */
export async function runEval<I, A>(spec: EvalSpec<I, A>, { ai, slot, activity, limit, signal, onRow, now = Date.now }: RunOptions): Promise<EvalReport> {
  const cases = spec.cases.slice(0, limit ?? spec.cases.length);
  const run: ActivityRun | null = activity ? activity.start({ feature: spec.feature, trigger: 'eval' }) : null;
  const rows: EvalRow[] = [];
  const recorded: Recording['cases'] = [];
  let where: AiWhere | null = null;
  let stopped: EvalReport['stopped'] = null;
  try {
    for (const [i, c] of cases.entries()) {
      if (signal?.aborted) {
        stopped = { code: 'cancelled', message: 'stopped (Ctrl-C)' };
        break;
      }
      const calls: RecordedCall[] = [];
      const row: EvalRow = { id: c.id, pass: null, error: null, ms: 0, tokensIn: null, tokensOut: null, repaired: false, cells: {} };
      const base = { feature: spec.feature, purpose: `ai.eval.${spec.name}`, slot, priority: 'now' as const, ...(run ? { runId: run.id } : {}), ...(signal ? { signal } : {}) };
      const note = (info: { ms: number; tokensIn: number | null; tokensOut: number | null; where: AiWhere }) => {
        where ??= info.where;
        row.ms += info.ms;
        if (info.tokensIn !== null) row.tokensIn = (row.tokensIn ?? 0) + info.tokensIn;
        if (info.tokensOut !== null) row.tokensOut = (row.tokensOut ?? 0) + info.tokensOut;
      };
      const ask: Ask = {
        async object({ system, prompt, schema, schemaName, maxOutputTokens, timeoutMs }) {
          const r = await ai.object({ ...base, system, prompt, schema, ...(schemaName ? { schemaName } : {}), ...(maxOutputTokens ? { maxOutputTokens } : {}), ...(timeoutMs ? { timeoutMs } : {}) });
          note(r);
          row.repaired ||= r.repaired;
          calls.push({ hash: askedHash(system, prompt), answer: r.object, ms: r.ms, tokensIn: r.tokensIn, tokensOut: r.tokensOut });
          return r.object;
        },
        async text({ system, prompt, maxOutputTokens, timeoutMs }) {
          const s = await ai.stream({ ...base, system, prompt, ...(maxOutputTokens ? { maxOutputTokens } : {}), ...(timeoutMs ? { timeoutMs } : {}) });
          for await (const _ of s.textStream) {
            /* the whole text comes with done */
          }
          const r = await s.done;
          note(r);
          calls.push({ hash: askedHash(system, prompt), answer: r.text, ms: r.ms, tokensIn: r.tokensIn, tokensOut: r.tokensOut });
          return r.text;
        },
      };
      const t0 = now();
      try {
        const answer = await spec.run(c, ask);
        const s = spec.score(c, answer);
        row.pass = s.pass;
        row.cells = s.cells ?? {};
        run?.count(s.pass ? 'pass' : 'fail');
      } catch (e) {
        if (!(e instanceof AiError)) throw e;
        row.error = e.code;
        row.ms ||= now() - t0;
        if (FATAL.has(e.code)) stopped = { code: e.code, message: e.message };
        else run?.count('error');
      }
      rows.push(row);
      recorded.push({ id: c.id, calls });
      onRow?.(row, i, cases.length);
      if (stopped) break;
    }
  } finally {
    run?.end(stopped ? { error: stopped.code, cancelled: stopped.code === 'cancelled' || stopped.code === 'ai_off' } : {});
  }
  return {
    name: spec.name,
    model: slot.model,
    where,
    rows,
    stopped,
    summary: { ...summarise(rows, cases.length), ...(spec.summarise?.(rows) ?? {}) },
    recording: { format: 1, eval: spec.name, feature: spec.feature, model: slot.model, where: where ?? 'this-computer', recordedAt: new Date(now()).toISOString(), cases: recorded },
  };
}

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '–');
const quantile = (xs: number[], q: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
};

function summarise(rows: EvalRow[], planned: number): Record<string, Cell> {
  // answered: a valid answer came back and was scored (a row that failed, for whatever reason, didn't)
  const answered = rows.filter((r) => r.pass !== null);
  const ms = answered.map((r) => r.ms);
  const sum = (k: 'tokensIn' | 'tokensOut') => (rows.some((r) => r[k] !== null) ? rows.reduce((a, r) => a + (r[k] ?? 0), 0) : null);
  return {
    cases: `${rows.length} of ${planned}`,
    passed: `${answered.filter((r) => r.pass).length} (${pct(answered.filter((r) => r.pass).length, rows.length)})`,
    'failed calls': rows.filter((r) => r.error).length,
    'valid answers': `${answered.length} of ${rows.length}${rows.some((r) => r.repaired) ? ` (${rows.filter((r) => r.repaired).length} after a repair)` : ''}`,
    'p50 / p90': ms.length ? `${(quantile(ms, 0.5)! / 1000).toFixed(1)} s / ${(quantile(ms, 0.9)! / 1000).toFixed(1)} s` : '–',
    tokens: sum('tokensIn') !== null ? `${sum('tokensIn')} in, ${sum('tokensOut') ?? '?'} out` : 'not reported',
  };
}

/** The report as a plain-text table, then its summary. */
export function formatReport(r: EvalReport): string {
  const keys = [...new Set(r.rows.flatMap((x) => Object.keys(x.cells)))];
  const head = ['case', 'pass', 's', ...keys, 'error'];
  const show = (v: Cell) => (v === null ? '–' : v === true ? 'yes' : v === false ? 'no' : String(v));
  const body = r.rows.map((x) => [x.id, x.pass === null ? '–' : x.pass ? 'yes' : 'NO', (x.ms / 1000).toFixed(1), ...keys.map((k) => show(x.cells[k] ?? null)), x.error ?? '']);
  const width = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i]!.length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(width[i]!)).join('  ').trimEnd();
  const out = [line(head), line(width.map((w) => '-'.repeat(w))), ...body.map(line), ''];
  for (const [k, v] of Object.entries(r.summary)) out.push(`${k.padEnd(14)} ${show(v)}`);
  if (r.stopped) out.push('', `stopped early: ${r.stopped.code}: ${r.stopped.message}`);
  return out.join('\n') + '\n';
}

/** `qwen3.5:4b` → `qwen3.5-4b`: a file name anywhere. */
export const modelSlug = (model: string) => model.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'model';

export const recordingPath = (name: string, model: string, root = RECORDINGS) => path.join(root, name, `${modelSlug(model)}.json`);

/** Write a recording, after checking it holds nothing it mustn't (`forbidden`: the connection's host, its key). */
export function writeRecording(rec: Recording, forbidden: string[], root = RECORDINGS): string {
  const text = JSON.stringify(rec, null, 2) + '\n';
  for (const f of forbidden) if (f && f.length >= 4 && text.includes(f)) throw new Error(`not writing the recording: it contains ${f.length > 12 ? 'a secret' : JSON.stringify(f)} (an answer echoed it?)`);
  if (/https?:\/\/(?:127\.|localhost|10\.|192\.168\.)/.test(text)) throw new Error('not writing the recording: it contains a local address');
  const file = recordingPath(rec.eval, rec.model, root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

export function readRecording(file: string): Recording {
  const r = JSON.parse(fs.readFileSync(file, 'utf8')) as Recording;
  if (r.format !== 1 || !Array.isArray(r.cases)) throw new Error(`${file} isn't a recording (format 1)`);
  return r;
}

/** A connection made up for one run (`kind@url`, this computer or your network only), with its own temp home. */
export function adHoc(kind: AiKind, baseUrl: string, model: string, feature: AiCallFeature): { ai: Ai; slot: Slot; activity: AiActivity; dataDir: string; host: string; close: () => void } {
  const where = hostClass(baseUrl);
  if (where === 'internet') throw new Error(`${new URL(baseUrl).host} is on the internet: a cloud connection needs consent. Add it in Settings → AI, accept its statement, and use its id`);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-eval-'));
  const features = feature === 'judge' || feature === 'tidy' || feature === 'draft' ? { [feature]: { enabled: true } } : {};
  const config: Config = ConfigSchema.parse({ ai: { enabled: true, connections: { eval: { kind, baseUrl } }, features } });
  const egress = new Egress({ dataDir, config: () => config });
  const ai = createAi({ config: () => config, egress, secrets: new Secrets(dataDir) });
  const activity = new AiActivity({ dataDir });
  activity.listen(ai);
  return { ai, slot: { connection: 'eval', model }, activity, dataDir, host: new URL(baseUrl).host, close: () => fs.rmSync(dataDir, { recursive: true, force: true }) };
}

/** A connection from a data home's config.yaml, read live, with only the feature's own switch taken as on. */
export function fromHome(dataDir: string, id: string, model: string, feature: AiCallFeature, env: NodeJS.ProcessEnv): { ai: Ai; slot: Slot; activity: AiActivity; host: string; key: string | null } {
  if (!fs.existsSync(path.join(dataDir, 'config.yaml'))) throw new Error(`there's no config.yaml in ${dataDir} (--data-dir, or BRAGDOC_HOME)`);
  const store = new ConfigStore(dataDir, { env });
  store.load();
  const conns = store.get().ai.connections;
  if (!conns[id]) throw new Error(`there's no connection "${id}" in ${dataDir}/config.yaml (${Object.keys(conns).join(', ') || 'none yet: add one in Settings → AI'})`);
  const config = (): Config => {
    const c = store.get();
    if (feature !== 'judge' && feature !== 'tidy' && feature !== 'draft') return c;
    return { ...c, ai: { ...c.ai, features: { ...c.ai.features, [feature]: { ...c.ai.features[feature], enabled: true } } } };
  };
  const secrets = new Secrets(dataDir);
  const egress = new Egress({ dataDir, config });
  const ai = createAi({ config, egress, secrets });
  const activity = new AiActivity({ dataDir });
  activity.listen(ai);
  let key: string | null = null;
  try {
    key = secrets.aiKey(id, conns);
  } catch {
    /* the gates will say so */
  }
  const url = baseUrlOf(conns[id]!, conns);
  return { ai, slot: { connection: id, model }, activity, host: url ? new URL(url).host : id, key };
}

const USAGE = (spec: EvalSpec<unknown, unknown>) => `npm run eval:${spec.name} -- --connection <id | kind@url> --model <name> [--limit N] [--record] [--data-dir <home>]

${spec.description}
${spec.cases.length} synthetic cases. Needs BRAGDOC_LIVE_AI=1; refuses to run when CI is set.
  --connection <id>        a connection in the data home's config.yaml (its key and consent; AI must be on)
  --connection kind@url    one made up for this run, on this computer or your network: ollama@http://127.0.0.1:11434
  --model <name>           the model to ask
  --limit N                only the first N cases
  --record                 write the answers to test/fixtures/ai-recordings/${spec.name}/<model>.json (for replay tests)
  --data-dir <home>        the data home (default: $BRAGDOC_HOME, else ~/.bragdoc)
`;

/** The command line: refuse, parse, run, print, record. Returns the exit code. */
export async function main<I, A>(spec: EvalSpec<I, A>, argv = process.argv.slice(2), env = process.env, out = (s: string) => process.stdout.write(s), err = (s: string) => process.stderr.write(s)): Promise<number> {
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith('--')) return (err(`unexpected argument ${a}\n\n${USAGE(spec as EvalSpec<unknown, unknown>)}`), 2);
    const k = a.slice(2);
    if (k === 'record' || k === 'help') flags[k] = true;
    else if (['connection', 'model', 'limit', 'data-dir'].includes(k) && argv[i + 1] !== undefined) flags[k] = argv[++i]!;
    else return (err(`unknown or incomplete option ${a}\n\n${USAGE(spec as EvalSpec<unknown, unknown>)}`), 2);
  }
  if (flags.help) return (out(USAGE(spec as EvalSpec<unknown, unknown>)), 0);
  const no = refusal(env);
  if (no) return (err(`eval:${spec.name}: ${no}\n`), 2);
  if (typeof flags.connection !== 'string' || typeof flags.model !== 'string') return (err(`eval:${spec.name} needs --connection and --model\n\n${USAGE(spec as EvalSpec<unknown, unknown>)}`), 2);
  const limit = flags.limit === undefined ? undefined : Number(flags.limit);
  if (limit !== undefined && !(Number.isInteger(limit) && limit > 0)) return (err('--limit is a whole number above 0\n'), 2);

  let setup: { ai: Ai; slot: Slot; activity: AiActivity; host: string; key?: string | null; close?: () => void; logs: string };
  try {
    const m = /^([a-z-]+)@(https?:\/\/.+)$/.exec(flags.connection);
    if (m) {
      if (!(AI_KINDS as readonly string[]).includes(m[1]!)) return (err(`unknown kind ${m[1]} (${AI_KINDS.join(', ')})\n`), 2);
      const a = adHoc(m[1] as AiKind, m[2]!, flags.model, spec.feature);
      setup = { ...a, logs: 'a temp folder, removed afterwards' };
    } else {
      const dataDir = resolveDataDir(typeof flags['data-dir'] === 'string' ? flags['data-dir'] : undefined, env, os.homedir());
      setup = { ...fromHome(dataDir, flags.connection, flags.model, spec.feature, env), logs: `${dataDir}'s Network activity and AI activity` };
    }
  } catch (e) {
    return (err(`eval:${spec.name}: ${(e as Error).message}\n`), 1);
  }

  const n = Math.min(limit ?? spec.cases.length, spec.cases.length);
  err(`eval:${spec.name}: ${n} case${n === 1 ? '' : 's'}, ${setup.slot.model} on ${setup.host}; calls are logged in ${setup.logs}\n`);
  const controller = new AbortController();
  const onSigint = () => controller.abort();
  process.once('SIGINT', onSigint);
  let report: EvalReport;
  try {
    report = await runEval(spec, {
      ai: setup.ai,
      slot: setup.slot,
      activity: setup.activity,
      ...(limit ? { limit } : {}),
      signal: controller.signal,
      onRow: (row, i, total) => err(`  ${String(i + 1).padStart(String(total).length)}/${total} ${row.id}: ${row.error ?? (row.pass ? 'pass' : 'fail')} (${(row.ms / 1000).toFixed(1)} s)\n`),
    });
  } finally {
    process.off('SIGINT', onSigint);
    setup.close?.();
  }
  out(formatReport(report));
  if (report.stopped) {
    if (flags.record) err('not recording: the eval stopped early\n');
    return 1;
  }
  if (flags.record) {
    try {
      const file = writeRecording(report.recording, [setup.host, setup.key ?? '']);
      err(`recorded ${report.rows.length} answers in ${path.relative(ROOT, file)}\n`);
    } catch (e) {
      err(`${(e as Error).message}\n`);
      return 1;
    }
  }
  return 0;
}

/** True when `metaUrl` is the script node was started with (so importing a spec doesn't run it). */
export const isMain = (metaUrl: string) => !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
