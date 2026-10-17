// `bragdoc guide [--snippet]`: prints AGENT-GUIDE.md, the guide for coding agents (SPEC R11), or just the paragraph
// for an agent instruction file. Read-only, and works without a running server: it has no live facts, only where the
// data home is (a running server's /agent-guide.md adds them). Local Review's `guide`, Hallway's shape.
import { check } from '../args.js';
import { DEFAULT_URL, agentGuide, readGuide, snippet } from '../guide.js';
import { resolveDataDir, tildify } from '../paths.js';
import type { Ctx } from './context.js';

export async function guide(ctx: Ctx, args: string[], flags: Record<string, string>, rest: string[] | undefined): Promise<number> {
  check('guide', flags, ['snippet'], args, 0, rest);
  const g = readGuide();
  ctx.out(flags.snippet ? snippet(g) : agentGuide({ guide: g, url: DEFAULT_URL, home: tildify(resolveDataDir(undefined, ctx.env, ctx.homedir), ctx.homedir) }));
  return 0;
}
