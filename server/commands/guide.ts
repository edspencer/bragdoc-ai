// `bragdoc guide`: prints AGENT-GUIDE.md, the guide for coding agents (SPEC R11). A placeholder until the MCP server
// and the guide itself arrive (PR9), which replaces this file.
import { check } from '../args.js';
import type { Ctx } from './context.js';

export async function guide(ctx: Ctx, args: string[], flags: Record<string, string>, rest: string[] | undefined): Promise<number> {
  check('guide', flags, [], args, 0, rest);
  ctx.out("The guide for coding agents isn't written yet: it arrives with BragDoc's MCP server.\n");
  return 0;
}
