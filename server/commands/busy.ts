// `bragdoc busy [--json]` (cli-contract SPEC §1, §4; D86): is the running BragDoc in the middle of something a
// restart would cut short? 0 no, 75 yes, 3 nothing is running. For scripts, Ansible and a Docker update hook
// (`docker exec <container> bragdoc busy`), where there's no `service` to ask.
import { UsageError, check } from '../args.js';
import { parsePort } from '../port.js';
import { resolveDataDir } from '../paths.js';
import { runBusyCommand } from './busy-client.js';
import type { Ctx } from './context.js';

export async function busy(ctx: Ctx, args: string[], flags: Record<string, string>, rest: string[] | undefined): Promise<number> {
  check('busy', flags, ['json', 'data-dir', 'port'], args, 0, rest);
  if (flags['data-dir'] === '') throw new UsageError('--data-dir needs a directory');
  let port: number | undefined;
  if (flags.port !== undefined) {
    const p = parsePort(flags.port);
    if (p === null || p === 0) throw new UsageError(`--port must be a port number (1-65535), not '${flags.port}'`);
    port = p;
  }
  const dataDir = resolveDataDir(flags['data-dir'], ctx.env, ctx.homedir);
  return runBusyCommand({ dataDir, port, get: ctx.loopback, io: ctx, json: !!flags.json });
}
