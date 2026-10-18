// The sources (SPEC R7, R13: Settings → Sources), so far GitHub (PR13). Connecting is the only thing that switches one
// on; nothing here reaches the network unless you ask it to (connect, Check now), and every request it makes shows in
// Network activity.
//
//   GET  /api/sources                      SourcesResponse
//   GET  /api/sources/github/gh            GhDetectResponse: is gh on PATH (a look, not a run)
//   POST /api/sources/github/connect       GithubConnectRequest → GithubSourceStatus (the first check starts)
//   PUT  /api/sources/github               GithubSettingsRequest → GithubSourceStatus
//   POST /api/sources/github/run           Check now: waits for the check → GithubSourceStatus
//   POST /api/sources/github/disconnect    GithubDisconnectRequest → GithubSourceStatus
//   GET  /api/sources/screenshots/suggestions   ScreenshotsSuggestionsResponse: where screenshots probably go here
//   PUT  /api/sources/screenshots               ScreenshotsSettingsRequest → ScreenshotsSourceStatus (folder checked first)
//   POST /api/sources/screenshots/look-back     ScreenshotsLookBackRequest → ScreenshotsSourceStatus (a one-off read)
//
// A failure is an ApiError whose code is a GithubErrorCode (gh_missing, gh_logged_out, token_invalid, rate_limited, …)
// or a ScreenshotsErrorCode (missing, denied, not_allowed, …) with the plain-words message the card shows.
import type { Context, Hono } from 'hono';
import type { GhDetectResponse, GithubConnectRequest, GithubSettingsRequest, ScreenshotsLookBackRequest, ScreenshotsSettingsRequest, SourcesResponse } from '../../shared/api.js';
import type { AppContext } from '../context.js';
import { apiError, jsonBody } from '../http.js';
import { SecretsError } from '../secrets.js';
import { GithubSourceError } from '../sources/github.js';
import { ScreenshotsSourceError } from '../sources/screenshots.js';
import { ValidationError } from '../store/errors.js';

const STATUS: Record<GithubSourceError['code'], 400 | 409 | 429 | 502 | 503> = {
  invalid: 400,
  not_connected: 409,
  config_invalid: 409,
  gh_missing: 409,
  gh_logged_out: 409,
  token_missing: 409,
  token_invalid: 400,
  token_scope: 400,
  rate_limited: 429,
  offline: 503,
  failed: 502,
};

const SHOT_STATUS: Record<ScreenshotsSourceError['code'], 400 | 409> = {
  invalid: 400,
  missing: 400,
  not_a_folder: 400,
  not_allowed: 400,
  not_set: 409,
  busy: 409,
  denied: 409,
  failed: 409,
  config_invalid: 409,
};

async function answer(c: Context, fn: () => unknown): Promise<Response> {
  try {
    return c.json((await fn()) as object);
  } catch (e) {
    if (e instanceof GithubSourceError) return c.json({ ...apiError(e.code, e.message), ...(e.retryAt ? { retryAt: e.retryAt } : {}) }, STATUS[e.code]);
    if (e instanceof ScreenshotsSourceError) return c.json(apiError(e.code, e.message), SHOT_STATUS[e.code]);
    if (e instanceof ValidationError) return c.json(apiError('invalid', e.message), 400);
    // a hand-broken secrets.yaml: say so (it's never overwritten), rather than a bare 500 that reads as "not running"
    if (e instanceof SecretsError) return c.json(apiError('secrets_invalid', e.message), 409);
    throw e;
  }
}

export function registerSources(app: Hono, ctx: AppContext): void {
  const github = () => ctx.sources.github;

  app.get('/api/sources', (c) =>
    c.json({ github: github().status(), screenshots: ctx.sources.screenshots.status(), mcp: { writeTo: ctx.config.get().mcp.writeTo } } satisfies SourcesResponse),
  );

  app.get('/api/sources/github/gh', (c) => c.json({ installed: github().ghInstalled() } satisfies GhDetectResponse));

  app.post('/api/sources/github/connect', (c) =>
    answer(c, async () => {
      const b = (await jsonBody(c.req)) as GithubConnectRequest | undefined;
      if (!b || (b.auth !== 'gh' && b.auth !== 'token')) throw new ValidationError('send { "auth": "gh" } or { "auth": "token", "token": "…" }');
      return github().connect(b);
    }),
  );

  app.put('/api/sources/github', (c) =>
    answer(c, async () => {
      const b = (await jsonBody(c.req)) as GithubSettingsRequest | undefined;
      const extra = Object.keys(b ?? {}).filter((k) => !['lookBackDays', 'repos', 'hourly'].includes(k));
      if (!b || typeof b !== 'object' || extra.length) throw new ValidationError(`send any of lookBackDays, repos, hourly${extra.length ? ` (not ${extra.join(', ')})` : ''}`);
      return github().updateOptions(b);
    }),
  );

  app.post('/api/sources/github/run', (c) =>
    answer(c, async () => {
      await github().run();
      return github().status();
    }),
  );

  app.post('/api/sources/github/disconnect', (c) =>
    answer(c, async () => {
      const b = ((await jsonBody(c.req)) ?? {}) as { forgetToken?: unknown };
      if (b.forgetToken !== undefined && typeof b.forgetToken !== 'boolean') throw new ValidationError('forgetToken is true or false');
      return github().disconnect({ forgetToken: b.forgetToken === true });
    }),
  );

  const shots = () => ctx.sources.screenshots;

  app.get('/api/sources/screenshots/suggestions', (c) => answer(c, () => shots().suggestions()));

  app.put('/api/sources/screenshots', (c) =>
    answer(c, async () => {
      const b = (await jsonBody(c.req)) as ScreenshotsSettingsRequest | undefined;
      const extra = Object.keys(b ?? {}).filter((k) => !['enabled', 'folder', 'onlyScreenshots'].includes(k));
      if (!b || typeof b !== 'object' || Array.isArray(b) || extra.length) throw new ValidationError(`send any of enabled, folder, onlyScreenshots${extra.length ? ` (not ${extra.join(', ')})` : ''}`);
      return shots().update(b);
    }),
  );

  app.post('/api/sources/screenshots/look-back', (c) =>
    answer(c, async () => {
      const b = ((await jsonBody(c.req)) ?? {}) as ScreenshotsLookBackRequest;
      return shots().lookBack(b.days ?? 7);
    }),
  );
}
