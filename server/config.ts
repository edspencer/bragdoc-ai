// config.yaml: BragDoc's settings, validated with Zod (SPEC R2). Every key is optional with a default, so a missing or
// empty file is a valid one. home.ts writes the starter copy once; after that it's the user's, and the only other
// writer is update() below, which Settings uses: a minimal edit through the store's yamldoc and safefs, so comments,
// key order and keys this build doesn't know all survive, and a broken file is never overwritten (D53).
//
// The schemaVersion downgrade guard is Paddock's (schema-version.ts, its #724): a config.yaml from a NEWER BragDoc
// refuses to boot, because reading it with this build would silently drop every key it doesn't know. Never
// lenient-parse a file from the future. An unreadable schemaVersion (`banana`, `1.5`, `0`) counts as from the future:
// we can't establish that it's safe to read.
//
// Hand edits are picked up on the next read: get() stats the file and re-reads it when it changed, so the Host
// allow-list and the egress allow-list follow edits without a restart or a watcher. An edit that doesn't validate
// keeps the last good settings and raises a notice; it never crashes the server.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import type { Notice } from '../shared/api.js';
import { tildify } from './paths.js';
import { atomicWrite } from './store/safefs.js';
import { mergePatch, parse as parseDocument, stringify } from './store/yamldoc.js';

/** The config.yaml format this build writes and understands. Bump only when an old reader would get it wrong. */
export const CONFIG_SCHEMA_VERSION = 1;

/** A hostname as the Host check compares it: lower case, no port, IPv6 in brackets (`[fd00::1]`). */
export function normalizeHostname(h: string): string {
  let s = h.trim().toLowerCase();
  // `[::1]` or `[::1]:2724`; anything else after the bracket (`[::1]evil.example`) is returned whole, and matches nothing
  if (s.startsWith('[')) return /^\[[^\]]*\](?::\d*)?$/.test(s) ? s.slice(0, s.indexOf(']') + 1) : s;
  if ((s.match(/:/g) ?? []).length > 1) return `[${s}]`; // a bare IPv6 address
  s = s.replace(/:\d*$/, '');
  return s;
}

/** One entry of `sources.github.repos`: a GitHub owner (`acme`) or repository (`acme/app`). */
export const GITHUB_SCOPE_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})(?:\/[A-Za-z0-9._-]{1,100})?$/;

/** A section written but left empty (`mcp:` with its keys commented out) is YAML null: treat it as absent, so its defaults apply. */
const section = <T extends z.ZodType>(s: T) => z.preprocess((v) => (v === null ? undefined : v), s);

export const ConfigSchema = z.object({
  schemaVersion: z.number().int().optional(),
  /** Hostnames BragDoc answers to besides loopback: for Docker or a reverse proxy (SPEC R3). */
  allowedHosts: z.array(z.string().trim().min(1)).default([]),
  mcp: section(
    z
      .object({
        /** Where achievements from MCP agents go: straight onto the board (D11's default) or into Found. */
        writeTo: z.enum(['board', 'found']).default('board'),
      })
      .prefault({}),
  ),
  sources: section(
    z
      .object({
        github: section(
          z
            .object({
              enabled: z.boolean().default(false),
              /** `gh`: the GitHub CLI's own login (its traffic is logged as "via gh CLI"). `token`: a PAT in secrets.yaml. */
              auth: z.enum(['gh', 'token']).default('gh'),
              /** How far back the first check looks, in days (SPEC R7: 90 by default). */
              lookBackDays: z.number().int().min(1).max(3650).default(90),
              /** Where to look: `owner` or `owner/repo` entries; empty means every repository you merged into (D57). */
              repos: z.array(z.string().trim().regex(GITHUB_SCOPE_RE, 'an owner or owner/repo')).default([]),
              /** Check by itself every hour while BragDoc runs. Off: only when you press Check now (D57). */
              hourly: z.boolean().default(false),
            })
            .prefault({}),
        ),
        screenshots: section(
          z
            .object({
              /** Watch `folder` for new screenshots (SPEC R7). Off until you pick a folder and turn it on. */
              enabled: z.boolean().default(false),
              /** The folder to watch: absolute, or starting with `~/`. Null until you choose one. */
              folder: z.string().trim().min(1).nullable().default(null),
              /** Only files named like screenshots ("Screenshot 2026-10-17 at 9.41.03 PM.png"); off: every picture in the folder. */
              onlyScreenshots: z.boolean().default(true),
            })
            .prefault({}),
        ),
      })
      .prefault({}),
  ),
});
export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: Config = ConfigSchema.parse({});

