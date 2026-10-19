// `bragdoc dev ocr <image>…`: a developer's look at the screenshot pipeline (PR11). For each image it prints which OCR
// engine ran (and why another didn't), the text, and what the screenshot rules made of it. Not in `--help`: it's for
// checking OCR and the rules on real screenshots, not part of using BragDoc. It reads; it writes nothing.
//
// `bragdoc dev ai --connection <id> --model <m> [--schema ok] "<prompt>"` (v0.2, PR21): one model call through the
// real runtime (ctx.ai: the gates, the queue, egress), with the data home's config.yaml and secrets.yaml. It prints
// the answer, how long it took and where it went. Like any call, it's in the data home's Network activity and AI
// activity (trigger `cli`), and it's refused exactly as the app would refuse it: with AI off it sends nothing.
//
// The rules need to know who you are. They use --name / --aliases / --not-me when given, else the data home's
// profile.yaml (read only), else they're skipped.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { UsageError, check } from '../args.js';
import { resolveDataDir, tildify } from '../paths.js';
import { ProfileSchema } from '../../shared/schema/profile.js';
import { type RulesProfile, compileRules, describeMatch } from '../../shared/rules/screenshot.js';
import type { Ctx } from './context.js';
import { z } from 'zod';
import { baseUrlOf, type AiConnectionConfig } from '../../shared/ai/connections.js';

const ENGINES = ['auto', 'tesseract', 'vision'] as const;
const list = (s: string | undefined) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

export async function dev(ctx: Ctx, args: string[], flags: Record<string, string>, rest: string[] | undefined): Promise<number> {
  const [sub, ...files] = args;
  if (sub === 'ai') return devAi(ctx, files, flags, rest);
  if (sub !== 'ocr') throw new UsageError(sub ? `unknown dev command '${sub}' (there's \`bragdoc dev ocr <image>…\` and \`bragdoc dev ai\`)` : 'dev needs a command: `bragdoc dev ocr <image>…` or `bragdoc dev ai …`');
  check('dev ocr', flags, ['engine', 'name', 'aliases', 'not-me', 'data-dir', 'json'], [], 0, rest);
  if (!files.length) throw new UsageError('dev ocr needs at least one image');
  const engine = (flags.engine ?? 'auto') as (typeof ENGINES)[number];
  if (!ENGINES.includes(engine)) throw new UsageError(`--engine must be one of ${ENGINES.join(', ')}, not '${flags.engine}'`);
  if (flags.name === '') throw new UsageError('--name needs a name');
  if (flags.name === undefined && (flags.aliases !== undefined || flags['not-me'] !== undefined)) throw new UsageError('--aliases and --not-me go with --name');

  const profile = flags.name !== undefined ? { name: flags.name, aliases: list(flags.aliases), notMe: list(flags['not-me']) } : readProfile(ctx, flags['data-dir']);
  const rules = profile ? compileRules(profile) : null;
  const [{ createOcr }, { TesseractEngine }, { VisionEngine }] = await Promise.all([import('../ocr/index.js'), import('../ocr/tesseract.js'), import('../ocr/vision-macos.js')]);
  // a named engine is built even where it isn't a default (Vision off macOS), so it says why it can't run
  const ocr = createOcr(engine === 'auto' ? {} : { engines: [engine === 'vision' ? new VisionEngine() : new TesseractEngine()] });
  const out: unknown[] = [];
  let failed = 0;
  try {
    for (const file of files) {
      const where = tildify(path.resolve(file), ctx.homedir);
      try {
        const r = await ocr.read({ path: file });
        const verdict = rules?.(r.text) ?? null;
        if (flags.json) out.push({ file, engine: r.engine, ms: r.ms, confidence: r.confidence ?? null, skipped: r.skipped, text: r.text, rules: verdict });
        else {
          ctx.out(`${where}: ${r.engine}, ${r.ms} ms${r.confidence !== undefined ? `, confidence ${Math.round(r.confidence)}` : ''}\n`);
          for (const s of r.skipped) ctx.out(`  (not ${s})\n`);
          ctx.out(`--- text ---\n${r.text || '(none)'}\n`);
          if (!verdict) ctx.out('--- rules: skipped (no profile: pass --name, or make one in BragDoc) ---\n\n');
          else {
            ctx.out(`--- rules for ${profile!.name}: ${verdict.pass ? 'PASS' : 'no'} ---\n`);
            for (const m of verdict.matched) ctx.out(`  ${describeMatch(m)}\n`);
            if (verdict.quote) ctx.out(`  quote: "${verdict.quote}"\n`);
            if (verdict.from || verdict.where) ctx.out(`  ${[verdict.from && `from ${verdict.from}`, verdict.where && `in ${verdict.where}`].filter(Boolean).join(', ')}\n`);
            for (const n of verdict.notes) ctx.out(`  note: ${n}\n`);
            ctx.out('\n');
          }
        }
      } catch (e) {
        failed++;
        const message = e instanceof Error ? e.message : String(e);
        if (flags.json) out.push({ file, error: message });
        else ctx.err(`bragdoc: ${where}: ${message}\n`);
      }
    }
  } finally {
    await ocr.close();
  }
  if (flags.json) ctx.out(JSON.stringify(out, null, 2) + '\n');
  return failed ? 1 : 0;
}

