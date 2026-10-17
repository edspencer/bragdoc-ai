// `bragdoc import <export.json> [--dry-run] [--data-dir <dir>]`: bring an export from the hosted BragDoc app across
// (SPEC R12). With BragDoc running (runtime.json names a live process), the file goes to its POST /api/import/*, so
// the server stays the one writer and the board updates live. Without one, it opens the data home's store itself,
// under the import lock, exactly as the server would. Either way: a dry run writes nothing, and importing the same
// file twice adds nothing the second time.
import fs from 'node:fs';
import path from 'node:path';
import type { ApiError, ImportReport } from '../../shared/api.js';
import { UsageError, check } from '../args.js';
import { ConfigStore, DEFAULT_CONFIG } from '../config.js';
import { Egress } from '../egress.js';
import { initHome } from '../home.js';
import { takeImportLock } from '../import/lock.js';
import { formatReport } from '../import/report.js';
import { ExportRefused, MAX_EXPORT_BYTES, readExport } from '../import/v1-schema.js';
import { apply, plan } from '../import/v1.js';
import { resolveDataDir, tildify } from '../paths.js';
import { readRuntime } from '../runtime.js';
import { createServices } from '../services/index.js';
import { openStore } from '../store/index.js';
import type { Ctx } from './context.js';

export async function importCommand(ctx: Ctx, args: string[], flags: Record<string, string>, rest: string[] | undefined): Promise<number> {
  check('import', flags, ['dry-run', 'data-dir'], args, 1, rest);
  if (!args[0]) throw new UsageError('import needs the export file: bragdoc import <export.json> [--dry-run]');
  if (flags['data-dir'] === '') throw new UsageError('--data-dir needs a directory');
  const dryRun = !!flags['dry-run'];
  const file = path.resolve(args[0]);
  const shown = tildify(file, ctx.homedir);
  const text = readFile(file, shown);
  // checked here first, so a file that can't be imported says why without touching the data home or a server
  let ex;
  try {
    ex = readExport(text);
  } catch (e) {
    if (e instanceof ExportRefused) throw new Error(`can't import ${shown}: ${e.message}`);
    throw e;
  }
  const dataDir = resolveDataDir(flags['data-dir'] || ctx.env.BRAGDOC_HOME || undefined, {}, ctx.homedir);
  const rt = readRuntime(dataDir);

  let report: ImportReport | null = null;
  if (rt?.running) {
    const base = `http://127.0.0.1:${rt.port}`;
    // loopback is always on the egress allow-list; the request is in the network log like any other
    const egress = new Egress({ dataDir, config: () => DEFAULT_CONFIG });
    let res: Response | null = null;
    try {
      res = await egress.egressFetch({ purpose: dryRun ? 'import.plan' : 'import.apply' }, `${base}/api/import/${dryRun ? 'plan' : 'apply'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
    } catch (e) {
      // nothing listening: runtime.json's pid is alive but isn't BragDoc any more (pids are reused), so it's safe to
      // import directly, under the lock. Anything else (a timeout, a reset) may be BragDoc mid-request: don't race it
      if (!refused(e))
        throw new Error(`BragDoc is running (process ${rt.pid}) but didn't answer on port ${rt.port} (${(e as Error).message}). Try again in a moment, or stop it and run the import on its own.`);
    }
    if (res) {
      ctx.err(`${dryRun ? 'Asked' : 'Imported through'} the running BragDoc (${rt.url}).\n`);
      const body = (await res.json().catch(() => null)) as ImportReport | ApiError | null;
      if (!res.ok || !body || 'error' in body) throw new Error(`can't import ${shown}: ${body && 'error' in body ? body.error.message : `BragDoc answered ${res.status}`}`);
      report = body;
    }
  }
  if (!report) {
    // as `serve` starts: a config.yaml from a newer BragDoc refuses (before anything's touched), then the layout
    new ConfigStore(dataDir, { env: {} }).load();
    if (!dryRun) initHome(dataDir);
    const store = openStore(dataDir);
    if (dryRun) report = plan(store, ex).report;
    else {
      const release = takeImportLock(dataDir);
      try {
        report = await apply(store, createServices(store), plan(store, ex));
      } finally {
        release();
      }
    }
  }
  ctx.out(formatReport(report, { file: shown }));
  ctx.out(`Data folder: ${tildify(dataDir, ctx.homedir)}\n`);
  return 0;
}

function readFile(file: string, shown: string): string {
  let st: fs.Stats;
  try {
    st = fs.statSync(file);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    throw new Error(code === 'ENOENT' ? `there's no file ${shown}` : `can't read ${shown}: ${(e as Error).message}`);
  }
  if (st.isDirectory()) throw new Error(`${shown} is a folder; give the export file itself (bragdoc-export-<date>.json)`);
  if (st.size > MAX_EXPORT_BYTES) throw new Error(`${shown} is ${Math.round(st.size / 1024 / 1024)} MB; an export can be at most ${MAX_EXPORT_BYTES / 1024 / 1024} MB`);
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    throw new Error(`can't read ${shown}: ${(e as Error).message}`);
  }
}

/** A connection nobody accepted (fetch's TypeError, with the socket error as its cause). */
function refused(e: unknown): boolean {
  const cause = (e as { cause?: { code?: string } } | null)?.cause;
  return cause?.code === 'ECONNREFUSED';
}
