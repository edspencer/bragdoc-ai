// Found (SPEC R7): the candidates sources spotted, and what you decide about each. Everything goes through
// ctx.services.found (D24). A decision is undoable (the Undo toast): keep removes the achievement it made (to
// backups/removed/), merge takes off exactly the evidence it added, and a dismissal is brought back from the copy this
// server held when you dismissed it (D56: a dismissed candidate's file keeps only the hashes of its keys).
//
//   GET  /api/found?source=github|screenshots|mcp   FoundListResponse: pending, newest first, + counts per source
//   POST /api/found/:id/keep      FoundKeep (optional) → FoundDecided (with achievementId)
//   POST /api/found/:id/merge     { achievementId } → FoundDecided
//   POST /api/found/:id/dismiss   → FoundDecided
//   POST /api/found/:id/undo      → FoundDecided (pending again)
//   POST /api/found/dismiss       { ids, only?: 'probably-not' } → FoundBulkResponse: "Dismiss these N" (PR25), at most
//                                 500 (D56's undo memory); `only` leaves any the judge no longer calls probably not
//   POST /api/found/undo          { ids } → FoundBulkResponse: its Undo, all of them back
//   GET  /api/found/:id/picture   a screenshot candidate's picture, read from where it is (it's only copied into
//                                 evidence/ on keep): 404 `gone` if it was moved, deleted or replaced
// GET /api/found/count (found-count.ts) is the nav badge's and the board strip's.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import type { Context, Hono } from 'hono';
import type { FoundBulkResponse, FoundDecided, FoundListResponse } from '../../shared/api.js';
import { FOUND_SOURCES, type FoundCandidate, type FoundSource } from '../../shared/schema/index.js';
import type { AppContext } from '../context.js';
import { apiError, handle, jsonBody } from '../http.js';
import { blobHeaders } from '../security.js';
import { checkIngestPath, sniff } from '../store/blobs.js';
import { ValidationError } from '../store/errors.js';

/** What a screenshot card may show. */
const PICTURES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/bmp', 'image/tiff', 'image/heic']);

export function registerFound(app: Hono, ctx: AppContext): void {
  const svc = () => ctx.services.found;

  app.get('/api/found', (c) => {
    const q = c.req.query();
    const unknown = Object.keys(q).filter((k) => k !== 'source');
    if (unknown.length) return c.json(apiError('invalid', `Unknown query parameter: ${unknown.join(', ')}.`), 400);
    if (q.source !== undefined && !(FOUND_SOURCES as readonly string[]).includes(q.source)) return c.json(apiError('invalid', `source is one of ${FOUND_SOURCES.join(', ')}.`), 400);
    const pending = svc().list();
    const counts = { all: pending.length, github: 0, screenshots: 0, mcp: 0 };
    for (const f of pending) counts[f.source]++;
    const items = q.source ? pending.filter((f) => f.source === (q.source as FoundSource)) : pending;
    return c.json({ items, counts } satisfies FoundListResponse<FoundCandidate>);
  });

  // a screenshot's picture, for its card. Only a picture is ever served (the bytes decide, as for evidence), only for a
  // pending screenshots candidate, and only from where a kept one could be copied from (inspectPath: never the data
  // folder or a hidden folder), since found/<id>.yaml is a file anyone can edit
  app.get('/api/found/:id/picture', async (c) => {
    const f = ctx.store.get('found', c.req.param('id'));
    const file = f?.source === 'screenshots' && f.status === 'pending' ? f.files[0] : undefined;
    if (!file) return c.json(apiError('not_found', 'There is no screenshot for that.'), 404);
    const gone = () => c.json(apiError('gone', 'The screenshot isn’t where it was: it was moved, deleted or replaced.'), 404);
    let bytes: Uint8Array<ArrayBuffer>;
    try {
      const { real } = checkIngestPath(ctx.store, file.path);
      bytes = new Uint8Array(fs.readFileSync(real));
    } catch {
      return gone();
    }
    // only the picture that passed the rules: the bytes must still be the ones its key was made from (a tool that
    // reuses a name, or a hand-edited path, shows nothing rather than some other picture)
    if (f!.externalKey !== `screenshot:${createHash('sha256').update(bytes).digest('hex')}`) return gone();
    const { mime } = await sniff(bytes, file.title);
    if (!PICTURES.has(mime)) return gone();
    return c.body(bytes, 200, { ...blobHeaders(mime, file.title ?? 'screenshot'), 'Cache-Control': 'no-store' });
  });

  app.post('/api/found/:id/keep', (c) =>
    handle(c, async () => {
      const r = await svc().keep(c.req.param('id'), (await jsonBody(c.req)) ?? {});
      return { candidate: r.candidate, achievementId: r.achievementId, missingFiles: r.missingFiles } satisfies FoundDecided<FoundCandidate>;
    }),
  );

  app.post('/api/found/:id/merge', (c) =>
    handle(c, async () => {
      const b = (await jsonBody(c.req)) as { achievementId?: unknown } | undefined;
      if (!b || typeof b.achievementId !== 'string' || Object.keys(b).some((k) => k !== 'achievementId'))
        throw new ValidationError('send { "achievementId": "<id>" }: the achievement to merge it into', [{ key: 'achievementId', message: 'required' }]);
      const r = await svc().merge(c.req.param('id'), b.achievementId);
      return { candidate: r.candidate, achievementId: r.achievementId, missingFiles: r.missingFiles } satisfies FoundDecided<FoundCandidate>;
    }),
  );

  app.post('/api/found/:id/dismiss', (c) => handle(c, () => ({ candidate: svc().dismiss(c.req.param('id')) }) satisfies FoundDecided<FoundCandidate>));

  app.post('/api/found/:id/undo', (c) => handle(c, () => ({ candidate: svc().undo(c.req.param('id')) }) satisfies FoundDecided<FoundCandidate>));

  // many at once: the "Probably not" group's Dismiss these N, and its Undo. Each id as the one-at-a-time route would do
  // it; one decided meanwhile is skipped and said, never an error for the rest
  const bulk = (fn: (ids: string[], only: 'probably-not' | undefined) => FoundBulkResponse, allowOnly: boolean) => async (c: Context) =>
    handle(c, async () => {
      const b = (await jsonBody(c.req)) as { ids?: unknown; only?: unknown } | undefined;
      const keys = allowOnly ? ['ids', 'only'] : ['ids'];
      if (!b || !Array.isArray(b.ids) || !b.ids.length || b.ids.some((x) => typeof x !== 'string' || !x || x.length > 64) || Object.keys(b).some((k) => !keys.includes(k)))
        throw new ValidationError(`send { "ids": ["<id>", …]${allowOnly ? ', "only"?: "probably-not"' : ''} }: the candidates`, [{ key: 'ids', message: 'a list of ids' }]);
      if (b.only !== undefined && b.only !== 'probably-not') throw new ValidationError('"only" can only be "probably-not"', [{ key: 'only', message: 'probably-not' }]);
      return fn(b.ids as string[], b.only as 'probably-not' | undefined) satisfies FoundBulkResponse;
    });
  app.post('/api/found/dismiss', bulk((ids, only) => svc().dismissMany(ids, { probablyNotOnly: only === 'probably-not' }), true));
  app.post('/api/found/undo', bulk((ids) => svc().undoMany(ids), false));
}
