// `bragdoc update [--check] [--to <version|tag>] [--yes] [--force] [--json]`, and its hidden alias `upgrade`
// (cli-contract SPEC 0.2 §1, §5; D87, D88). The sequence is the contract's reference code, copied into server/update/
// with its headers; this file is BragDoc's side of it, the UpdateProduct: the names, the busy check, the service, and
// the backup before a version that changes the data's format starts.
//
// Everything that leaves the machine goes through egress.ts (D9, D87): the two registry GETs through
// Egress.registry() (logged as `update.registry`), the health polls through probeLoopback (127.0.0.1, unlogged, D51),
// and npm's own traffic is recorded with Egress.logProcess(), since it leaves from npm's process. Processes start only
// through proc.ts.
import fs from 'node:fs';
import { posix as path } from 'node:path';
import { check } from '../args.js';
import { CONFIG_SCHEMA_VERSION, DEFAULT_CONFIG } from '../config.js';
import { Egress } from '../egress.js';
import { VERSION, resolveDataDir, tildify } from '../paths.js';
import { UnsupportedPlatformError } from '../platform/index.js';
import { readArgv } from '../platform/spec.js';
import { runSync } from '../proc.js';
import { readRuntimeAddress } from '../runtime.js';
import { backupBeforeUpdate } from '../store/backups.js';
import { SCHEMA_VERSIONS } from '../../shared/schema/common.js';
import { createOutput } from '../update/output.js';
import { npmConfigGet, spawnSyncRunner, type NpmContext, type Spawn } from '../update/package-manager.js';
import { resolveRegistry } from '../update/registry.js';
import { runUpdate, type UpdateProduct } from '../update/update.js';
import type { Fetch } from '../update/health.js';
import { guardBusy } from './busy-client.js';
import { type Ctx, lastLines } from './context.js';
import { buildLog, installedDataDir, manager, urlOf } from './service.js';

export const PACKAGE_NAME = '@bragdoc/local';
export const IMAGE = 'ghcr.io/edspencer/bragdoc';
export const changelogUrl = (v: string) => `https://github.com/edspencer/bragdoc-ai/releases/tag/v${v}`;

export const UPDATE_USAGE = `Usage: bragdoc update [--check] [--to <version|tag>] [--yes] [--force] [--json]
  --check          say whether there's a newer version, and change nothing
  --to <v|tag>     go to this version or dist-tag (next); the only way to go to an older one
  --yes            don't ask (needed without a terminal)
  --force          go ahead while BragDoc is busy (the health check and the rollback still run)
  --json           one JSON document on stdout`;

/** How long the new version gets to answer, from its start (SPEC §5 step 12's 30 seconds, for a cold first boot). */
const HEALTH_TIMEOUT_MS = 60_000;
/** How long `service install --refresh` may take, its own readiness wait included. */
const REFRESH_TIMEOUT_MS = 120_000;

export async function update(ctx: Ctx, args: string[], flags: Record<string, string>, rest: string[] | undefined): Promise<number> {
  check('update', flags, ['check', 'to', 'yes', 'force', 'json'], args, 0, rest);
  const out = createOutput({ tool: 'bragdoc', json: !!flags.json, stdout: { write: (s: string) => ctx.out(s) }, stderr: { write: (s: string) => ctx.err(s) }, env: ctx.env });
  const env = { ...ctx.env };
  const npm: NpmContext = { env, spawn: spawnSyncRunner };
  // the one registry both the check and npm use: settled once, here, so egress can be told exactly where it may go
  const registryUrl = resolveRegistry(env, (key) => npmConfigGet(key, npm));
  env.npm_config_registry = registryUrl;
  const svc = await serviceOf(ctx);
  const dataDir = svc.dataDir;
  // 0700 like any data home (home.ts); update.lock and update-check.json go here
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const egress = new Egress({ dataDir, config: () => DEFAULT_CONFIG });
  return runUpdate(
    updateProduct(ctx, { dataDir, svc }),
    { check: !!flags.check, yes: !!flags.yes, force: !!flags.force, json: !!flags.json, ...(flags.to !== undefined ? { to: flags.to } : {}) },
    {
      out,
      env,
      spawn: loggedSpawn(egress, spawnSyncRunner),
      fetch: viaEgress(ctx, egress.registry({ registryUrl, packageName: PACKAGE_NAME })),
    },
  );
}

/** Which service `update` is about: the installed unit's data home and port, else the default data home. */
export interface ServiceOf {
  installed: boolean;
  dataDir: string;
  port: number | null;
}

export async function serviceOf(ctx: Ctx): Promise<ServiceOf> {
  try {
    const st = await manager(ctx).status();
    if (st.installed) return { installed: true, dataDir: installedDataDir(ctx, st), port: readArgv(st.argv).port };
  } catch (e) {
    // Windows, or a platform with no service manager: there's no service, only a data home
    if (!(e instanceof UnsupportedPlatformError)) throw e;
  }
  return { installed: false, dataDir: resolveDataDir(undefined, ctx.env, ctx.homedir), port: null };
}

/**
 * A fetch for update.ts: `/api/health` on this computer through probeLoopback (D51: fixed to 127.0.0.1, unlogged),
 * everything else through the registry fetch egress.ts handed out, which refuses anything but the registry.
 */
