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
//   GET  /api/found/:id/picture   a screenshot candidate's picture, read from where it is (it's only copied into
//                                 evidence/ on keep): 404 `gone` if it was moved or deleted
// GET /api/found/count (found-count.ts) is the nav badge's and the board strip's.
import fs from 'node:fs';
import type { Hono } from 'hono';
import type { FoundDecided, FoundListResponse } from '../../shared/api.js';
import { FOUND_SOURCES, type FoundCandidate, type FoundSource } from '../../shared/schema/index.js';
import type { AppContext } from '../context.js';
import { apiError, handle, jsonBody } from '../http.js';
import { blobHeaders } from '../security.js';
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
    try {
      const { real, mime } = await ctx.services.evidence.inspectPath(file.path);
      if (!PICTURES.has(mime)) return c.json(apiError('not_found', 'That file isn’t a picture any more.'), 404);
      const headers = { ...blobHeaders(mime, file.title ?? 'screenshot'), 'Cache-Control': 'no-store' };
      return c.body(new Uint8Array(fs.readFileSync(real)), 200, headers);
    } catch {
      return c.json(apiError('gone', 'The screenshot isn’t where it was: it was moved or deleted.'), 404);
    }
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
}
