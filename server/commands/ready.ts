// "Is it actually up?": the health probe behind the service commands' readiness wait, and behind the friendlier
// message when `serve` finds its port taken (adapted from Paddock's packages/server/src/cli/service/ready.ts).
//
// A service manager's "started" means the fork succeeded, not that the port answers: both launchctl and systemctl
// report a crash-looping job (a port clash, restarted every 10 s) as running for most of each cycle. So nothing here
// claims BragDoc is running until GET /api/health has answered. The wait is a tri-state on purpose: "I couldn't
// confirm it" (a slow first boot) is a real, common answer, and not the same claim as "it failed". Callers print a
// timeout as a caveat pointing at the logs, never as an error.
//
// D9: outbound HTTP goes through server/egress.ts (PR2), which allows loopback. Until it lands, this is the one place
// the CLI calls fetch(), always to 127.0.0.1; on rebase `probeHealth` becomes an egressFetch.
import net from 'node:net';
import type { HealthResponse } from '../../shared/api.js';

/** What answers on a port: BragDoc (and its version), something else, or nothing at all. */
export type Probe = { kind: 'bragdoc'; version: string } | { kind: 'other' } | { kind: 'none' };

/** Ask `http://127.0.0.1:<port>/api/health` who's there. Never rejects. */
export async function probeHealth(port: number, timeoutMs = 2000): Promise<Probe> {
  let res: Response;
  try {
    res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(timeoutMs), redirect: 'manual' });
  } catch (e) {
    // refused (or reset before answering): nothing is listening. A timeout means something took the connection and
    // never answered, which is someone, just not BragDoc.
    const name = (e as Error).name;
    if (name === 'TimeoutError' || name === 'AbortError') return { kind: 'other' };
    // not HTTP isn't the same as nothing: a database or a raw TCP service accepts the connection and then hangs up
    return (await accepts(port)) ? { kind: 'other' } : { kind: 'none' };
  }
  try {
    const body = (await res.json()) as Partial<HealthResponse>;
    if (res.ok && body.ok === true && typeof body.version === 'string') return { kind: 'bragdoc', version: body.version };
  } catch {
    /* not JSON: not BragDoc */
  }
  return { kind: 'other' };
}

/** Does anything accept a TCP connection on 127.0.0.1:port? */
function accepts(port: number, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: '127.0.0.1' });
    const done = (v: boolean) => {
      s.destroy();
      resolve(v);
    };
    s.setTimeout(timeoutMs, () => done(false));
    s.once('connect', () => done(true));
    s.once('error', () => done(false));
  });
}

/**
 * How long to wait before saying "couldn't confirm" (Paddock): generous, because it's only ever spent on the unhappy
 * path (a ready server answers in well under a second), and a false "didn't answer" on a cold boot is the most
 * alarming thing this output could say about a service that's fine.
 */
export const READY_TIMEOUT_MS = 20_000;
/** The same budget in words, so a message and the clock can't drift apart. */
export const READY_TIMEOUT_LABEL = `${READY_TIMEOUT_MS / 1000} seconds`;

export interface ReadyOptions {
  probe?: (port: number) => Promise<Probe>;
  timeoutMs?: number;
  intervalMs?: number;
  /** Injected in tests, so a timeout is proven without waiting for one. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/** Poll the port until BragDoc answers ('ready', with its version) or the clock runs out ('timeout'). */
export async function waitForReady(port: number, o: ReadyOptions = {}): Promise<{ ready: true; version: string } | { ready: false }> {
  const { probe = probeHealth, timeoutMs = READY_TIMEOUT_MS, intervalMs = 250, now = Date.now, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = o;
  const deadline = now() + timeoutMs;
  for (;;) {
    const p = await probe(port);
    if (p.kind === 'bragdoc') return { ready: true, version: p.version };
    if (now() >= deadline) return { ready: false };
    await sleep(intervalMs);
  }
}
