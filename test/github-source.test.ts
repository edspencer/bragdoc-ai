// The GitHub source and Found's API (SPEC R7, PR13), against a fake gh (test/fixtures/fake-gh: invented repos, never
// the network or a real login) and, for the token path, a fake fetch behind the real egress module. Run 1 finds the
// fixture's PRs, run 2 nothing; dismissed PRs never come back and keep only a hash (D55); keep and merge reach the
// board; every failure (gh missing or logged out, a bad or under-scoped token, rate limits, offline) is a plain message
// and no crash; and Network activity lists exactly the requests made.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { FoundDecided, FoundListResponse, GithubSourceStatus, LinkPreview, NetworkLogEntry, SourcesResponse } from '../shared/api.ts';
import type { FoundCandidate } from '../shared/schema/index.ts';
import { ConfigStore } from '../server/config.ts';
import { Egress, readNetworkLog } from '../server/egress.ts';
import { EventBus } from '../server/events.ts';
import { initHome } from '../server/home.ts';
import { createAppWithContext } from '../server/index.ts';
import { classifyGh, ghLogin, scopeOf, windowedSearch, type MergedPr } from '../server/sources/github.ts';
import { keyHash, openStore } from '../server/store/index.ts';
import { relPathFor } from '../server/store/files.ts';
import { ROOT, rmTmp, tmpDir } from './fixture.ts';

const NOW = '2026-10-17T15:00:00Z';
const FAKE_GH = path.join(ROOT, 'test', 'fixtures', 'fake-gh', 'gh');
/** The fixture's PRs inside 90 days of NOW (one is 120 days old). */
const IN_WINDOW = 7;

type FetchFn = (url: URL, init: RequestInit) => Promise<Response>;

interface Rig {
  dir: string;
  home: string;
  app: ReturnType<typeof createAppWithContext>['app'];
  ctx: ReturnType<typeof createAppWithContext>['ctx'];
  bus: EventBus;
  /** Switch the fake gh's scenario (it reads $HOME/.fake-gh/scenario on every run). */
  scenario: (s: string) => void;
  /** The gh runs so far (their arguments). */
  ghCalls: () => string[][];
  log: () => NetworkLogEntry[];
  get: <T>(p: string) => Promise<{ status: number; body: T }>;
  send: <T>(method: string, p: string, body?: unknown) => Promise<{ status: number; body: T }>;
  cleanup: () => void;
}

/**
 * A data home, an app on it, and a PATH with only node and (unless `gh: false`) the fake gh: the real gh on this
 * machine is never reachable, and neither is its login.
 */
function rig({ gh = true, fetchImpl, now = NOW }: { gh?: boolean; fetchImpl?: FetchFn; now?: string } = {}): Rig {
  const root = tmpDir('bragdoc-github-');
  const home = path.join(root, 'home');
  const dir = path.join(home, '.bragdoc');
  const bin = path.join(root, 'bin');
  fs.mkdirSync(path.join(home, '.fake-gh'), { recursive: true });
  fs.mkdirSync(bin);
  fs.symlinkSync(process.execPath, path.join(bin, 'node'));
  if (gh) fs.symlinkSync(FAKE_GH, path.join(bin, 'gh'));
  const ghLog = path.join(root, 'gh-calls.jsonl');
  initHome(dir);
  const bus = new EventBus();
  const config = new ConfigStore(dir, { onChange: () => bus.emit({ type: 'config' }) });
  const egress = new Egress({ dataDir: dir, config: () => config.get(), fetchImpl: fetchImpl ?? (async () => Promise.reject(new TypeError('fetch failed: no network in tests'))) });
  const env = { PATH: bin, HOME: home, FAKE_GH_NOW: now, FAKE_GH_LOG: ghLog };
  const { app, ctx } = createAppWithContext({ dataDir: dir, webDist: null, bus, config, egress, store: openStore(dir), env, now: () => new Date(now) });
  const call = async <T,>(method: string, p: string, body?: unknown) => {
    const res = await app.request(p, method === 'GET' ? {} : { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? '{}' : JSON.stringify(body) });
    return { status: res.status, body: (await res.json()) as T };
  };
  return {
    dir,
    home,
    app,
    ctx,
    bus,
    scenario: (s) => fs.writeFileSync(path.join(home, '.fake-gh', 'scenario'), s),
    ghCalls: () => (fs.existsSync(ghLog) ? fs.readFileSync(ghLog, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as string[]) : []),
    log: () => readNetworkLog(dir, { limit: 1000 }).entries.reverse(),
    get: (p) => call('GET', p),
    send: call,
    cleanup: () => rmTmp(root),
  };
}

