// The GitHub source (SPEC R7, D15): the pull requests you merged become candidates in Found. No AI: a PR is a
// candidate because you opened it, it was merged, and it's somewhere you asked BragDoc to look. Those are the rules
// its card shows.
//
// Two ways in, both opt-in (D29):
// - **gh** (preferred): the GitHub CLI's own login, so BragDoc stores no secret. `gh auth status` when you connect,
//   then `gh search prs --author=@me --merged --merged-at=<from>..<to> --json …`. gh makes its own requests, outside
//   this process, so each run is logged as "via gh CLI" (Egress.logProcess): all we can honestly record is that we ran it.
// - **token**: a fine-grained personal access token, kept in secrets.yaml (0600), checked with `GET /user`, then the
//   REST search API (`/search/issues?q=is:pr is:merged author:<login> merged:<from>..<to>`), through egress like every
//   other request. api.github.com is on the allow-list only while this is connected (egress.ts).
//
// What it searches: merged on or after a cursor (the first check looks back `lookBackDays`, 90 by default), optionally
// only in some owners or repositories (`repos`, D57). GitHub's search returns at most 1,000 results per query, so a
// window that comes back full is split in two and each half searched again (windowed pagination). Each PR becomes one
// candidate keyed `github_pr:owner/repo#n` (prKey), so a PR already in Found, dismissed (D56), or on the board is never
// added again: run it twice and the second run adds nothing. A repository BragDoc doesn't know yet is added to repos/,
// untracked, so the candidate can say where it's from.
//
// When it runs: when you connect, when you press Check now, and every hour while BragDoc runs only if you turned that on
// (D57). One check at a time. When GitHub says "too many requests", it waits until GitHub says it may ask again (or,
// if it doesn't say, a backoff that doubles up to 6 hours) and a scheduled check skips until then.
//
// Its state (the cursor, the last check, the backoff) lives in cache/sources/github.json: derived and deletable. Without
// it the next check simply looks back the whole window again, and finds nothing new.
//
// Adapted from the old app's *idea* of which gh flags to use (D2: no code carried over), and Hallway's scheduler shape
// (a short ticker that asks "is a run due?", unref'd so it never holds the process open).
import fs from 'node:fs';
import path from 'node:path';
import type { GithubConnectRequest, GithubError, GithubErrorCode, GithubRun, GithubSettingsRequest, GithubSourceStatus } from '../../shared/api.js';
import { githubRepoOf, prKey, type PrRef } from '../../shared/links.js';
import { atomicWrite } from '../atomic.js';
import { ConfigWriteError, GITHUB_SCOPE_RE, type ConfigStore } from '../config.js';
import { EgressDenied, type Egress } from '../egress.js';
import type { EventBus } from '../events.js';
import { homePaths } from '../home.js';
import type { LinkPreviews, PrDetails } from '../link-preview.js';
import { ProcError, resolveBin, run, type RunResult } from '../proc.js';
import type { Secrets } from '../secrets.js';
import type { Services } from '../services/index.js';
import type { Store } from '../store/index.js';

/** GitHub's search answers at most this many results for one query. */
export const SEARCH_CAP = 1000;
const PER_PAGE = 100;
/** How often the scheduler asks whether an hourly check is due. */
const TICK_MS = 60_000;
const HOUR_MS = 60 * 60 * 1000;
/** Backoff when GitHub rate-limits without saying until when: 15 minutes, doubling, at most 6 hours. */
const BACKOFF_MS = 15 * 60 * 1000;
const BACKOFF_MAX_MS = 6 * HOUR_MS;
/** A PR's description, as it goes into the achievement's body, is cut at this length. */
const BODY_MAX = 4000;
const API = 'https://api.github.com';
const GH_TIMEOUT_MS = 60_000;
const HTTP_TIMEOUT_MS = 20_000;

/** Something went wrong talking to GitHub, said plainly (GithubError in shared/api.ts). */
export class GithubSourceError extends Error {
  constructor(
    readonly code: GithubErrorCode | 'not_connected' | 'invalid' | 'config_invalid',
    message: string,
    readonly retryAt?: string,
  ) {
    super(message);
    this.name = 'GithubSourceError';
  }

  toJSON(): GithubError {
    return { code: this.code as GithubErrorCode, message: this.message, ...(this.retryAt ? { retryAt: this.retryAt } : {}) };
  }
}

