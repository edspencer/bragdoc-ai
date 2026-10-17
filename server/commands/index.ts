// Every `bragdoc` command except `serve` (server/cli.ts), by name (Hallway's server/commands/index.ts). Each resolves
// with its exit code, or undefined while it keeps running (`service logs`). A new command is a file here and one line
// below; `mcp` (PR9) and `import` (PR12) add themselves this way.
import type { Ctx } from './context.js';
import { dev } from './dev.js';
import { guide } from './guide.js';
import { service } from './service.js';

export { makeCtx } from './context.js';

export type Command = (ctx: Ctx, args: string[], flags: Record<string, string>, rest: string[] | undefined) => Promise<number | undefined>;

export const COMMANDS: Record<string, Command> = {
  dev,
  guide,
  service,
};
