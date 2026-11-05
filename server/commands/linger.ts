// Linux's linger (cli-contract SPEC §7, D92): a systemd user service stops with the user's manager at their last
// logout, SSH sessions included, unless linger is on. `service install` and `doctor` ask `loginctl show-user <user> -p
// Linger` (through proc.ts), and only when it's off print `sudo loginctl enable-linger <user>`. BragDoc never runs
// sudo, and an answer it can't read (no loginctl, no logind: a container) says nothing.
import type { Ctx } from './context.js';

export interface Linger {
  /** Whose linger: $USER, else $LOGNAME; null when neither is set. */
  user: string | null;
  /** On, off, or null when it couldn't be asked. */
  enabled: boolean | null;
}

export async function askLinger(ctx: Ctx): Promise<Linger> {
  const user = ctx.env.USER || ctx.env.LOGNAME || null;
  if (!user) return { user, enabled: null };
  const r = await ctx.proc('loginctl', ['show-user', user, '-p', 'Linger'], { env: ctx.env, timeoutMs: 5000 }).catch(() => null);
  const m = r && r.code === 0 ? /^Linger=(yes|no)$/m.exec(r.stdout) : null;
  return { user, enabled: m ? m[1] === 'yes' : null };
}

/**
 * What `service install` says about linger (the wording of cli-contract reference/service/index.ts's `lingerAdvice`):
 * only when it's off. On, or not known, it's undefined, and nothing is printed.
 */
export function lingerAdvice(l: Linger): string | undefined {
  if (l.enabled !== false || !l.user) return undefined;
  return `Lingering is off for ${l.user}, so the service stops when you log out (SSH sessions included), and starts at your next login. To keep BragDoc running, once:\n  sudo loginctl enable-linger ${l.user}`;
}