/** profile.yaml from the data home, if there's a valid one. */
function readProfile(ctx: Ctx, dataDirFlag: string | undefined): RulesProfile | null {
  const file = path.join(resolveDataDir(dataDirFlag, ctx.env, ctx.homedir), 'profile.yaml');
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  const p = ProfileSchema.safeParse(yaml.load(raw));
  if (!p.success) {
    ctx.err(`bragdoc: ${tildify(file, ctx.homedir)} isn't a valid profile; the rules are skipped\n`);
    return null;
  }
  return p.data;
}

/** The schemas `dev ai --schema` knows: enough to check that structured answers work. */
const DEV_SCHEMAS = {
  ok: z.object({ ok: z.boolean() }),
  answer: z.object({ answer: z.string() }),
  lastLine: z.object({ lastLine: z.string() }),
} as const;

async function devAi(ctx: Ctx, args: string[], flags: Record<string, string>, rest: string[] | undefined): Promise<number> {
  check('dev ai', flags, ['connection', 'model', 'schema', 'file', 'system', 'data-dir', 'json'], args, 1, rest);
  if (!flags.connection) throw new UsageError('dev ai needs --connection <id> (one of config.yaml\'s ai.connections)');
  if (!flags.model) throw new UsageError('dev ai needs --model <name>');
  if (flags.schema !== undefined && !(flags.schema in DEV_SCHEMAS)) throw new UsageError(`--schema must be one of ${Object.keys(DEV_SCHEMAS).join(', ')}`);
  if (!!args[0] === !!flags.file) throw new UsageError('dev ai needs a prompt: "<prompt>" or --file <file>');
  const prompt = flags.file ? fs.readFileSync(path.resolve(flags.file), 'utf8') : args[0]!;
  const dataDir = resolveDataDir(flags['data-dir'], ctx.env, ctx.homedir);
  const [{ ConfigStore }, { Egress }, { Secrets }, { createAi, AiError }, { HOST_CLASS_LABEL }, { AiActivity }] = await Promise.all([
    import('../config.js'),
    import('../egress.js'),
    import('../secrets.js'),
    import('../ai/run.js'),
    import('../../shared/ai/hosts.js'),
    import('../ai/activity.js'),
  ]);
  const config = new ConfigStore(dataDir, { env: ctx.env });
  config.load();
  const egress = new Egress({ dataDir, config: () => config.get() });
  const ai = createAi({ config: () => config.get(), egress, secrets: new Secrets(dataDir) });
  new AiActivity({ dataDir }).listen(ai); // in the data home's AI activity, like any call (a running server lists it)
  const slot = { connection: flags.connection, model: flags.model };
  const call = { feature: 'test' as const, purpose: 'ai.dev', slot, system: flags.system ?? 'You are a helpful assistant. Answer briefly.', prompt, priority: 'now' as const, trigger: 'cli' as const };
  const t0 = ctx.now();
  try {
    let line: { where: string; ms: number; tokensIn: number | null; tokensOut: number | null; mode: string; repaired: boolean };
    let answer: unknown;
    if (flags.schema) {
      const r = await ai.object({ ...call, schema: DEV_SCHEMAS[flags.schema as keyof typeof DEV_SCHEMAS] as z.ZodType<unknown>, schemaName: flags.schema });
      answer = r.object;
      line = r;
      if (!flags.json) ctx.out(JSON.stringify(r.object, null, 2) + '\n');
    } else {
      const s = await ai.stream(call);
      let text = '';
      for await (const chunk of s.textStream) {
        text += chunk;
        if (!flags.json) ctx.out(chunk);
      }
      line = await s.done;
      answer = text;
      if (!flags.json) ctx.out('\n');
    }
    const host = connectionHostOf(config.get(), slot.connection);
    if (flags.json) ctx.out(JSON.stringify({ answer, connection: slot.connection, model: slot.model, host, where: line.where, ms: line.ms, tokensIn: line.tokensIn, tokensOut: line.tokensOut, mode: line.mode, repaired: line.repaired }, null, 2) + '\n');
    else
      ctx.out(
        `--- ${slot.model} on ${host} (${HOST_CLASS_LABEL[line.where as keyof typeof HOST_CLASS_LABEL]}), ${(line.ms / 1000).toFixed(1)} s` +
          `${line.tokensIn !== null ? `, ${line.tokensIn} → ${line.tokensOut ?? '?'} tokens` : ''}` +
          `${flags.schema ? `, structured: ${line.mode === 'schema' ? 'the model kept to the schema' : 'JSON mode (this server takes no schema)'}${line.repaired ? ', after one repair' : ''}` : ''} ---\n`,
      );
    return 0;
  } catch (e) {
    if (e instanceof AiError) {
      if (flags.json) ctx.out(JSON.stringify({ error: { code: e.code, message: e.message }, ms: ctx.now() - t0 }, null, 2) + '\n');
      else ctx.err(`bragdoc: ${e.code}: ${e.message} (after ${((ctx.now() - t0) / 1000).toFixed(1)} s)\n`);
      return 1;
    }
    throw e;
  }
}

/** A connection's host, for the summary line. */
function connectionHostOf(cfg: { ai: { connections: Record<string, AiConnectionConfig> } }, id: string): string {
  const c = cfg.ai.connections[id];
  const u = c ? baseUrlOf(c, cfg.ai.connections) : null;
  return u ? new URL(u).host : id;
}
