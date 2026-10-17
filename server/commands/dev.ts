// `bragdoc dev ocr <image>…`: a developer's look at the screenshot pipeline (PR11). For each image it prints which OCR
// engine ran (and why another didn't), the text, and what the screenshot rules made of it. Not in `--help`: it's for
// checking OCR and the rules on real screenshots, not part of using BragDoc. It reads; it writes nothing.
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

const ENGINES = ['auto', 'tesseract', 'vision'] as const;
const list = (s: string | undefined) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

export async function dev(ctx: Ctx, args: string[], flags: Record<string, string>, rest: string[] | undefined): Promise<number> {
  const [sub, ...files] = args;
  if (sub !== 'ocr') throw new UsageError(sub ? `unknown dev command '${sub}' (there's only \`bragdoc dev ocr <image>…\`)` : 'dev needs a command: `bragdoc dev ocr <image>…`');
  check('dev ocr', flags, ['engine', 'name', 'aliases', 'not-me', 'data-dir', 'json'], [], 0, rest);
  if (!files.length) throw new UsageError('dev ocr needs at least one image');
  const engine = (flags.engine ?? 'auto') as (typeof ENGINES)[number];
  if (!ENGINES.includes(engine)) throw new UsageError(`--engine must be one of ${ENGINES.join(', ')}, not '${flags.engine}'`);
  if (flags.name === '') throw new UsageError('--name needs a name');

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