export function viaEgress(ctx: Pick<Ctx, 'loopback'>, registry: Fetch): Fetch {
  return (input, init) => {
    const u = new URL(input);
    if (u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost') && u.pathname === '/api/health' && !u.search && u.port !== '')
      return ctx.loopback(Number(u.port), '/api/health', 2000);
    return registry(input, init);
  };
}

/** npm's network-touching runs (`cache add`, `install`, and the other managers' installs), recorded in the network log. */
export function loggedSpawn(egress: Pick<Egress, 'logProcess'>, run: Spawn): Spawn {
  return (cmd, args, opts) => {
    const r = run(cmd, args, opts);
    // `node <npm-cli.js> …`: the arguments after the script are npm's
    const npmArgs = /npm-cli\.js$/.test(args[0] ?? '') ? args.slice(1) : /(?:^|[/\\])(?:npm|pnpm|bun|volta)$/.test(cmd) ? args : null;
    const touchesNetwork = npmArgs !== null && (npmArgs[0] === 'install' || npmArgs[0] === 'add' || (npmArgs[0] === 'cache' && npmArgs[1] === 'add'));
    if (touchesNetwork) {
      const bin = /npm-cli\.js$/.test(args[0] ?? '') ? 'npm' : path.basename(cmd);
      egress.logProcess({
        purpose: 'update.install',
        bin: 'npm',
        args: bin === 'npm' ? npmArgs : [bin, ...npmArgs],
        exitCode: r.status,
        ...(r.status !== 0 ? { error: (r.stderr.trim().split('\n').at(-1) ?? '').slice(0, 300) || 'failed' } : {}),
      });
    }
    return r;
  };
}

/** The schema versions a BragDoc writes (D23): its file kinds' and config.yaml's. */
export function schemaVersions(): Record<string, number> {
  return { ...SCHEMA_VERSIONS, config: CONFIG_SCHEMA_VERSION };
}

/**
 * The schema versions another installed BragDoc writes, from the schema-versions.json beside its CLI
 * (scripts/schema-versions.mjs, D88), or null when it doesn't say (anything before 0.5.0).
 */
export function schemaVersionsOf(cli: string): Record<string, number> | null {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(path.dirname(cli), 'schema-versions.json'), 'utf8')) as unknown;
    if (typeof v !== 'object' || v === null) return null;
    const out: Record<string, number> = {};
    for (const [k, n] of Object.entries(v)) if (Number.isInteger(n)) out[k] = n as number;
    return out;
  } catch {
    return null;
  }
}

/**
 * Does `next` raise anything `now` writes? A kind it doesn't name is taken as unchanged; a version that says nothing
 * about its formats (null) is taken as raising them, since nothing can show it doesn't.
 */
export function raisesSchema(now: Record<string, number>, next: Record<string, number> | null): boolean {
  if (next === null) return true;
  return Object.entries(next).some(([k, n]) => n > (now[k] ?? 1));
}

export function updateProduct(ctx: Ctx, { dataDir, svc }: { dataDir: string; svc: ServiceOf }): UpdateProduct {
  const log = buildLog(dataDir);
  return {
    name: 'BragDoc',
    tool: 'bragdoc',
    packageName: PACKAGE_NAME,
    envPrefix: 'BRAGDOC',
    home: dataDir,
    currentVersion: VERSION,
    entry: process.argv[1] ?? ctx.cliScript,
    binSubpath: 'dist/server/cli.js',
    image: IMAGE,
    usage: UPDATE_USAGE,
    changelogUrl,
    healthTimeoutMs: HEALTH_TIMEOUT_MS,
    // the installed unit's port when there's a service (as stop and restart ask, D86), else runtime.json
    guardBusy: ({ force }) => guardBusy({ dataDir, ...(svc.port !== null ? { port: svc.port } : {}), get: ctx.loopback, io: ctx, force }),
    service: {
      async inspect() {
        if (svc.installed) {
          const st = await manager(ctx).status();
          return { installed: st.installed, running: st.running, url: urlOf(readArgv(st.argv).port), log };
        }
        const live = readRuntimeAddress(dataDir);
        return { installed: false, running: live?.running === true, ...(live?.running ? { url: `http://localhost:${live.port}` } : {}) };
      },
      async stop() {
        await manager(ctx).stop();
      },
      refresh(cli) {
        const r = runSync(process.execPath, [cli, 'service', 'install', '--refresh'], { env: ctx.env, timeoutMs: REFRESH_TIMEOUT_MS });
        // a version that doesn't start fails here, at the refresh's own readiness wait, and update.ts shows the log's
        // tail only for a failed health poll: so the refresh's failure carries it (SPEC §5 step 13's 20 lines)
        const tail = r.status === 0 ? '' : lastLines(log, 20).trimEnd();
        return tail ? { ...r, stderr: `${r.stderr.trimEnd()}\n\nThe last 20 lines of ${tildify(log, ctx.homedir)}:\n${tail}\n` } : r;
      },
      tail: (lines) => lastLines(log, lines),
    },
    beforeStart({ cli, version }) {
      if (!raisesSchema(schemaVersions(), schemaVersionsOf(cli))) return undefined;
      return backupBeforeUpdate(dataDir, version) ?? undefined;
    },
  };
}