const err = (code: GithubSourceError['code'], message: string, retryAt?: string) => new GithubSourceError(code, message, retryAt);

/** The plain-words message for each failure (the card shows it; docs/decisions.md D57 lists them). */
export const MESSAGES = {
  gh_missing: 'The GitHub CLI (gh) isn’t installed, or BragDoc can’t find it on its PATH. Install it from cli.github.com and run “gh auth login”, or connect with a token instead.',
  gh_logged_out: 'The GitHub CLI isn’t logged in. Run “gh auth login” in a terminal, then try again.',
  token_missing: 'There’s no GitHub token in secrets.yaml any more. Connect again with a token.',
  token_invalid: 'GitHub didn’t accept the token: it may have expired or been revoked. Make a new one and connect again.',
  token_scope: 'GitHub refused: this token can’t read pull requests. Give it read-only access to “Pull requests” (and “Metadata”) on the repositories you want, or make a new one.',
  offline: 'Couldn’t reach GitHub. Are you offline? Nothing was changed; try again when you’re connected.',
} as const;

/** A merged pull request, as either way of searching returns it. */
export interface MergedPr {
  /** owner/repo, as GitHub spells it. */
  repo: string;
  number: number;
  title: string;
  url: string;
  body?: string;
  /** ISO time. */
  mergedAt: string;
}

/** Where to look: owners (`acme`) and repositories (`acme/app`). Both empty: everywhere. */
export interface Scope {
  owners: string[];
  repos: string[];
}

export interface SearchPage {
  items: MergedPr[];
  /** False when GitHub had more than it would return for this query (the window is split and searched again). */
  complete: boolean;
}

/** One way of talking to GitHub (the gh CLI or a token). Every method counts the requests it makes in `requests`. */
interface Client {
  requests: number;
  whoami(): Promise<string | null>;
  search(from: string, to: string, scope: Scope): Promise<SearchPage>;
  pr(pr: PrRef, signal: AbortSignal): Promise<PrDetails | null>;
}

/** The state the source keeps between checks (cache/sources/github.json). */
interface State {
  cursor: string | null;
  login: string | null;
  lastRun: GithubRun | null;
  retryAt: string | null;
  /** Rate limits in a row without GitHub saying until when: the backoff doubles each time. */
  strikes: number;
}

const EMPTY_STATE: State = { cursor: null, login: null, lastRun: null, retryAt: null, strikes: 0 };

// ---------------------------------------------------------------- dates