function withRig(opts: Parameters<typeof rig>[0], fn: (r: Rig) => Promise<void>) {
  return async () => {
    const r = rig(opts);
    try {
      await fn(r);
    } finally {
      await r.ctx.sources.github.idle();
      r.cleanup();
    }
  };
}

/** Connect with gh and wait for the first check. */
async function connectGh(r: Rig, body: Record<string, unknown> = {}) {
  const res = await r.send<GithubSourceStatus>('POST', '/api/sources/github/connect', { auth: 'gh', ...body });
  await r.ctx.sources.github.idle();
  return res;
}

const found = async (r: Rig, q = '') => (await r.get<FoundListResponse<FoundCandidate>>(`/api/found${q}`)).body;
const status = async (r: Rig) => (await r.get<SourcesResponse>('/api/sources')).body.github;

describe('GitHub through the gh CLI', () => {
  test('connect finds the merged PRs in the window; a second check finds nothing new', withRig({}, async (r) => {
    assert.equal((await r.get<{ installed: boolean }>('/api/sources/github/gh')).body.installed, true);
    assert.equal(r.ghCalls().length, 0, 'looking for gh runs nothing');
    const res = await connectGh(r);
    assert.equal(res.status, 200);
    assert.equal(res.body.enabled, true);
    let s = await status(r);
    assert.equal(s.login, 'alexmarlowe');
    assert.equal(s.lastRun?.added, IN_WINDOW);
    assert.equal(s.lastRun?.from, '2026-07-19', '90 days back');
    assert.equal(s.cursor, '2026-10-16', 'a day back: a merge just before UTC midnight can show up late');
    assert.equal(s.hourly, false, 'no polling unless you turn it on');
    assert.equal(s.nextRunAt, null);
    const f = await found(r);
    assert.equal(f.counts.github, IN_WINDOW);
    assert.equal(f.counts.all, IN_WINDOW);
    const top = f.items.find((c) => c.externalKey === 'github_pr:northwind-labs/ledger#412')!;
    assert.equal(top.title, 'Cut the nightly reconciliation from 40 minutes to 6');
    assert.equal(top.happenedAt.slice(0, 7), '2026-10');
    assert.doesNotMatch(top.body ?? '', /<!--/, 'PR template comments are dropped');
    assert.deepEqual(top.evidence.map((e) => [e.kind, e.url, e.externalKey]), [['github_pr', 'https://github.com/northwind-labs/ledger/pull/412', 'github_pr:northwind-labs/ledger#412']]);
    assert.deepEqual(top.matchedRules, ['You opened it', 'Merged']);
    assert.equal(top.verdict, null, 'no AI');
    // the repos it came from are added, untracked
    const repos = r.ctx.services.repos.list();
    assert.deepEqual(repos.map((x) => [x.name, x.tracked]).sort(), [['acme-corp/deploy-tools', false], ['alexm-oss/tiny-cron', false], ['northwind-labs/ledger', false], ['northwind-labs/ledger-web', false]]);
    assert.deepEqual(top.suggestedRepos, [repos.find((x) => x.name === 'northwind-labs/ledger')!.id]);

    const again = await r.send<GithubSourceStatus>('POST', '/api/sources/github/run');
    assert.equal(again.status, 200);
    assert.equal(again.body.lastRun?.added, 0);
    assert.equal(again.body.lastRun?.from, '2026-10-16', 'from the cursor');
    assert.equal((await found(r)).counts.all, IN_WINDOW);

    // Network activity: one line per gh run, and exactly as many as it ran
    const calls = r.ghCalls();
    assert.deepEqual(calls.map((a) => a.slice(0, 2).join(' ')), ['auth status', 'search prs', 'search prs']);
    const log = r.log();
    assert.deepEqual(log.map((e) => [e.via, e.purpose, e.path, e.host]), [
      ['gh', 'github.auth', 'gh auth status', 'github.com (via gh CLI)'],
      ['gh', 'github.search', 'gh search prs', 'github.com (via gh CLI)'],
      ['gh', 'github.search', 'gh search prs', 'github.com (via gh CLI)'],
    ]);
    assert.ok(log.every((e) => e.outcome === 'ok' && e.status === 0));
    assert.ok(calls[1]!.includes('--author=@me') && calls[1]!.includes('--merged') && calls[1]!.includes('--merged-at=2026-07-19..2026-10-17'));
  }));

  test('keep makes an achievement with the PR and its suggested project; merge appends; undo puts them back', withRig({}, async (r) => {
    const repo = r.ctx.services.repos.create({ remoteUrl: 'https://github.com/northwind-labs/ledger' }).repo;
    const project = r.ctx.services.projects.create({ name: 'Ledger', repoIds: [repo.id] });
    await connectGh(r);
    const items = (await found(r)).items;
    const a = items.find((c) => c.externalKey === 'github_pr:northwind-labs/ledger#412')!;
    assert.deepEqual(a.suggestedProjects, [project.id]);
    assert.ok(a.matchedRules.includes('In a repo you track'));
    const kept = await r.send<FoundDecided<FoundCandidate>>('POST', `/api/found/${a.id}/keep`);
    assert.equal(kept.status, 200);
    const ach = r.ctx.services.achievements.get(kept.body.achievementId!);
    assert.equal(ach.title, a.title);
    assert.equal(ach.source, 'github-pr');
    assert.deepEqual(ach.projects, [project.id]);
    assert.deepEqual(ach.repos, [repo.id]);
    assert.equal(ach.evidence[0]!.kind, 'github_pr');
    assert.equal((await r.get<{ pending: number }>('/api/found/count')).body.pending, IN_WINDOW - 1);

    const b = items.find((c) => c.externalKey === 'github_pr:northwind-labs/ledger#398')!;
    const merged = await r.send<FoundDecided<FoundCandidate>>('POST', `/api/found/${b.id}/merge`, { achievementId: ach.id });
    assert.equal(merged.status, 200);
    assert.deepEqual(r.ctx.services.achievements.get(ach.id).evidence.map((e) => e.externalKey), ['github_pr:northwind-labs/ledger#412', 'github_pr:northwind-labs/ledger#398']);
    assert.equal((await r.send('POST', `/api/found/${b.id}/merge`, { achievementId: ach.id })).status, 409, 'decided already');
    assert.equal((await r.send('POST', `/api/found/${b.id}/merge`, {})).status, 400);
    assert.equal((await r.send('POST', `/api/found/${b.id}/undo`)).status, 200);
    assert.equal(r.ctx.services.achievements.get(ach.id).evidence.length, 1);

    // nothing kept or merged comes back on the next check
    await r.send('POST', '/api/sources/github/run');
    assert.equal((await status(r)).lastRun?.added, 0);
  }));

  test('dismissed PRs never come back, and keep only a hash of their key (D55); undo brings one back while running', withRig({}, async (r) => {
    await connectGh(r);
    const c = (await found(r)).items.find((x) => x.externalKey === 'github_pr:alexm-oss/tiny-cron#15')!;
    const d = await r.send<FoundDecided<FoundCandidate>>('POST', `/api/found/${c.id}/dismiss`);
    assert.equal(d.status, 200);
    const text = fs.readFileSync(path.join(r.dir, relPathFor('found', c.id)), 'utf8');
    assert.doesNotMatch(text, /tiny-cron|reboot|github\.com/i, 'nothing of the PR is left in the file');
    assert.match(text, new RegExp(keyHash('github_pr:alexm-oss/tiny-cron#15').replace(':', ':')));
    assert.match(text, /status: dismissed/);

    // look again from scratch (a wider window resets the cursor): still not back
    await r.send('PUT', '/api/sources/github', { lookBackDays: 100 });
    await r.send('POST', '/api/sources/github/run');
    assert.equal((await status(r)).lastRun?.added, 0);
    assert.ok(!(await found(r)).items.some((x) => x.id === c.id));
    // nor through MCP's add, nor after a restart (the index is built from the hashes)
    assert.equal(r.ctx.services.found.add({ source: 'mcp', title: 'x', externalKey: 'github_pr:alexm-oss/tiny-cron#15' }).reason, 'dismissed');
    assert.equal(openStore(r.dir).foundIdByKey('github_pr:alexm-oss/tiny-cron#15'), c.id);

    // the toast's undo: all of it comes back
    const u = await r.send<FoundDecided<FoundCandidate>>('POST', `/api/found/${c.id}/undo`);
    assert.equal(u.status, 200);
    assert.equal(u.body.candidate.status, 'pending');
    assert.equal(u.body.candidate.title, 'Support @reboot schedules');
    assert.equal(u.body.candidate.externalKey, 'github_pr:alexm-oss/tiny-cron#15');
    assert.equal(u.body.candidate.keyHashes, undefined);
    assert.equal(u.body.candidate.evidence[0]!.url, 'https://github.com/alexm-oss/tiny-cron/pull/15');
  }));

  test('a PR already on the board is not added (prKey dedup, any case)', withRig({}, async (r) => {
    r.ctx.services.achievements.create({ title: 'Faster nightly job', evidence: [{ kind: 'github_pr', url: 'https://github.com/Northwind-Labs/Ledger/pull/412', externalKey: 'github_pr:northwind-labs/ledger#412' }] });
    await connectGh(r);
    assert.equal((await status(r)).lastRun?.added, IN_WINDOW - 1);
    assert.ok(!(await found(r)).items.some((x) => x.externalKey === 'github_pr:northwind-labs/ledger#412'));
  }));

  test('only the owners and repositories you picked (D56)', withRig({}, async (r) => {
    await connectGh(r, { repos: ['northwind-labs/ledger-web', 'alexm-oss'] });
    const f = await found(r);
    assert.deepEqual(f.items.map((x) => x.externalKey).sort(), ['github_pr:alexm-oss/tiny-cron#15', 'github_pr:alexm-oss/tiny-cron#9', 'github_pr:northwind-labs/ledger-web#71', 'github_pr:northwind-labs/ledger-web#77']);
    const searches = r.ghCalls().filter((a) => a[0] === 'search');
    assert.deepEqual(searches.map((a) => a.filter((x) => x.startsWith('--owner') || x.startsWith('--repo'))), [['--owner=alexm-oss'], ['--repo=northwind-labs/ledger-web']]);
    assert.ok(f.items.find((x) => x.externalKey === 'github_pr:alexm-oss/tiny-cron#15')!.matchedRules.includes('Under alexm-oss, which you picked'));
    assert.equal((await r.send('PUT', '/api/sources/github', { repos: ['not a repo!'] })).status, 400);
    assert.equal((await r.send('PUT', '/api/sources/github', { colour: 'red' })).status, 400);
  }));

  test('zero results and 200 results', withRig({}, async (r) => {
    r.scenario('zero');
    await connectGh(r);
    let s = await status(r);
    assert.deepEqual([s.lastRun?.seen, s.lastRun?.added, s.lastRun?.error], [0, 0, undefined]);
    r.scenario('many');
    await r.send('PUT', '/api/sources/github', { lookBackDays: 30 });
    const t0 = Date.now();
    await r.send('POST', '/api/sources/github/run');
    s = await status(r);
    assert.equal(s.lastRun?.added, 200);
    assert.equal((await found(r)).items.length, 200);
    assert.ok(Date.now() - t0 < 10_000, '200 candidates in reasonable time');
  }));

  test('gh missing, logged out, offline, rate limited, nonsense: each says so plainly and nothing crashes', async () => {
    const none = rig({ gh: false });
    try {
      assert.equal((await none.get<{ installed: boolean }>('/api/sources/github/gh')).body.installed, false);
      const res = await none.send<{ error: { code: string; message: string } }>('POST', '/api/sources/github/connect', { auth: 'gh' });
      assert.equal(res.status, 409);
      assert.equal(res.body.error.code, 'gh_missing');
      assert.match(res.body.error.message, /isn’t installed/);
      assert.equal((await status(none)).enabled, false);
    } finally {
      none.cleanup();
    }
    const r = rig();
    try {
      r.scenario('logged-out');
      const out = await r.send<{ error: { code: string; message: string } }>('POST', '/api/sources/github/connect', { auth: 'gh' });
      assert.deepEqual([out.status, out.body.error.code], [409, 'gh_logged_out']);
      assert.match(out.body.error.message, /gh auth login/);
      assert.equal((await status(r)).enabled, false, 'nothing switched on');
      assert.equal(r.log().at(-1)?.outcome, 'error', 'the failed gh run is in Network activity too');

      r.scenario('offline');
      assert.equal((await r.send<{ error: { code: string } }>('POST', '/api/sources/github/connect', { auth: 'gh' })).body.error.code, 'offline');

      r.scenario('ok');
      await connectGh(r);
      // logged out after connecting: the check says so on the card
      r.scenario('logged-out');
      await r.send('POST', '/api/sources/github/run');
      assert.equal((await status(r)).lastRun?.error?.code, 'gh_logged_out');
      r.scenario('offline');
      await r.send('POST', '/api/sources/github/run');
      assert.equal((await status(r)).lastRun?.error?.code, 'offline');
      r.scenario('not-json');
      await r.send('POST', '/api/sources/github/run');
      assert.equal((await status(r)).lastRun?.error?.code, 'failed');

      r.scenario('rate-limited');
      await r.send('POST', '/api/sources/github/run');
      const s = await status(r);
      assert.equal(s.lastRun?.error?.code, 'rate_limited');
      assert.ok(s.retryAt && Date.parse(s.retryAt) > Date.parse(NOW), 'it backs off');
      const before = r.ghCalls().length;
      r.scenario('ok');
      const wait = await r.send<{ error: { code: string }; retryAt: string }>('POST', '/api/sources/github/run');
      assert.deepEqual([wait.status, wait.body.error.code], [429, 'rate_limited']);
      assert.equal(wait.body.retryAt, s.retryAt);
      assert.equal(r.ghCalls().length, before, 'and asks nothing while it waits');
      assert.equal(r.ctx.sources.github.due(), false);
    } finally {
      await r.ctx.sources.github.idle();
      r.cleanup();
    }
  });

  test('disconnect switches it off and stops the link-preview lookups; a pasted PR gets its title while connected', withRig({}, async (r) => {
    const url = 'https://github.com/northwind-labs/ledger-web/pull/77';
    const before = await r.send<LinkPreview>('POST', '/api/link-preview', { url });
    assert.equal(before.body.kind === 'github_pr' && before.body.titleNote?.includes('isn’t connected'), true);
    await connectGh(r);
    const during = await r.send<LinkPreview>('POST', '/api/link-preview', { url });
    assert.equal(during.body.kind === 'github_pr' && during.body.title, 'Accessible date picker on the export screen');
    assert.equal(r.log().at(-1)?.purpose, 'github.pr');
    const off = await r.send<GithubSourceStatus>('POST', '/api/sources/github/disconnect');
    assert.equal(off.body.enabled, false);
    const after = await r.send<LinkPreview>('POST', '/api/link-preview', { url });
    assert.equal(after.body.kind === 'github_pr' && !!after.body.titleNote, true);
    assert.equal((await r.send<{ error: { code: string } }>('POST', '/api/sources/github/run')).body.error.code, 'not_connected');
    assert.equal((await found(r)).counts.all, IN_WINDOW, 'what it found stays in Found');
  }));

  test('the hourly check is off unless you turn it on, then due an hour after the last', withRig({}, async (r) => {
    await connectGh(r);
    const gh = r.ctx.sources.github;
    assert.equal(gh.due(), false);
    const on = await r.send<GithubSourceStatus>('PUT', '/api/sources/github', { hourly: true });
    assert.equal(on.body.hourly, true);
    assert.equal(on.body.nextRunAt, '2026-10-17T16:00:00.000Z');
    assert.equal(gh.due(), false, 'it just ran');
    assert.match(fs.readFileSync(path.join(r.dir, 'config.yaml'), 'utf8'), /hourly: true/);
  }));
});