/** The starter config.yaml (home.ts writes it once, create-only). Every value is the default. */
export const CONFIG_TEMPLATE = `# BragDoc settings. Every key is optional: the values below are the defaults. BragDoc picks up your edits when you
# save. Secrets never go in this file: a GitHub token lives in secrets.yaml (mode 0600).
schemaVersion: ${CONFIG_SCHEMA_VERSION}

# Hostnames BragDoc answers to besides localhost, for Docker or a reverse proxy, e.g. [bragdoc.example.com].
# Also settable with BRAGDOC_ALLOWED_HOSTS (comma separated).
allowedHosts: []

mcp:
  writeTo: board   # where your agents' achievements go: board (straight on, marked as theirs) or found (to review first)

sources:
  github:
    enabled: false
    auth: gh         # gh (the GitHub CLI's login) or token (a personal access token in secrets.yaml)
    lookBackDays: 90 # how far back the first check looks
    repos: []        # owners or owner/repo to look in, e.g. [acme, my-org/my-app]; empty: everywhere you merged
    hourly: false    # check by itself every hour while BragDoc runs (off: only when you press Check now)
  screenshots:
    enabled: false
    folder: null     # the folder to watch for new screenshots, e.g. ~/Screenshots
    onlyScreenshots: true # only files named like screenshots; false: every picture in the folder
`;

/** config.yaml was written by a newer BragDoc: refuse to start (the CLI prints the message and exits 1). */
export class ConfigFromTheFuture extends Error {}

/** config.yaml's text, a stamp that changes with any edit, and its permission bits. A missing file is the template. */
function readForUpdate(file: string): { text: string; stamp: string; mode?: number } {
  try {
    const st = fs.statSync(file);
    return { text: fs.readFileSync(file, 'utf8'), stamp: `${st.ino}:${st.size}:${st.mtimeMs}`, mode: st.mode & 0o777 };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw new ConfigWriteError(`${tildify(file)} can't be read (${(e as NodeJS.ErrnoException).code ?? (e as Error).message})`);
    return { text: CONFIG_TEMPLATE, stamp: 'missing' };
  }
}

/**
 * The common case of a settings change, one existing plain value (`writeTo: board` → `found`), done by replacing just
 * that value's characters, so the rest of the file stays byte for byte (re-printing the document would also re-space
 * the template's aligned comments). Null when the patch isn't that shape: the caller re-prints the document instead.
 */
function spliceScalar(text: string, doc: ReturnType<typeof parseDocument>['doc'], patch: Record<string, unknown>): string | null {
  const keys: string[] = [];
  let v: unknown = patch;
  while (v && typeof v === 'object' && !Array.isArray(v)) {
    const entries = Object.entries(v);
    if (entries.length !== 1) return null;
    keys.push(entries[0]![0]);
    v = entries[0]![1];
  }
  if (!keys.length || !(typeof v === 'boolean' || (typeof v === 'string' && /^[a-z][a-z0-9-]*$/.test(v) && !['true', 'false', 'null', 'yes', 'no', 'on', 'off'].includes(v)))) return null;
  const node = doc.getIn(keys, true) as { type?: string; range?: [number, number, number]; anchor?: string } | undefined;
  // an anchored value may be aliased elsewhere (`other: *w`): splicing it would change those too, silently
  if (!node?.range || node.type !== 'PLAIN' || node.anchor) return null;
  return text.slice(0, node.range[0]) + String(v) + text.slice(node.range[1]);
}

