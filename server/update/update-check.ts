// From edspencer/cli-contract reference/update-check.ts @ 1.0; local changes: none.
//
// `<home>/update-check.json`: what the last registry question found (SPEC §3). Only `update`, `update --check` and
// `doctor` ask the registry; they write the answer here, and `service status` repeats it without opening a socket.
// It's the document `update --check --json` prints (`schemas/update-check.schema.json`), and `service status --json`'s
// `update` is a projection of it. Node built-ins only.

import fs from 'node:fs';
import path from 'node:path';
import type { InstallMethod } from './install-method.js';

export const UPDATE_CHECK_FILE = 'update-check.json';

export function updateCheckPath(home: string): string {
  return path.join(home, UPDATE_CHECK_FILE);
}

/** `update --check --json`, and the cached copy. */
export interface UpdateCheck {
  name: string;
  current: string;
  target: string;
  /** The dist-tag asked for, or null when `--to` named a version. */
  tag: string | null;
  updateAvailable: boolean;
  installMethod: InstallMethod;
  canUpdate: boolean;
  /** `<tool> update`, or the command this install needs instead; null once there's nothing to do. */
  command: string | null;
  engines: string | null;
  nodeOk: boolean;
  changelog: string | null;
  /** ISO 8601. */
  checkedAt: string;
}

/** `service status --json`'s `update` (`schemas/service-status.schema.json`). */
export interface UpdateSummary {
  latest: string;
  updateAvailable: boolean;
  checkedAt: string;
}

/**
 * Writes the cache atomically, so `status` never reads half a file and says nothing. It never throws: a cache that
 * couldn't be written isn't a failed update.
 */
export function writeUpdateCheck(home: string, check: UpdateCheck): void {
  try {
    fs.mkdirSync(home, { recursive: true });
    const file = updateCheckPath(home);
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(check, null, 2)}\n`, { mode: 0o600 });
    try {
      fs.renameSync(tmp, file);
    } catch (err) {
      fs.rmSync(tmp, { force: true });
      throw err;
    }
  } catch {
    // best effort
  }
}

/** The cache, or null when there isn't one (or it isn't one). */
export function readUpdateCheck(home: string): UpdateCheck | null {
  try {
    const raw = JSON.parse(fs.readFileSync(updateCheckPath(home), 'utf8')) as Partial<UpdateCheck>;
    if (
      typeof raw.name === 'string' &&
      typeof raw.current === 'string' &&
      typeof raw.target === 'string' &&
      typeof raw.updateAvailable === 'boolean' &&
      typeof raw.checkedAt === 'string'
    ) {
      return raw as UpdateCheck;
    }
  } catch {
    // missing, half-written, or something else's
  }
  return null;
}

/**
 * How long a cached answer is worth repeating: long enough for "I checked on Monday, it's Friday", short enough that
 * `status` doesn't advertise a version that's since been superseded twice.
 */
export const UPDATE_CHECK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * What `service status` repeats, or undefined when there's nothing worth repeating: no cache, a cache for another
 * version than this one, or one that's too old. Leave `update` out of `status --json` then: the schema types it as an
 * object, so it's absent, never null.
 */
export function updateSummary(home: string, o: { now?: number; maxAgeMs?: number; currentVersion?: string } = {}): UpdateSummary | undefined {
  const check = readUpdateCheck(home);
  if (check === null) return undefined;
  if (o.currentVersion !== undefined && check.current !== o.currentVersion) return undefined;
  const at = Date.parse(check.checkedAt);
  if (!Number.isFinite(at) || (o.now ?? Date.now()) - at > (o.maxAgeMs ?? UPDATE_CHECK_MAX_AGE_MS)) return undefined;
  return { latest: check.target, updateAvailable: check.updateAvailable, checkedAt: check.checkedAt };
}

export interface NoticeInput {
  name: string;
  current: string;
  target: string;
  /** `<tool> update`, or the command this install needs instead. */
  command: string;
  /** What goes in brackets after it: `the global folder isn't writable`. */
  note?: string;
  changelog?: string | null;
}

/**
 * SPEC §3's notice, for the caller to put on stderr:
 *
 * ```
 * Paddock 0.80.0 is available (you have 0.79.1).
 *   Run: paddock update
 *   Changes: https://github.com/edspencer/paddock/releases/tag/v0.80.0
 * ```
 */
export function updateNotice(o: NoticeInput): string {
  const lines = [`${o.name} ${o.target} is available (you have ${o.current}).`, `  Run: ${o.command}${o.note !== undefined ? `    (${o.note})` : ''}`];
  if (o.changelog !== undefined && o.changelog !== null) lines.push(`  Changes: ${o.changelog}`);
  return lines.join('\n');
}