describe('GitHub with a personal access token (through egress)', () => {
  const TOKEN = 'github_pat_' + 'A'.repeat(40);
  const searchBody = (n: number) => ({
    total_count: n,
    incomplete_results: false,
    items: Array.from({ length: n }, (_, i) => ({
      number: 100 + i,
      title: `Token PR ${i}`,
      html_url: `https://github.com/northwind-labs/ledger/pull/${100 + i}`,
      body: null,
      closed_at: '2026-10-10T10:00:00Z',
      repository_url: 'https://api.github.com/repos/northwind-labs/ledger',
      pull_request: { merged_at: '2026-10-10T10:00:00Z', html_url: `https://github.com/northwind-labs/ledger/pull/${100 + i}` },
    })),
  });
  /** A fake GitHub: `/user` answers per `user`, search per `search`. Records what it was asked. */
  function fakeGithub(opts: { user?: () => Response; search?: () => Response }) {
    const seen: { url: URL; auth: string | null }[] = [];
    const fetchImpl: FetchFn = async (url, init) => {
      seen.push({ url, auth: new Headers(init.headers).get('authorization') });
      if (url.pathname === '/user') return opts.user?.() ?? Response.json({ login: 'alexmarlowe' });
      if (url.pathname === '/search/issues') return opts.search?.() ?? Response.json(searchBody(3));
      return new Response('{}', { status: 404 });
    };
    return { seen, fetchImpl };
  }

  test('connect checks the token, keeps it in secrets.yaml (0600), and searches through egress', async () => {
    const gh = fakeGithub({});
    const r = rig({ gh: false, fetchImpl: gh.fetchImpl });
    try {
      const res = await r.send<GithubSourceStatus>('POST', '/api/sources/github/connect', { auth: 'token', token: TOKEN, lookBackDays: 30 });
      assert.equal(res.status, 200);
      await r.ctx.sources.github.idle();
      const s = await status(r);
      assert.deepEqual([s.enabled, s.auth, s.login, s.hasToken, s.lastRun?.added, s.lookBackDays], [true, 'token', 'alexmarlowe', true, 3, 30]);
      const secrets = path.join(r.dir, 'secrets.yaml');
      assert.equal(fs.statSync(secrets).mode & 0o777, 0o600);
      assert.match(fs.readFileSync(secrets, 'utf8'), new RegExp(TOKEN));
      assert.doesNotMatch(fs.readFileSync(path.join(r.dir, 'config.yaml'), 'utf8'), /github_pat_/, 'never in config.yaml');
      assert.ok(gh.seen.every((x) => x.auth === `Bearer ${TOKEN}` && x.url.host === 'api.github.com'));
      const q = gh.seen.find((x) => x.url.pathname === '/search/issues')!.url.searchParams.get('q');
      assert.equal(q, 'is:pr is:merged author:alexmarlowe merged:2026-09-17..2026-10-17');
      // Network activity: exactly those two requests, path only (never the query, never the token)
      const log = r.log();
      assert.deepEqual(log.map((e) => [e.via, e.method, e.host, e.path, e.status]), [
        ['fetch', 'GET', 'api.github.com', '/user', 200],
        ['fetch', 'GET', 'api.github.com', '/search/issues', 200],
      ]);
      assert.doesNotMatch(fs.readFileSync(path.join(r.dir, 'logs', 'network.jsonl'), 'utf8'), /github_pat_|author:/);
      // disconnect and forget: the token goes, and api.github.com leaves the allow-list
      await r.send('POST', '/api/sources/github/disconnect', { forgetToken: true });
      assert.doesNotMatch(fs.readFileSync(secrets, 'utf8'), /github_pat_/);
      assert.deepEqual(r.ctx.egress.allowList().includes('api.github.com'), false);
    } finally {
      await r.ctx.sources.github.idle();
      r.cleanup();
    }
  });

  test('an invalid token is refused and not kept; the earlier settings stay', async () => {
    const gh = fakeGithub({ user: () => Response.json({ message: 'Bad credentials' }, { status: 401 }) });
    const r = rig({ gh: false, fetchImpl: gh.fetchImpl });
    try {
      const res = await r.send<{ error: { code: string; message: string } }>('POST', '/api/sources/github/connect', { auth: 'token', token: TOKEN });
      assert.deepEqual([res.status, res.body.error.code], [400, 'token_invalid']);
      assert.match(res.body.error.message, /didn’t accept the token/);
      const s = await status(r);
      assert.deepEqual([s.enabled, s.auth, s.hasToken], [false, 'gh', false]);
      assert.equal(r.ctx.egress.allowList().includes('api.github.com'), false);
      assert.equal((await r.send<{ error: { code: string } }>('POST', '/api/sources/github/connect', { auth: 'token', token: 'nope' })).body.error.code, 'invalid');
    } finally {
      r.cleanup();
    }
  });

  test('an under-scoped token, a rate limit with a reset time, and offline each land on the card', async () => {
    let search: () => Response = () => Response.json({ message: 'Resource not accessible by personal access token' }, { status: 403, headers: { 'x-ratelimit-remaining': '29' } });
    const gh = fakeGithub({ search: () => search() });
    const r = rig({ gh: false, fetchImpl: gh.fetchImpl });
    try {
      await r.send('POST', '/api/sources/github/connect', { auth: 'token', token: TOKEN });
      await r.ctx.sources.github.idle();
      let s = await status(r);
      assert.equal(s.lastRun?.error?.code, 'token_scope');
      assert.match(s.lastRun!.error!.message, /Pull requests/);
      const reset = Math.floor(Date.parse('2026-10-17T16:30:00Z') / 1000);
      search = () => Response.json({ message: 'API rate limit exceeded' }, { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset) } });
      await r.send('POST', '/api/sources/github/run');
      s = await status(r);
      assert.equal(s.lastRun?.error?.code, 'rate_limited');
      assert.equal(s.retryAt, '2026-10-17T16:30:00.000Z');
      assert.equal((await r.send('POST', '/api/sources/github/run')).status, 429);
    } finally {
      await r.ctx.sources.github.idle();
      r.cleanup();
    }
    const off = rig({ gh: false, fetchImpl: async (url) => (url.pathname === '/user' ? Response.json({ login: 'alexmarlowe' }) : Promise.reject(new TypeError('fetch failed'))) });
    try {
      await off.send('POST', '/api/sources/github/connect', { auth: 'token', token: TOKEN });
      await off.ctx.sources.github.idle();
      const s = await status(off);
      assert.equal(s.lastRun?.error?.code, 'offline');
      assert.equal(off.log().at(-1)?.outcome, 'error');
    } finally {
      off.cleanup();
    }
  });
});

