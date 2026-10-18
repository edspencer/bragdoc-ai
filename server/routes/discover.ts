// Welcome's "Your code" step, also on its own later (SPEC R10; server/discover.ts). Nothing found is stored: only the
// repos you tick, which POST /api/discover/add saves as repos (and, if you like, a project each).
//   GET  /api/discover/suggestions   DiscoverSuggestions: the usual code folders that exist, the hint sources there are
//   POST /api/discover/scan          DiscoverScanRequest → DiscoverScanResponse (4 levels, 5 s; 400 for a folder that
//                                    can't be scanned, with a DiscoverErrorCode)
//   POST /api/discover/add           DiscoverAddRequest → DiscoverAddResponse
import os from 'node:os';
import path from 'node:path';
import type { Hono } from 'hono';
import { z } from 'zod';
import type { DiscoverAddResponse, DiscoverScanResponse } from '../../shared/api.js';
import type { AppContext } from '../context.js';
import { DiscoverError, scan, suggestions } from '../discover.js';
import { NotARepoError, expandHome, readLocalRepo } from '../gitremote.js';
import { apiError, handle, jsonBody, storeError } from '../http.js';
import { tildify } from '../paths.js';
import { normalizeRemote } from '../services/catalog.js';
import { validate } from '../services/util.js';
import { ulidSchema } from '../../shared/schema/index.js';
import { repoEntry } from './entries.js';

const HintId = z.enum(['vscode', 'jetbrains', 'claude']);
const ScanSchema = z
  .strictObject({ root: z.string().max(4096).nullable().optional(), hints: z.array(HintId).max(3).optional() })
  .refine((r) => !!r.root?.trim() || !!r.hints?.length, { message: 'name a folder, or tick somewhere to look', path: ['root'] });
const AddSchema = z.strictObject({
  repos: z
    .array(
      z.strictObject({
        path: z.string().min(1).max(4096),
        project: z.union([z.strictObject({ name: z.string().trim().min(1).max(200) }), z.strictObject({ id: ulidSchema })]).nullable().optional(),
      }),
    )
    .min(1)
    .max(500),
});

/** One spelling of a folder, for "is it one of yours already?". */
const canon = (p: string, home: string) => path.resolve(expandHome(p, home));

export function registerDiscover(app: Hono, ctx: AppContext): void {
  const { store, services } = ctx;

  app.get('/api/discover/suggestions', (c) => c.json(suggestions()));

  app.post('/api/discover/scan', async (c) => {
    try {
      const v = validate(ScanSchema, await jsonBody(c.req));
      const r = await scan({ root: v.root?.trim() || null, hints: v.hints });
      const home = os.homedir();
      const mine = store.all('repo');
      const paths = new Set(mine.filter((x) => x.localPath).map((x) => canon(x.localPath!, home)));
      const remotes = new Set(mine.map((x) => (x.remoteUrl ? normalizeRemote(x.remoteUrl)?.url : null)).filter(Boolean));
      return c.json({ ...r, repos: r.repos.map((x) => ({ ...x, known: paths.has(canon(x.path, home)) || (!!x.remoteUrl && remotes.has(x.remoteUrl)) })) } satisfies DiscoverScanResponse);
    } catch (e) {
      if (e instanceof DiscoverError) return c.json(apiError(e.code, e.message), 400);
      const r = storeError(e);
      return c.json(r.body, r.status);
    }
  });

  app.post('/api/discover/add', (c) =>
    handle(c, async () => {
      const v = validate(AddSchema, await jsonBody(c.req));
      const results: DiscoverAddResponse['results'] = [];
      for (const want of v.repos) {
        try {
          // the folder is checked again here: what's saved is only ever a git checkout you ticked
          const local = readLocalRepo(want.path);
          const localPath = tildify(local.path.replace(/[\\/]+$/, '') || local.path);
          const remoteUrl = local.remoteUrl ? (normalizeRemote(local.remoteUrl)?.url ?? undefined) : undefined;
          let { repo, created } = services.repos.create({ localPath, remoteUrl });
          if (!created && !repo.localPath) repo = services.repos.update(repo.id, { localPath });
          let projectId: string | null = null;
          if (want.project && 'id' in want.project) projectId = services.projects.linkRepo(want.project.id, repo.id).id;
          else if (want.project) {
            const name = want.project.name;
            const same = store.all('project').find((p) => !p.example && p.name.toLowerCase() === name.toLowerCase());
            projectId = same ? services.projects.linkRepo(same.id, repo.id).id : services.projects.create({ name, repoIds: [repo.id] }).id;
          }
          results.push({ path: want.path, repo: repoEntry(store, repo), created, projectId });
        } catch (e) {
          if (e instanceof NotARepoError) results.push({ path: want.path, error: e.message });
          else results.push({ path: want.path, error: storeError(e).body.error.message });
        }
      }
      return { results } satisfies DiscoverAddResponse;
    }),
  );
}
