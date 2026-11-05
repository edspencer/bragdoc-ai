// Every `bragdoc` command except `serve` (server/cli.ts), by name (Hallway's server/commands/index.ts). Each resolves
// with its exit code, or undefined while it keeps running (`service logs`). A new command is a file here and one line
// below.
import { busy } from './busy.js';
import type { Ctx } from './context.js';
import { dev } from './dev.js';
import { doctor } from './doctor.js';
import { guide } from './guide.js';
import { importCommand } from './import.js';
import { mcp } from './mcp.js';
import { service } from './service.js';
import { update } from './update.js';

export { makeCtx } from './context.js';

export type Command = (ctx: Ctx, args: string[], flags: Record<string, string>, rest: string[] | undefined) => Promise<number | undefined>;

export const COMMANDS: Record<string, Command> = {
  busy,
  dev,
  doctor,
  guide,
  import: importCommand,
  mcp,
  service,
  update,
};

/** Hidden aliases (cli-contract SPEC §1): they work, and the help and the docs name only the command. */
export const ALIASES: Record<string, string> = { upgrade: 'update' };
