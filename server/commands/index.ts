// Every `bragdoc` command except `serve` (server/cli.ts), by name (Hallway's server/commands/index.ts). Each resolves
// with its exit code, or undefined while it keeps running (`service logs`). A new command is a file here and one line
// below; `import` (PR12) adds itself this way.
import type { Ctx } from './context.js';
import { guide } from './guide.js';
import { mcp } from './mcp.js';
import { service } from './service.js';

export { makeCtx } from './context.js';

export type Command = (ctx: Ctx, args: string[], flags: Record<string, string>, rest: string[] | undefined) => Promise<number | undefined>;

export const COMMANDS: Record<string, Command> = {
  guide,
  mcp,
  service,
};