/** ConfigStore.update() refused: the file is broken (or from a newer BragDoc), or the change wouldn't validate. Nothing was written. */
export class ConfigWriteError extends Error {}

/** The version a parsed file declares: absent means 1; anything but a positive integer is null (unreadable). */
export function readSchemaVersion(raw: unknown): number | null {
  if (raw === undefined || raw === null) return 1;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.trim()) : NaN;
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export type ParsedConfig = { ok: true; config: Config } | { ok: false; future: boolean; message: string };

/** Parse config.yaml's text. Pure, so every case is testable without a file. */
export function parseConfig(text: string, file = 'config.yaml'): ParsedConfig {
  let doc: unknown;
  try {
    doc = YAML.parse(text) ?? {};
  } catch (e) {
    return { ok: false, future: false, message: `${file} isn't valid YAML: ${(e as Error).message.split('\n')[0]!.replace(/:$/, '')}` };
  }
  if (typeof doc !== 'object' || Array.isArray(doc)) return { ok: false, future: false, message: `${file} should be a mapping of settings (key: value)` };
  const raw = (doc as Record<string, unknown>).schemaVersion;
  const version = readSchemaVersion(raw);
  if (version === null || version > CONFIG_SCHEMA_VERSION)
    return {
      ok: false,
      future: true,
      message:
        `${file} declares ${version === null ? `an unreadable schemaVersion (${JSON.stringify(raw)})` : `schemaVersion ${version}`}, but this BragDoc ` +
        `understands up to ${CONFIG_SCHEMA_VERSION}: it was written by a newer BragDoc. Reading it here would silently drop the settings this ` +
        `version doesn't know. Upgrade BragDoc (npm install -g @bragdoc/local@latest), or point --data-dir at another data home.`,
    };
  const r = ConfigSchema.safeParse({ ...(doc as object), schemaVersion: version });
  if (!r.success) {
    const i = r.error.issues[0]!;
    return { ok: false, future: false, message: `${file}: ${i.path.join('.') || '(top level)'}: ${i.message}` };
  }
  return { ok: true, config: r.data };
}

/** Comma-separated hostnames from BRAGDOC_ALLOWED_HOSTS. */
export function envAllowedHosts(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.BRAGDOC_ALLOWED_HOSTS ?? '').split(',').map(normalizeHostname).filter(Boolean);
}

export interface ConfigStoreOptions {
  env?: NodeJS.ProcessEnv;
  /** Called when a re-read changed the settings (the event bus's `config`). */
  onChange?: () => void;
}

/** The live settings: re-read from config.yaml when it changes on disk. */
export class ConfigStore {
  readonly file: string;
  private current: Config = DEFAULT_CONFIG;
  private stamp: string | null = null;
  private problem: string | null = null;
  private readonly envHosts: string[];
  private readonly onChange?: () => void;

  constructor(dataDir: string, { env = process.env, onChange }: ConfigStoreOptions = {}) {
    this.file = path.join(dataDir, 'config.yaml');
    this.envHosts = envAllowedHosts(env);
    this.onChange = onChange;
  }

  /** The boot-time read. Throws ConfigFromTheFuture for a file from a newer BragDoc; anything else is a notice. */
  load(): Config {
    this.refresh(true);
    return this.current;
  }

  /** The current settings, re-read first if the file changed. */
  get(): Config {
    this.refresh(false);
    return this.current;
  }

  /** Hostnames the Host and Origin checks accept besides loopback: config.yaml's plus BRAGDOC_ALLOWED_HOSTS. */
  allowedHosts(): string[] {
    return [...new Set([...this.get().allowedHosts.map(normalizeHostname), ...this.envHosts])].filter(Boolean);
  }