describe('what the review found', () => {
  const TOKEN = 'github_pat_' + 'B'.repeat(40);
  const pr = (n: number) => ({
    number: n,
    title: `PR ${n}`,
    html_url: `https://github.com/northwind-labs/ledger/pull/${n}`,
    closed_at: '2026-10-10T10:00:00Z',
    repository_url: 'https://api.github.com/repos/northwind-labs/ledger',
    pull_request: { merged_at: '2026-10-10T10:00:00Z' },
  });

  test('a check that was running when you changed where to look adds nothing and leaves the cursor reset', async () => {
    let release!: () => void;
    const gate = new Promise<void>((res) => (release = res));
    let searches = 0;
    const r = rig({
      gh: false,
      fetchImpl: async (url) => {
        if (url.pathname === '/user') return Response.json({ login: 'alexmarlowe' });
        searches++;
        if (searches === 1) await gate; // the first check hangs until released
        return Response.json({ total_count: 1, items: [pr(searches)] });
      },
    });
    try {
      await r.send('POST', '/api/sources/github/connect', { auth: 'token', token: TOKEN });
      await new Promise((res) => setTimeout(res, 20));
      assert.equal((await status(r)).running, true);
      await r.send('PUT', '/api/sources/github', { repos: ['acme-corp'] });
      release();
      await r.ctx.sources.github.idle();
      const s = await status(r);
      assert.equal(s.cursor, null, 'the reset stands');
      assert.equal(s.lastRun?.added, 0, 'what it found under the old settings is not kept');
      assert.equal((await found(r)).counts.all, 0);
    } finally {
      release();
      await r.ctx.sources.github.idle();
      r.cleanup();
    }
  });

  test('a broken config.yaml or secrets.yaml: connecting keeps no token, and says what is wrong (no bare 500)', async () => {
    const r = rig({ gh: false, fetchImpl: async () => Response.json({ login: 'alexmarlowe' }) });
    try {
      fs.writeFileSync(path.join(r.dir, 'config.yaml'), 'sources: [broken\n');
      const res = await r.send<{ error: { code: string } }>('POST', '/api/sources/github/connect', { auth: 'token', token: TOKEN });
      assert.deepEqual([res.status, res.body.error.code], [409, 'config_invalid']);
      assert.equal(r.ctx.secrets.githubToken(), null, 'the token is not left behind');
      fs.writeFileSync(path.join(r.dir, 'config.yaml'), 'schemaVersion: 1\n');
      fs.writeFileSync(path.join(r.dir, 'secrets.yaml'), 'github: [broken\n');
      const bad = await r.send<{ error: { code: string; message: string } }>('POST', '/api/sources/github/connect', { auth: 'token', token: TOKEN });
      assert.deepEqual([bad.status, bad.body.error.code], [409, 'secrets_invalid']);
      assert.match(bad.body.error.message, /by hand/);
      assert.equal((await status(r)).enabled, false);
      assert.equal(fs.readFileSync(path.join(r.dir, 'secrets.yaml'), 'utf8'), 'github: [broken\n', 'never overwritten');
    } finally {
      r.cleanup();
    }
  });

  test('reconnecting doesn\'t skip a rate limit; a full window is split after one page, not ten', async () => {
    const asked: string[] = [];
    let limited = true;
    const r = rig({
      gh: false,
      fetchImpl: async (url) => {
        if (url.pathname === '/user') return Response.json({ login: 'alexmarlowe' });
        asked.push(url.searchParams.get('q')!);
        if (limited) return Response.json({ message: 'API rate limit exceeded' }, { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.parse('2026-10-17T16:00:00Z') / 1000)) } });
        const q = url.searchParams.get('q')!;
        // the whole window has too many; any smaller one has one PR
        return Response.json(q.includes('2026-07-19..2026-10-17') ? { total_count: 5000, items: [pr(1)] } : { total_count: 1, items: [pr(asked.length)] });
      },
    });
    try {
      await r.send('POST', '/api/sources/github/connect', { auth: 'token', token: TOKEN });
      await r.ctx.sources.github.idle();
      assert.equal((await status(r)).lastRun?.error?.code, 'rate_limited');
      await r.send('POST', '/api/sources/github/disconnect');
      const before = asked.length;
      const again = await r.send<{ error: { code: string } }>('POST', '/api/sources/github/connect', { auth: 'token', token: TOKEN });
      assert.deepEqual([again.status, again.body.error.code], [429, 'rate_limited']);
      assert.equal(asked.length, before, 'nothing sent while it waits');
    } finally {
      await r.ctx.sources.github.idle();
      r.cleanup();
    }
    limited = false;
    asked.length = 0;
    const r2 = rig({
      gh: false,
      fetchImpl: async (url) => {
        if (url.pathname === '/user') return Response.json({ login: 'alexmarlowe' });
        const q = url.searchParams.get('q')!;
        asked.push(q);
        return Response.json(q.includes('2026-07-19..2026-10-17') ? { total_count: 5000, items: [pr(1)] } : { total_count: 1, items: [pr(asked.length)] });
      },
    });
    try {
      await r2.send('POST', '/api/sources/github/connect', { auth: 'token', token: TOKEN });
      await r2.ctx.sources.github.idle();
      assert.equal(asked.filter((q) => q.includes('2026-07-19..2026-10-17')).length, 1, 'one page of the full window, then split');
      assert.equal(asked.length, 3);
    } finally {
      await r2.ctx.sources.github.idle();
      r2.cleanup();
    }
  });
});

