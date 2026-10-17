// The bind guard (SPEC R3, D10): BragDoc has no login, so listening anywhere but loopback hands the data home to
// whoever can reach the port. A non-loopback address is refused unless BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1, in which case
// it's allowed with a loud warning. Adapted from Paddock's bind-safety.ts (its #435), minus the auth-mode coupling:
// BragDoc has no auth mode that could make an open bind safe.
//
// Scope note (Paddock's, and still true here): inside a container the network namespace is the boundary and the app
// can't see how the port is published, so the Docker image sets the flag with HOST=0.0.0.0 and the docs carry the safe
// publish posture (`-p 127.0.0.1:2724:2724`). This guard is for bare-metal runs, not the container's police.

/** The environment variable that opts in to an open bind. Only `1` counts, exactly as PR1's interim guard had it (D21). */
export const ALLOW_OPEN_ENV = 'BRAGDOC_DANGEROUSLY_ALLOW_OPEN';

/**
 * True when `host` names a loopback-only interface: `localhost`, the whole IPv4 127.0.0.0/8 block, `::1`, and
 * IPv4-mapped loopback (`::ffff:127.0.0.1`). Brackets, whitespace and case are normalised away. `0.0.0.0` and `::`
 * (every interface) are NOT loopback: they're the footgun.
 */
export function isLoopbackHost(host: string): boolean {
  let h = host.trim().toLowerCase();
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  if (h === 'localhost' || h === '::1') return true;
  const mapped = h.startsWith('::ffff:') ? h.slice('::ffff:'.length) : h;
  return /^127(?:\.\d{1,3}){3}$/.test(mapped);
}

export type BindSafetyDecision = { action: 'allow' } | { action: 'warn'; message: string } | { action: 'refuse'; message: string };

/** Whether it's safe to listen on `host`. Pure: the caller acts on the decision (throw, warn, go). */
export function evaluateBindSafety(host: string, env: NodeJS.ProcessEnv = process.env): BindSafetyDecision {
  if (isLoopbackHost(host)) return { action: 'allow' };
  if (env[ALLOW_OPEN_ENV] === '1')
    return {
      action: 'warn',
      message: `listening on ${host}, not just this computer (${ALLOW_OPEN_ENV}=1). BragDoc has no login: anyone who can reach this port can read and change your data.`,
    };
  return {
    action: 'refuse',
    message: `refusing to listen on ${host}: BragDoc has no login, so anyone who can reach that address could read and change your data. Use 127.0.0.1, or set ${ALLOW_OPEN_ENV}=1 if you really mean it (e.g. inside Docker).`,
  };
}