  /** A notice when config.yaml is broken (the last good settings stay in force), else none. */
  notices(): Notice[] {
    this.refresh(false);
    return this.problem ? [{ id: 'config-invalid', level: 'warning', message: `${this.problem.replace(/\.?$/, '.')} BragDoc is using the last settings that worked until it's fixed.` }] : [];
  }

  /**
   * Change settings: `patch` is a JSON merge patch (`{ mcp: { writeTo: 'found' } }`) applied to the file as it is on
   * disk now, so a hand edit made a moment ago is kept, along with every comment. The result must validate. Throws
   * ConfigWriteError, writing nothing, when the file is broken or from a newer BragDoc: the user's file is never
   * replaced by one they didn't write (SPEC R2). A missing file starts from the starter template. Returns the new
   * settings, which are in force at once (onChange fires).
   */
  update(patch: Record<string, unknown>): Config {
    // a config.yaml symlinked into a dotfiles repo stays a symlink: the write goes to the file it points at
    let target = this.file;
    try {
      target = fs.realpathSync(this.file);
    } catch {
      /* none yet: create it where it belongs */
    }
    // a hand edit that lands while we work is re-read and the change made again on top of it, rather than overwritten
    for (let attempt = 0; ; attempt++) {
      const read = readForUpdate(target);
      const before = parseConfig(read.text, path.basename(this.file));
      if (!before.ok) throw new ConfigWriteError(`${before.message.replace(/\.?$/, '.')} Fix it by hand first: BragDoc won't overwrite it.`);
      const p = parseDocument(read.text);
      if (p.error) throw new ConfigWriteError(`config.yaml isn't valid YAML: ${p.error.message}`); // parseConfig agreed it was; belt and braces
      let out = spliceScalar(read.text, p.doc, patch);
      if (out === null) {
        mergePatch(p.doc, patch);
        out = stringify(p.doc);
      }
      const after = parseConfig(out, path.basename(this.file));
      if (!after.ok) throw new ConfigWriteError(after.message);
      if (readForUpdate(target).stamp !== read.stamp) {
        if (attempt < 3) continue;
        throw new ConfigWriteError('config.yaml keeps changing while BragDoc tries to save it. Try again in a moment.');
      }
      atomicWrite(target, out, read.mode === undefined ? {} : { mode: read.mode }); // keeps a mode you chose (chmod 600)
      this.refresh(false);
      return this.current;
    }
  }

  private refresh(boot: boolean): void {
    let stamp: string;
    let text: string;
    try {
      const st = fs.statSync(this.file);
      stamp = `${st.ino}:${st.size}:${st.mtimeMs}`;
      if (stamp === this.stamp) return;
      text = fs.readFileSync(this.file, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        // unreadable (a directory, no permission): refuse at boot, where the message is seen; while running, this runs
        // inside every request's Host check, so it's a notice and the last good settings, never a 500 for everything
        if (boot) throw e;
        this.stamp = null; // try again next time
        this.set(this.current, `${tildify(this.file)} can't be read (${(e as NodeJS.ErrnoException).code ?? (e as Error).message})`, boot);
        return;
      }
      // no config.yaml: the defaults (a fresh home before home.ts has run, or a deleted file)
      if (this.stamp === 'missing') return;
      this.stamp = 'missing';
      this.set(DEFAULT_CONFIG, null, boot);
      return;
    }
    this.stamp = stamp;
    const r = parseConfig(text, tildify(this.file));
    if (r.ok) this.set(r.config, null, boot);
    else if (r.future && boot) throw new ConfigFromTheFuture(r.message);
    else this.set(this.current, r.message, boot);
  }

  private set(config: Config, problem: string | null, boot: boolean): void {
    const changed = JSON.stringify(config) !== JSON.stringify(this.current) || problem !== this.problem;
    this.current = config;
    this.problem = problem;
    if (changed && !boot) this.onChange?.();
  }
}
