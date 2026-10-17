// runtime.json (SPEC R2): where the running server is, and the MCP bearer token. Adapted from Hallway's daemonfile.ts.
// Mode 0600, because the token lets whoever holds it write to your board through /mcp (PR9).
//
// The token is generated once and kept across restarts: it's registered with your agents (`bragdoc mcp install
// claude` writes it into their config), so a new token on every start would break them. So unlike Hallway's record,
// this file is never removed on exit; `pid` tells a reader whether the server it describes is still running. Rotating
// the token (Settings → Sources → Agents, PR10) writes a new one at once.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { isLoopbackHost } from './bind-safety.js';
import { atomicWrite } from './atomic.js';
import { homePaths } from './home.js';

export interface RuntimeRecord {
  pid: number;
  port: number;
  /** The address to open: `http://localhost:2724`. */
  url: string;
  version: string;
  startedAt: string;
  /** The MCP bearer token: 32 random bytes, base64url. */
  mcpToken: string;
}

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function newToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** The address people should open for a server bound to `hostname`: any loopback or wildcard bind is `localhost`. */
export function displayUrl(hostname: string, port: number): string {
  const shown = isLoopbackHost(hostname) || hostname === '0.0.0.0' || hostname === '::' ? 'localhost' : hostname.includes(':') ? `[${hostname}]` : hostname;
  return `http://${shown}:${port}`;
}

/** runtime.json as written, or null if it's missing or not ours. `running` is whether its process is still alive. */
export function readRuntime(dataDir: string): (RuntimeRecord & { running: boolean }) | null {
  let r: Partial<RuntimeRecord>;
  try {
    r = JSON.parse(fs.readFileSync(homePaths(dataDir).runtime, 'utf8')) as Partial<RuntimeRecord>;
  } catch {
    return null;
  }
  if (!Number.isInteger(r.pid) || !Number.isInteger(r.port) || typeof r.url !== 'string' || typeof r.mcpToken !== 'string' || !TOKEN.test(r.mcpToken)) return null;
  let running = true;
  try {
    process.kill(r.pid!, 0);
  } catch (e) {
    running = (e as NodeJS.ErrnoException).code === 'EPERM';
  }
  return { ...(r as RuntimeRecord), running };
}

/** The running server's runtime.json: the token is loaded (or made) at construction; write() records where we listen. */
export class Runtime {
  private token: string;
  private record: Omit<RuntimeRecord, 'mcpToken'> | null = null;

  constructor(private readonly dataDir: string) {
    let prev: unknown;
    try {
      prev = JSON.parse(fs.readFileSync(homePaths(dataDir).runtime, 'utf8'));
    } catch {
      /* none yet, or unreadable: a new token */
    }
    const t = (prev as Partial<RuntimeRecord> | undefined)?.mcpToken;
    this.token = typeof t === 'string' && TOKEN.test(t) ? t : newToken();
  }

  /** The current MCP bearer token. */
  mcpToken(): string {
    return this.token;
  }

  /** Where this server listens (`http://localhost:2724`), once it does. */
  url(): string | null {
    return this.record?.url ?? null;
  }

  /** Record that this process is serving on `port` (after it's bound). */
  write(r: Omit<RuntimeRecord, 'mcpToken'>): void {
    this.record = r;
    this.persist();
  }

  /** A new token, written at once: the old one stops working on the next request. Returns it. */
  rotate(): string {
    this.token = newToken();
    if (this.record) this.persist();
    return this.token;
  }

  private persist(): void {
    atomicWrite(homePaths(this.dataDir).runtime, JSON.stringify({ ...this.record!, mcpToken: this.token } satisfies RuntimeRecord, null, 2) + '\n', { mode: 0o600 });
  }
}

/**
 * Compare a presented token with the real one in constant time (Paddock's management-auth.ts). Hashing first makes
 * the lengths equal, so timingSafeEqual never throws and the length itself doesn't leak. For /mcp (PR9).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hb = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb);
}