/** YYYY-MM-DD of a time, in UTC (GitHub's search qualifiers are UTC dates). */
const utcDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (date: string, n: number) => utcDate(new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000));
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** The calendar day of an ISO time in a time zone (the profile's), else the machine's. */
function dayIn(iso: string, tz: string | undefined): string {
  const opts = { year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  try {
    return new Intl.DateTimeFormat('en-CA', { ...opts, timeZone: tz }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat('en-CA', opts).format(new Date(iso));
  }
}

// ---------------------------------------------------------------- scope

/** `sources.github.repos` as owners and repos, lower case, without duplicates. */
export function scopeOf(entries: readonly string[]): Scope {
  const owners = new Set<string>();
  const repos = new Set<string>();
  for (const e of entries) {
    const v = e.trim().toLowerCase();
    if (!GITHUB_SCOPE_RE.test(v)) continue;
    (v.includes('/') ? repos : owners).add(v);
  }
  return { owners: [...owners], repos: [...repos] };
}

const inScope = (repo: string, s: Scope) => {
  const r = repo.toLowerCase();
  return (!s.owners.length && !s.repos.length) || s.repos.includes(r) || s.owners.includes(r.split('/')[0]!);
};

/**
 * Search every window from `from` to `to`, splitting any window GitHub couldn't return in full (more than SEARCH_CAP
 * results) in two, down to a single day. A single day with more than that is taken as far as GitHub goes.
 */
export async function windowedSearch(search: (from: string, to: string) => Promise<SearchPage>, from: string, to: string): Promise<MergedPr[]> {
  const page = await search(from, to);
  const days = daysBetween(from, to);
  if (page.complete || days <= 0) return page.items;
  const mid = addDays(from, Math.floor(days / 2));
  return [...(await windowedSearch(search, from, mid)), ...(await windowedSearch(search, addDays(mid, 1), to))];
}

// ---------------------------------------------------------------- gh

/** gh's own words for a failure → which failure it is. */
export function classifyGh(stderr: string): GithubSourceError {
  const s = stderr.trim();
  const first = s.split('\n').find((l) => l.trim())?.trim() ?? 'gh failed without saying why';
  if (/not logged in|gh auth login|authentication required|no oauth token|HTTP 401|bad credentials|token .* is (?:invalid|expired)/i.test(s)) return err('gh_logged_out', MESSAGES.gh_logged_out);
  if (/rate limit|HTTP 429|abuse detection/i.test(s)) return err('rate_limited', 'GitHub says BragDoc has asked too often (through gh). It will wait before asking again.');
  if (/error connecting to|could not resolve|no such host|dial tcp|connection refused|network is unreachable|i\/o timeout|TLS handshake timeout|timeout awaiting/i.test(s)) return err('offline', MESSAGES.offline);
  if (/HTTP 403|Resource not accessible/i.test(s)) return err('token_scope', `GitHub refused gh’s request: ${first.replace(/^(?:gh: )?/, '')}`);
  return err('failed', `gh said: ${first.slice(0, 300)}`);
}

/** The account in `gh auth status`'s output (it has said "as <login>" and, since 2.40, "account <login>"). */
export function ghLogin(out: string): string | null {
  return /Logged in to \S+ (?:account|as) ([A-Za-z0-9-]+)/.exec(out)?.[1] ?? null;
}

interface GhPr {
  number: number;
  title: string;
  url: string;
  body?: string;
  closedAt?: string;
  repository?: { nameWithOwner?: string; name?: string };
}

class GhClient implements Client {
  requests = 0;
  constructor(
    private readonly egress: Egress,
    private readonly env: NodeJS.ProcessEnv,
  ) {}

  private async gh(purpose: string, args: string[], timeoutMs = GH_TIMEOUT_MS): Promise<RunResult> {
    this.requests++;
    let r: RunResult;
    try {
      r = await run('gh', args, { env: this.env, timeoutMs });
    } catch (e) {
      const pe = e as ProcError;
      this.egress.logProcess({ purpose, bin: 'gh', args, exitCode: null, error: pe.message });
      if (pe.code === 'not_found') throw err('gh_missing', MESSAGES.gh_missing);
      if (pe.code === 'timeout') throw err('offline', 'gh took too long to answer. Are you offline? Try again when you’re connected.');
      throw err('failed', `gh couldn’t run: ${pe.message}`);
    }
    this.egress.logProcess({ purpose, bin: 'gh', args, exitCode: r.code, ...(r.code ? { error: r.stderr.trim().split('\n')[0]?.slice(0, 200) || `exit ${r.code}` } : {}) });
    return r;
  }

  async whoami(): Promise<string | null> {
    const r = await this.gh('github.auth', ['auth', 'status', '--hostname', 'github.com']);
    if (r.code !== 0) throw classifyGh(r.stderr || r.stdout);
    return ghLogin(`${r.stdout}\n${r.stderr}`);
  }

  async search(from: string, to: string, scope: Scope): Promise<SearchPage> {
    const args = ['search', 'prs', '--author=@me', '--merged', `--merged-at=${from}..${to}`, `--limit=${SEARCH_CAP}`, '--json=number,title,url,repository,closedAt,body'];
    for (const o of scope.owners) args.push(`--owner=${o}`);
    for (const r of scope.repos) args.push(`--repo=${r}`);
    const r = await this.gh('github.search', args);
    if (r.code !== 0) throw classifyGh(r.stderr || r.stdout);
    let raw: unknown;
    try {
      raw = JSON.parse(r.stdout || '[]');
    } catch {
      throw err('failed', 'gh answered with something that isn’t JSON. Is it an old version? BragDoc needs gh 2.20 or newer.');
    }
    if (!Array.isArray(raw)) throw err('failed', 'gh answered with something BragDoc didn’t expect.');
    // gh has no merged time in `search prs` (only closedAt): for a merged PR, it's when it was merged
    const items = (raw as GhPr[]).flatMap((p): MergedPr[] => {
      const repo = p.repository?.nameWithOwner ?? /github\.com\/([^/]+\/[^/]+)\/pull\//.exec(p.url ?? '')?.[1];
      return repo && Number.isInteger(p.number) && p.title && p.url && p.closedAt ? [{ repo, number: p.number, title: p.title, url: p.url, body: p.body, mergedAt: p.closedAt }] : [];
    });
    return { items, complete: raw.length < SEARCH_CAP };
  }

  async pr(pr: PrRef): Promise<PrDetails | null> {
    const r = await this.gh('github.pr', ['pr', 'view', String(pr.number), `--repo=${pr.fullName}`, '--json=title,mergedAt,additions,deletions'], 5000);
    if (r.code !== 0) {
      if (/could not resolve to a pullrequest|not found|HTTP 404/i.test(r.stderr)) return null;
      throw classifyGh(r.stderr);
    }
    const j = JSON.parse(r.stdout) as { title?: string; mergedAt?: string; additions?: number; deletions?: number };
    return j.title ? { title: j.title, ...(j.mergedAt ? { mergedAt: j.mergedAt } : {}), additions: j.additions, deletions: j.deletions } : null;
  }
}

// ---------------------------------------------------------------- token (REST, through egress)

interface SearchItem {
  number: number;
  title: string;
  html_url: string;
  body?: string | null;
  closed_at?: string | null;
  repository_url?: string;
  pull_request?: { merged_at?: string | null; html_url?: string };
}

class TokenClient implements Client {
  requests = 0;
  constructor(
    private readonly egress: Egress,
    private readonly token: string,
    private login: string | null,
  ) {}

  private async get(purpose: string, pathAndQuery: string, signal?: AbortSignal): Promise<Response> {
    this.requests++;
    let res: Response;
    try {
      res = await this.egress.egressFetch({ purpose }, `${API}${pathAndQuery}`, {
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${this.token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'bragdoc-local' },
        signal: signal ?? AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
    } catch (e) {
      if (e instanceof EgressDenied) throw err('failed', e.message);
      if ((e as Error).name === 'AbortError' && signal?.aborted) throw e;
      throw err('offline', (e as Error).name === 'TimeoutError' ? 'GitHub didn’t answer in time. Are you offline? Try again when you’re connected.' : MESSAGES.offline);
    }
    if (res.ok) return res;
    throw await httpError(res);
  }

  async whoami(): Promise<string | null> {
    const j = (await (await this.get('github.user', '/user')).json()) as { login?: string };
    this.login = j.login ?? null;
    return this.login;
  }

  async search(from: string, to: string, scope: Scope): Promise<SearchPage> {
    const login = this.login ?? (await this.whoami());
    const q = ['is:pr', 'is:merged', `author:${login ?? '@me'}`, `merged:${from}..${to}`, ...scope.owners.map((o) => `user:${o}`), ...scope.repos.map((r) => `repo:${r}`)].join(' ');
    const items: MergedPr[] = [];
    let total = 0;
    for (let page = 1; page <= SEARCH_CAP / PER_PAGE; page++) {
      const res = await this.get('github.search', `/search/issues?q=${encodeURIComponent(q)}&per_page=${PER_PAGE}&page=${page}`);
      const j = (await res.json()) as { total_count?: number; items?: SearchItem[] };
      total = j.total_count ?? 0;
      // more than GitHub will page through: say so at once, and the window is split, rather than fetch ten pages to
      // throw away (the search API allows 30 requests a minute)
      if (total > SEARCH_CAP) return { items: [], complete: false };
      const got = j.items ?? [];
      for (const it of got) {
        const repo = /\/repos\/([^/]+\/[^/]+)$/.exec(it.repository_url ?? '')?.[1];
        const mergedAt = it.pull_request?.merged_at ?? it.closed_at;
        if (repo && it.title && mergedAt) items.push({ repo, number: it.number, title: it.title, url: it.pull_request?.html_url ?? it.html_url, body: it.body ?? undefined, mergedAt });
      }
      if (got.length < PER_PAGE || page * PER_PAGE >= total) break;
    }
    return { items, complete: total <= SEARCH_CAP };
  }

  async pr(pr: PrRef, signal: AbortSignal): Promise<PrDetails | null> {
    try {
      const j = (await (await this.get('github.pr', `/repos/${pr.fullName}/pulls/${pr.number}`, signal)).json()) as { title?: string; merged_at?: string | null; additions?: number; deletions?: number };
      return j.title ? { title: j.title, ...(j.merged_at ? { mergedAt: j.merged_at } : {}), additions: j.additions, deletions: j.deletions } : null;
    } catch (e) {
      if (e instanceof GithubSourceError && e.code === 'failed' && /\b404\b/.test(e.message)) return null;
      throw e;
    }
  }
}

/** A GitHub API error response → which failure it is. */
export async function httpError(res: Response): Promise<GithubSourceError> {
  let message = '';
  try {
    message = ((await res.json()) as { message?: string }).message ?? '';
  } catch {
    /* not JSON */
  }
  if (res.status === 401) return err('token_invalid', MESSAGES.token_invalid);
  const remaining = res.headers.get('x-ratelimit-remaining');
  const retryAfter = Number(res.headers.get('retry-after'));
  if (res.status === 429 || (res.status === 403 && (remaining === '0' || retryAfter > 0 || /rate limit/i.test(message)))) {
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    const at = retryAfter > 0 ? new Date(Date.now() + retryAfter * 1000) : reset > 0 ? new Date(reset * 1000) : null;
    return err('rate_limited', 'GitHub says BragDoc has asked too often. It will wait before asking again.', at?.toISOString());
  }
  if (res.status === 403) return err('token_scope', MESSAGES.token_scope);
  if (res.status === 422) return err('failed', `GitHub couldn’t run that search: ${message || 'it said the query was invalid'}. Check the owners and repositories you picked.`);
  return err('failed', `GitHub answered ${res.status}${message ? `: ${message}` : ''}.`);
}

// ---------------------------------------------------------------- the source

export interface GithubSourceOptions {
  dataDir: string;
  config: ConfigStore;
  egress: Egress;
  secrets: Secrets;
  store: Store;
  services: Services;
  bus: EventBus;
  linkPreviews: LinkPreviews;
  /** The environment gh runs with (its PATH, its HOME and so its login). */
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
}

export class GithubSource {
  private readonly file: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly now: () => Date;
  private running: Promise<GithubRun> | null = null;
  /**
   * Bumped by connect, disconnect and a change of where or how far back to look. A check that started under an older
   * generation finishes without adding candidates or moving the cursor: its search no longer matches the settings.
   */
  private generation = 0;

  constructor(private readonly o: GithubSourceOptions) {
    this.file = path.join(homePaths(o.dataDir).cache, 'sources', 'github.json');
    this.env = o.env ?? process.env;
    this.now = o.now ?? (() => new Date());
    // POST /api/link-preview asks GitHub for a pasted PR's title while (and only while) the source is connected
    o.linkPreviews.setGithub(
      (pr, signal) => this.client().pr(pr, signal),
      () => this.settings().enabled,
    );
  }

  private settings() {
    return this.o.config.get().sources.github;
  }

  // ---- state (cache/sources/github.json)

  private state(): State {
    try {
      const j = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<State>;
      return { ...EMPTY_STATE, ...j };
    } catch {
      return { ...EMPTY_STATE };
    }
  }

  private save(patch: Partial<State>): void {
    const next = { ...this.state(), ...patch };
    try {
      atomicWrite(this.file, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
    } catch (e) {
      process.stderr.write(`bragdoc: couldn't save the GitHub source's state: ${(e as Error).message}\n`);
    }
    this.o.bus.emit({ type: 'sources' });
  }

  /** The card's view of it. */
  status(): GithubSourceStatus {
    const c = this.settings();
    const s = this.state();
    const retryAt = s.retryAt && Date.parse(s.retryAt) > this.now().getTime() ? s.retryAt : null;
    return {
      enabled: c.enabled,
      auth: c.auth,
      lookBackDays: c.lookBackDays,
      repos: c.repos,
      hourly: c.hourly,
      login: s.login,
      hasToken: this.o.secrets.githubToken() !== null,
      running: this.running !== null,
      lastRun: s.lastRun,
      cursor: s.cursor,
      nextRunAt: c.enabled && c.hourly ? this.nextDue(s).toISOString() : null,
      retryAt,
    };
  }

  /** Is gh on PATH? A look at the file system only: nothing runs, nothing is sent. */
  ghInstalled(): boolean {
    return resolveBin('gh', this.env) !== null;
  }

  private client(auth = this.settings().auth): Client {
    if (auth === 'gh') return new GhClient(this.o.egress, this.env);
    const token = this.o.secrets.githubToken();
    if (!token) throw err('token_missing', MESSAGES.token_missing);
    return new TokenClient(this.o.egress, token, this.state().login);
  }

  private update(patch: Record<string, unknown>) {
    try {
      return this.o.config.update({ sources: { github: patch } }).sources.github;
    } catch (e) {
      if (e instanceof ConfigWriteError) throw err('config_invalid', e.message);
      throw e;
    }
  }

  // ---- connect, disconnect, options

  /**
   * Connect: check that gh is logged in (or that GitHub accepts the token), switch the source on, and start the first
   * check, which looks back `lookBackDays`. Nothing is switched on if the check fails, and a token GitHub refused is not
   * kept.
   */
  async connect(req: GithubConnectRequest): Promise<GithubSourceStatus> {
    const opts = validOptions(req);
    // GitHub asked us to wait: connecting again doesn't skip that (nothing is sent until then)
    const waitUntil = this.state().retryAt;
    if (waitUntil && Date.parse(waitUntil) > this.now().getTime()) throw err('rate_limited', 'GitHub asked BragDoc to wait before asking again. Try again after the time shown.', waitUntil);
    let login: string | null;
    if (req.auth === 'gh') {
      if (!this.ghInstalled()) throw err('gh_missing', MESSAGES.gh_missing);
      login = await new GhClient(this.o.egress, this.env).whoami();
      this.update({ enabled: true, auth: 'gh', ...opts });
    } else {
      const token = typeof req.token === 'string' ? req.token.trim() : '';
      if (!/^[A-Za-z0-9_]{20,255}$/.test(token)) throw err('invalid', 'That doesn’t look like a GitHub token. Paste the whole token (it starts with github_pat_ or ghp_).');
      // the allow-list only has api.github.com while a token is connected (egress.ts), so the check runs with the
      // token in place and everything is put back as it was if GitHub says no
      const before = this.settings();
      const prevToken = this.o.secrets.githubToken();
      try {
        this.o.secrets.setGithubToken(token);
        this.update({ enabled: true, auth: 'token' });
        login = await new TokenClient(this.o.egress, token, null).whoami();
      } catch (e) {
        // the token first: whatever else fails, one GitHub didn't accept is never left behind
        try {
          this.o.secrets.setGithubToken(prevToken);
        } catch {
          /* secrets.yaml is unreadable: setGithubToken wrote nothing in the first place */
        }
        try {
          this.update({ enabled: before.enabled, auth: before.auth });
        } catch {
          /* config.yaml is broken: update() wrote nothing in the first place */
        }
        throw e;
      }
      this.update(opts);
    }
    // a fresh connection looks back the whole window again: anything already in Found, dismissed or on the board stays
    // as it is (keys), so this only finds what's new
    this.generation++;
    this.save({ login, cursor: null, retryAt: null, strikes: 0 });
    // a check still running from before finishes without effect (generation); this one starts after it
    void this.idle()
      .then(() => this.run())
      .catch(() => {}); // its outcome is on the card (lastRun), live
    return { ...this.status(), running: true };
  }

  /** Switch it off. With `forgetToken`, the token is removed from secrets.yaml too. A check that's running finishes but adds nothing. */
  disconnect({ forgetToken = false }: { forgetToken?: boolean } = {}): GithubSourceStatus {
    // the token first: if secrets.yaml can't be written, nothing has changed yet
    if (forgetToken) this.o.secrets.setGithubToken(null);
    this.update({ enabled: false });
    this.generation++;
    this.o.bus.emit({ type: 'sources' }); // a rate limit's wait is kept: reconnecting doesn't skip it
    return this.status();
  }

  /** Change how far back, where, and whether hourly. Looking somewhere new (or further back) resets the cursor. */
  updateOptions(req: GithubSettingsRequest): GithubSourceStatus {
    const opts = validOptions(req);
    if (req.hourly !== undefined) {
      if (typeof req.hourly !== 'boolean') throw err('invalid', '`hourly` is true or false');
      opts.hourly = req.hourly;
    }
    const before = this.settings();
    const after = this.update(opts);
    if (after.lookBackDays !== before.lookBackDays || JSON.stringify(after.repos) !== JSON.stringify(before.repos)) {
      this.generation++;
      this.save({ cursor: null });
    } else this.o.bus.emit({ type: 'sources' });
    return this.status();
  }

  // ---- checking

  /**
   * Check GitHub now (one check at a time: a second call while one runs gets that one's result). Throws
   * GithubSourceError for "not connected" and "GitHub asked us to wait"; anything that goes wrong while checking is in
   * the returned run's `error` (and on the card).
   */
  run(): Promise<GithubRun> {
    if (this.running) return this.running;
    const c = this.settings();
    if (!c.enabled) return Promise.reject(err('not_connected', 'GitHub isn’t connected. Connect it in Settings → Sources first.'));
    const s = this.state();
    if (s.retryAt && Date.parse(s.retryAt) > this.now().getTime())
      return Promise.reject(err('rate_limited', 'GitHub asked BragDoc to wait before asking again. Try again after the time shown.', s.retryAt));
    const p = this.check().finally(() => {
      this.running = null;
      this.o.bus.emit({ type: 'sources' });
    });
    this.running = p;
    this.o.bus.emit({ type: 'sources' });
    return p;
  }

  private async check(): Promise<GithubRun> {
    const gen = this.generation;
    const started = this.now();
    const c = this.settings();
    const st = this.state();
    const to = utcDate(started);
    const from = st.cursor && st.cursor <= to ? st.cursor : addDays(to, -c.lookBackDays);
    const scope = scopeOf(c.repos);
    const result: GithubRun = { at: started.toISOString(), finishedAt: started.toISOString(), from, to, seen: 0, added: 0, requests: 0 };
    let client: Client | null = null;
    try {
      client = this.client(c.auth);
      const found = new Map<string, MergedPr>();
      // owners and repositories are searched separately: within one query, GitHub ORs qualifiers of one kind
      const groups: Scope[] = scope.owners.length && scope.repos.length ? [{ owners: scope.owners, repos: [] }, { owners: [], repos: scope.repos }] : [scope];
      for (const g of groups) {
        const cl = client;
        for (const pr of await windowedSearch((f, t) => cl.search(f, t, g), from, to)) if (inScope(pr.repo, scope)) found.set(prKey(pr.repo, pr.number), pr);
      }
      result.seen = found.size;
      // disconnected, reconnected or pointed somewhere else while it ran: say what it saw, keep nothing, and leave the
      // cursor where the change put it
      const current = gen === this.generation && this.settings().enabled;
      // oldest first, so Found (newest first) lists the most recently merged at the top
      const byMerged = [...found].sort(([, a], [, b]) => (a.mergedAt < b.mergedAt ? -1 : a.mergedAt > b.mergedAt ? 1 : 0));
      let skipped = 0;
      if (current)
        for (const [key, pr] of byMerged) {
          // one PR that can't be added (a file that won't write) mustn't stop the rest, or every later check
          try {
            if (this.addCandidate(key, pr, scope)) result.added++;
          } catch {
            skipped++;
          }
        }
      if (skipped) result.skipped = skipped;
      result.requests = client.requests;
      result.finishedAt = this.now().toISOString();
      // the next check starts a day back: GitHub's search can lag a merge just before UTC midnight, and dedup by key makes
      // the overlap free
      this.save({ ...(current ? { cursor: addDays(to, -1) } : {}), lastRun: result, retryAt: null, strikes: 0 });
    } catch (e) {
      const ge = e instanceof GithubSourceError ? e : err('failed', `Something went wrong checking GitHub: ${(e as Error).message}`);
      result.requests = client?.requests ?? 0;
      result.finishedAt = this.now().toISOString();
      let retryAt: string | null = null;
      let strikes = 0;
      if (ge.code === 'rate_limited') {
        strikes = st.strikes + 1;
        retryAt = ge.retryAt ?? new Date(this.now().getTime() + Math.min(BACKOFF_MS * 2 ** (strikes - 1), BACKOFF_MAX_MS)).toISOString();
      }
      result.error = { code: ge.code as GithubErrorCode, message: ge.message, ...(retryAt ? { retryAt } : {}) };
      this.save({ lastRun: result, retryAt, strikes });
    }
    return result;
  }

  /** One merged PR → a candidate, unless its key is already in Found (dismissed too) or on the board. True if added. */
  private addCandidate(key: string, pr: MergedPr, scope: Scope): boolean {
    const { store, services } = this.o;
    if (store.foundIdByKey(key) || store.achievementIdByKey(key)) return false;
    const repo = this.repoFor(pr.repo);
    const name = pr.repo.toLowerCase();
    const rules = ['You opened it', 'Merged'];
    if (scope.repos.includes(name)) rules.push(`In ${pr.repo}, which you picked`);
    else if (scope.owners.includes(name.split('/')[0]!)) rules.push(`Under ${pr.repo.split('/')[0]}, which you picked`);
    else if (repo?.tracked) rules.push('In a repo you track');
    const body = pr.body?.replace(/<!--[\s\S]*?-->/g, '').trim();
    const day = dayIn(pr.mergedAt, store.profile()?.timezone);
    const r = services.found.add({
      source: 'github',
      externalKey: key,
      title: pr.title.trim().slice(0, 300) || `${pr.repo}#${pr.number}`,
      ...(body ? { body: body.length > BODY_MAX ? `${body.slice(0, BODY_MAX).trimEnd()}…` : body } : {}),
      happenedAt: day,
      evidence: [{ kind: 'github_pr', url: pr.url, externalKey: key, title: pr.title.trim().slice(0, 300), meta: { mergedAt: day } }],
      matchedRules: rules,
      suggestedProjects: repo ? services.projects.forRepo(repo.id).filter((p) => p.status !== 'archived').map((p) => p.id) : [],
      suggestedRepos: repo ? [repo.id] : [],
    });
    return r.created;
  }

  /** The repo in repos/ for owner/repo; one is added, untracked, if there's none (SPEC R6: repos come from PR discovery). */
  private repoFor(fullName: string) {
    const name = fullName.toLowerCase();
    const repos = this.o.services.repos;
    const known = repos.list().find((r) => githubRepoOf(r.remoteUrl) === name || r.name.toLowerCase() === name);
    if (known) return known;
    try {
      return repos.create({ name: fullName, remoteUrl: `https://github.com/${fullName}`, tracked: false }).repo;
    } catch {
      return undefined; // a repo file that can't be written mustn't lose the candidate
    }
  }

  // ---- the hourly check

  private nextDue(s: State): Date {
    const last = s.lastRun ? Date.parse(s.lastRun.at) : 0;
    const due = Math.max(last + HOUR_MS, s.retryAt ? Date.parse(s.retryAt) : 0);
    return new Date(Math.max(due, this.now().getTime()));
  }

  /** Is an hourly check due now? */
  due(): boolean {
    const c = this.settings();
    if (!c.enabled || !c.hourly || this.running) return false;
    const s = this.state();
    const last = s.lastRun ? Date.parse(s.lastRun.at) : 0;
    const now = this.now().getTime();
    return now >= last + HOUR_MS && !(s.retryAt && Date.parse(s.retryAt) > now);
  }

  /** Start the hourly check (it does nothing unless `hourly` is on). Returns a function that stops it. */
  start(tickMs = TICK_MS): () => void {
    const t = setInterval(() => {
      if (this.due()) void this.run().catch(() => {});
    }, tickMs);
    t.unref?.();
    return () => clearInterval(t);
  }

  /** Wait for a check that's running, if there is one (shutdown, tests). */
  async idle(): Promise<void> {
    await this.running?.catch(() => {});
  }
}

/** `lookBackDays` and `repos` from a request, checked. */
function validOptions(req: { lookBackDays?: unknown; repos?: unknown }): { lookBackDays?: number; repos?: string[]; hourly?: boolean } {
  const out: { lookBackDays?: number; repos?: string[]; hourly?: boolean } = {};
  if (req.lookBackDays !== undefined) {
    if (!Number.isInteger(req.lookBackDays) || (req.lookBackDays as number) < 1 || (req.lookBackDays as number) > 3650) throw err('invalid', 'How far back is a whole number of days, from 1 to 3650.');
    out.lookBackDays = req.lookBackDays as number;
  }
  if (req.repos !== undefined) {
    if (!Array.isArray(req.repos) || req.repos.length > 100) throw err('invalid', '`repos` is a list of owners and owner/repo names (at most 100).');
    const repos: string[] = [];
    for (const r of req.repos) {
      const v = typeof r === 'string' ? r.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$|\/$/g, '') : '';
      if (!GITHUB_SCOPE_RE.test(v)) throw err('invalid', `“${String(r)}” isn’t an owner or owner/repo (like acme or acme/app).`);
      if (!repos.some((x) => x.toLowerCase() === v.toLowerCase())) repos.push(v);
    }
    out.repos = repos;
  }
  return out;
}
