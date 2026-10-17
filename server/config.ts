// config.yaml: BragDoc's settings, validated with Zod (SPEC R2). Every key is optional with a default, so a missing or
// empty file is a valid one. The file is read, never rewritten: home.ts writes the starter copy once, and after that
// it's the user's (and later the Settings pages', through the store).
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

/** The config.yaml format this build writes and understands. Bump only when an old reader would get it wrong. */
export const CONFIG_SCHEMA_VERSION = 1;

/** A hostname as the Host check compares it: lower case, no port, IPv6 in brackets (`[fd00::1]`). */
export function normalizeHostname(h: string): string {
  let s = h.trim().toLowerCase();
  if (s.startsWith('[')) return s.slice(0, s.indexOf(']') + 1);
  if ((s.match(/:/g) ?? []).length > 1) return `[${s}]`; // a bare IPv6 address
  s = s.replace(/:\d*$/, '');
  return s;
}

export const ConfigSchema = z.object({
  schemaVersion: z.number().int().optional(),
  /** Hostnames BragDoc answers to besides loopback: for Docker or a reverse proxy (SPEC R3). */
  allowedHosts: z.array(z.string().trim().min(1)).default([]),
  mcp: z
    .object({
      /** Where achievements from MCP agents go: straight onto the board (D11's default) or into Found. */
      writeTo: z.enum(['board', 'found']).default('board'),
    })
    .prefault({}),
  sources: z
    .object({
      github: z
        .object({
          enabled: z.boolean().default(false),
          /** `gh`: the GitHub CLI's own login (its traffic is logged as "via gh CLI"). `token`: a PAT in secrets.yaml. */
          auth: z.enum(['gh', 'token']).default('gh'),
        })
        .prefault({}),
    })
    .prefault({}),
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
    auth: gh       # gh (the GitHub CLI's login) or token (a personal access token in secrets.yaml)
`;

/** config.yaml was written by a newer BragDoc: refuse to start (the CLI prints the message and exits 1). */
export class ConfigFromTheFuture extends Error {}

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
    return { ok: false, future: false, message: `${file} isn't valid YAML: ${(e as Error).message.split('\n')[0]}` };
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

  private refresh(boot: boolean): void {
    let stamp: string;
    let text: string;
    try {
      const st = fs.statSync(this.file);
      stamp = `${st.ino}:${st.size}:${st.mtimeMs}`;
      if (stamp === this.stamp) return;
      text = fs.readFileSync(this.file, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      // no config.yaml: the defaults (a fresh home before home.ts has run, or a deleted file)
      if (this.stamp === 'missing') return;
      this.stamp = 'missing';
      this.set(DEFAULT_CONFIG, null, boot);
      return;
    }
    this.stamp = stamp;
    const r = parseConfig(text, this.file);
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
