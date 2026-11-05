// From edspencer/cli-contract reference/registry.ts @ 0.2; local changes: no default `fetch`: BragDoc's requests go
// through egress.ts (D9, D87), so the caller passes `Egress.registry()`'s, and none given is an error rather than a
// bare `globalThis.fetch`.
//
// The npm registry, as `update` asks it (SPEC §5 step 3): two requests with `fetch` and a 10-second abort.
//
//   GET <registry>/-/package/<name>/dist-tags   which version `latest` (or `--to <tag>`) is
//   GET <registry>/<name>/<version>             that version's `engines`
//
// Not `npm view`: that's a second of start-up to read two small documents, through a program whose output isn't a
// contract. Only `update`, `update --check` and `doctor` call this, and only when a person runs them (SPEC §3).
// Node built-ins only.

import { noFetch, type Fetch } from './health.js';

/** SPEC §5: 10 seconds for each request. */
export const REGISTRY_TIMEOUT_MS = 10_000;

export const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

export interface RegistryOptions {
  packageName: string;
  /** The base URL; a trailing slash is fine. */
  registry: string;
  fetch?: Fetch;
  timeoutMs?: number;
}

/**
 * Which registry to ask: `npm_config_registry`, else `npm config get registry`, else the public one (SPEC §5 step 3).
 * The variable comes first because it's how npm itself takes the setting, so a test and a real `.npmrc` arrive the
 * same way.
 */
export function resolveRegistry(env: NodeJS.ProcessEnv, npmConfigGet?: (key: string) => string | undefined): string {
  const fromEnv = env.npm_config_registry ?? env.NPM_CONFIG_REGISTRY;
  if (fromEnv !== undefined && fromEnv.trim() !== '') return fromEnv.trim();
  const fromNpm = npmConfigGet?.('registry')?.trim();
  if (fromNpm !== undefined && fromNpm !== '' && fromNpm !== 'undefined') return fromNpm;
  return DEFAULT_REGISTRY;
}

/** Joins path parts onto the registry, writing a scoped name's `/` as `%2f` (SPEC §5 step 3). Both routes take it. */
export function registryUrl(registry: string, ...parts: string[]): string {
  return `${registry.replace(/\/+$/, '')}/${parts.map((p) => p.replace(/\//g, '%2f')).join('/')}`;
}

/** Anything that went wrong talking to the registry, with the URL, as one reportable error. */
export class RegistryError extends Error {
  override name = 'RegistryError';
  readonly url: string;
  constructor(url: string, message: string) {
    super(message);
    this.url = url;
  }
}

async function getJson<T>(url: string, o: RegistryOptions): Promise<T> {
  const timeoutMs = o.timeoutMs ?? REGISTRY_TIMEOUT_MS;
  let res: Response;
  try {
    res = await (o.fetch ?? noFetch)(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json' } });
  } catch (err) {
    const name = (err as { name?: string }).name;
    const why = name === 'TimeoutError' || name === 'AbortError' ? `no answer within ${timeoutMs / 1000} seconds` : ((err as Error).message ?? String(err));
    throw new RegistryError(url, `couldn't reach the registry: ${why}`);
  }
  if (res.status === 404) throw new RegistryError(url, 'the registry has no such package or version');
  if (!res.ok) throw new RegistryError(url, `the registry answered HTTP ${res.status}`);
  try {
    return (await res.json()) as T;
  } catch {
    throw new RegistryError(url, "the registry's answer isn't JSON");
  }
}

/** `{ latest: "0.81.0", next: "0.82.0-rc.1" }`. */
export async function fetchDistTags(o: RegistryOptions): Promise<Record<string, string>> {
  const url = registryUrl(o.registry, '-', 'package', o.packageName, 'dist-tags');
  const tags: Record<string, string> = {};
  for (const [k, v] of Object.entries(await getJson<Record<string, unknown>>(url, o))) if (typeof v === 'string') tags[k] = v;
  if (Object.keys(tags).length === 0) throw new RegistryError(url, 'the registry lists no dist-tags');
  return tags;
}

export interface PackageManifest {
  name?: string;
  version?: string;
  engines?: { node?: string };
}

/** One version's manifest, read for `engines`. */
export function fetchManifest(o: RegistryOptions & { version: string }): Promise<PackageManifest> {
  return getJson<PackageManifest>(registryUrl(o.registry, o.packageName, o.version), o);
}

export interface ResolvedTarget {
  version: string;
  /** The dist-tag asked for, or null when `--to` named a version. */
  tag: string | null;
  /** The target's `engines.node`. */
  engines: string | null;
}

/**
 * `--to` (or `latest` without it) as one version, with its `engines`. A version and a tag are told apart by shape:
 * anything that looks like a version is one. Asking first would be wrong, since a registry may serve a manifest for a
 * tag's name too, and `--to next` would then install `next` while reporting it as a version called "next".
 */
export async function resolveTarget(o: RegistryOptions & { to?: string }): Promise<ResolvedTarget> {
  const to = o.to?.trim();
  let version: string;
  let tag: string | null;
  if (to !== undefined && /^v?\d+\.\d+\.\d+/.test(to)) {
    version = to.replace(/^v/, '');
    tag = null;
  } else {
    tag = to ?? 'latest';
    const tags = await fetchDistTags(o);
    const resolved = tags[tag];
    if (resolved === undefined) {
      const url = registryUrl(o.registry, '-', 'package', o.packageName, 'dist-tags');
      throw new RegistryError(url, `no dist-tag \`${tag}\` (the registry has: ${Object.keys(tags).sort().join(', ')})`);
    }
    version = resolved;
  }
  const manifest = await fetchManifest({ ...o, version });
  return { version, tag, engines: manifest.engines?.node ?? null };
}