describe('the pieces', () => {
  test('windowed search splits a window GitHub can only return part of', async () => {
    const all: MergedPr[] = Array.from({ length: 2500 }, (_, i) => ({ repo: 'o/r', number: i, title: `${i}`, url: '', mergedAt: `2026-0${1 + (i % 9)}-15T00:00:00Z` }));
    const asked: string[] = [];
    const search = async (from: string, to: string) => {
      asked.push(`${from}..${to}`);
      const hit = all.filter((p) => p.mergedAt.slice(0, 10) >= from && p.mergedAt.slice(0, 10) <= to);
      return { items: hit.slice(0, 1000), complete: hit.length <= 1000 };
    };
    const got = await windowedSearch(search, '2026-01-01', '2026-09-30');
    assert.equal(new Set(got.map((p) => p.number)).size, 2500);
    assert.ok(asked.length > 1);
  });

  test("gh's words → plain messages; its login from both spellings; scope entries", () => {
    assert.equal(classifyGh('To get started with GitHub CLI, please run:  gh auth login').code, 'gh_logged_out');
    assert.equal(classifyGh('HTTP 401: Bad credentials (https://api.github.com/graphql)').code, 'gh_logged_out');
    assert.equal(classifyGh('HTTP 403: API rate limit exceeded for user ID 1.').code, 'rate_limited');
    assert.equal(classifyGh('error connecting to api.github.com').code, 'offline');
    assert.equal(classifyGh('something odd').code, 'failed');
    assert.equal(ghLogin('  ✓ Logged in to github.com account octo-cat (keyring)'), 'octo-cat');
    assert.equal(ghLogin('  ✓ Logged in to github.com as octocat (oauth_token)'), 'octocat');
    assert.deepEqual(scopeOf(['Acme', 'acme/App', 'acme', 'not valid!']), { owners: ['acme'], repos: ['acme/app'] });
  });

  test("GET /api/found filters by source and counts every source; bad queries are 400s", withRig({}, async (r) => {
    r.ctx.services.found.add({ source: 'mcp', sourceAgent: 'Claude Code', title: 'From the agent' });
    await connectGh(r);
    const all = await found(r);
    assert.deepEqual(all.counts, { all: IN_WINDOW + 1, github: IN_WINDOW, screenshots: 0, mcp: 1 });
    const mcp = await found(r, '?source=mcp');
    assert.deepEqual(mcp.items.map((x) => x.title), ['From the agent']);
    assert.deepEqual(mcp.counts, all.counts);
    assert.equal((await r.get('/api/found?source=slack')).status, 400);
    assert.equal((await r.get('/api/found?status=all')).status, 400);
    assert.equal((await r.send('POST', '/api/found/01JA0000000000000000000000/dismiss')).status, 404);
  }));
});
