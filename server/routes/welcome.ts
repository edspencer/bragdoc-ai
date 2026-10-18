// First run (SPEC R10): whether to show Welcome, skipping it, and profile.yaml, which its first step writes.
//   GET  /api/welcome         WelcomeResponse: firstRun while there's no profile.yaml and Welcome wasn't skipped
//   POST /api/welcome/skip    { skipped?: boolean } → WelcomeResponse (welcome.skipped in config.yaml, through
//                             ctx.config.update: a broken config.yaml is a 409 and nothing is written)
//   GET  /api/profile         ProfileResponse: the profile (null before onboarding) and its ETag
//   PUT  /api/profile         ProfileUpdate (If-Match optional) → ProfileResponse; the first write needs a name
import fs from 'node:fs';
import type { Hono } from 'hono';
import { z } from 'zod';
import type { ProfileResponse, WelcomeResponse } from '../../shared/api.js';
import { ConfigWriteError } from '../config.js';
import type { AppContext } from '../context.js';
import { homePaths } from '../home.js';
import { apiError, handle, jsonBody, storeError } from '../http.js';
import { tildify } from '../paths.js';
import { validate } from '../services/util.js';
import { ifMatch } from './entries.js';

const SkipSchema = z.strictObject({ skipped: z.boolean().optional() });

export function registerWelcome(app: Hono, ctx: AppContext): void {
  const welcome = (): WelcomeResponse => {
    const skipped = ctx.config.get().welcome.skipped;
    const hasProfile = !!ctx.store.profile();
    return { firstRun: !hasProfile && !skipped, skipped, hasProfile, legacyCli: fs.existsSync(homePaths(ctx.dataDir).legacy), dataDirDisplay: tildify(ctx.dataDir) };
  };
  const profile = (): ProfileResponse => ({ profile: ctx.store.profile(), etag: ctx.store.entry('profile', 'profile')?.etag ?? null });

  app.get('/api/welcome', (c) => c.json(welcome()));

  app.post('/api/welcome/skip', async (c) => {
    try {
      const { skipped = true } = validate(SkipSchema, await jsonBody(c.req));
      if (ctx.config.get().welcome.skipped !== skipped) ctx.config.update({ welcome: { skipped } });
      return c.json(welcome());
    } catch (e) {
      if (e instanceof ConfigWriteError) return c.json(apiError('config_invalid', e.message), 409);
      const r = storeError(e);
      return c.json(r.body, r.status);
    }
  });

  app.get('/api/profile', (c) => c.json(profile()));

  app.put('/api/profile', (c) =>
    handle(c, async () => {
      ctx.services.profile.set(await jsonBody(c.req), ifMatch(c.req));
      return profile();
    }),
  );
}
