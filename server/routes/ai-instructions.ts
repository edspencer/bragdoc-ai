// The instructions files (v0.2, SPEC R20, D67): what you tell the models, in the data home's ai/ folder.
//   GET  /api/ai/instructions/:name         AiInstructionsResponse (+ ETag); `what-counts` or `style`
//   PUT  /api/ai/instructions/:name         { text }: the whole file (If-Match optional; required over a broken file)
//   POST /api/ai/instructions/:name/reset   the feature's starter back, your file moved to backups/removed/ first
// They're your files, not AI: reading or saving one makes no model call, so none of this waits for AI to be on.
import type { Context, Hono } from 'hono';
import type { AiInstructionsReset, AiInstructionsResponse } from '../../shared/api.js';
import type { AppContext } from '../context.js';
import { jsonBody, storeErrorResponse } from '../http.js';

export function registerAiInstructions(app: Hono, ctx: AppContext): void {
  const svc = () => ctx.services.instructions;
  const answer = (c: Context, fn: () => AiInstructionsResponse | AiInstructionsReset) => {
    try {
      const r = fn();
      if (r.etag) c.header('ETag', r.etag);
      return c.json(r);
    } catch (e) {
      return storeErrorResponse(c, e); // a 409 carries the file's current ETag
    }
  };

  app.get('/api/ai/instructions/:name', (c) => answer(c, () => svc().get(c.req.param('name'))));

  app.put('/api/ai/instructions/:name', async (c) => {
    let body: unknown;
    try {
      body = await jsonBody(c.req);
    } catch (e) {
      return storeErrorResponse(c, e);
    }
    return answer(c, () => svc().put(c.req.param('name'), body, { ifMatch: c.req.header('if-match') ?? null }));
  });

  app.post('/api/ai/instructions/:name/reset', (c) => answer(c, () => svc().reset(c.req.param('name'))));
}
