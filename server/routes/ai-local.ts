// Settings → AI's local-runner routes (SPEC R18, D69–D71). The logic is in server/ai/local.ts.
//   GET  /api/ai/hardware                RAM, CPU, architecture, free space in the home folder, and the recommendation
//   GET  /api/ai/detect                  the last "look for a model runner" (or null)
//   POST /api/ai/detect                  look now: a GET to each runner's default address on this computer, each logged
//                                        (`feature: detect`), plus a look for `ollama` on PATH. 409 ai_off while AI is off
//   POST /api/ai/connections/:id/pull    { confirm: true, model }: ask that Ollama to download a recommended model;
//                                        answers application/x-ndjson progress lines, then one `{ done }`. Closing the
//                                        request cancels the download. Never without `confirm: true`.
import type { Context, Hono } from 'hono';
import { z } from 'zod';
import type { AiPullEvent } from '../../shared/api.js';
import { CONNECTION_ID_RE } from '../../shared/ai/connections.js';
import { AiError } from '../ai/errors.js';
import { PULLABLE } from '../ai/local.js';
import type { AppContext } from '../context.js';
import { apiError, jsonBody } from '../http.js';

const PullSchema = z.strictObject({ confirm: z.literal(true), model: z.string().min(1).max(200) });

export function registerAiLocal(app: Hono, ctx: AppContext): void {
  const aiError = (c: Context, e: unknown) => {
    if (e instanceof AiError) return c.json(apiError(e.code, e.message), e.status as 409);
    throw e;
  };

  app.get('/api/ai/hardware', (c) => c.json(ctx.localAi.hardware()));

  app.get('/api/ai/detect', (c) => c.json(ctx.localAi.lastDetect()));

  app.post('/api/ai/detect', async (c) => {
    try {
      return c.json(await ctx.localAi.detect(c.req.raw.signal));
    } catch (e) {
      return aiError(c, e);
    }
  });

  app.post('/api/ai/connections/:id/pull', async (c) => {
    const id = c.req.param('id');
    const conn = CONNECTION_ID_RE.test(id) ? ctx.config.get().ai.connections[id] : undefined;
    if (!conn) return c.json(apiError('not_found', `there's no AI connection called ${id}`), 404);
    if (conn.kind !== 'ollama') return c.json(apiError('not_ollama', 'only an Ollama connection can be asked to download a model'), 400);
    let raw: unknown;
    try {
      raw = await jsonBody(c.req);
    } catch (e) {
      return c.json(apiError('invalid', (e as Error).message), 400);
    }
    const b = PullSchema.safeParse(raw ?? {});
    // the confirm is the whole point: nothing is downloaded on a request that doesn't carry it (SPEC principle 2)
    if (!b.success) return c.json(apiError('confirm_needed', 'a download needs { confirm: true, model }: BragDoc never downloads a model without your confirm'), 400);
    if (!PULLABLE.includes(b.data.model))
      return c.json(apiError('not_recommended', `BragDoc only asks Ollama for the recommended models (${PULLABLE.join(', ')}). For anything else, run ollama pull yourself.`), 400);

    const gen = ctx.localAi.pull(id, b.data.model, c.req.raw.signal);
    // the gates and the first answer before any byte of the response: a refusal is a plain JSON error
    let first: IteratorResult<AiPullEvent>;
    try {
      first = await gen.next();
    } catch (e) {
      return aiError(c, e);
    }
    const enc = new TextEncoder();
    const line = (e: AiPullEvent) => enc.encode(JSON.stringify(e) + '\n');
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (!first.done) controller.enqueue(line(first.value));
          for (;;) {
            const n = await gen.next();
            if (n.done) break;
            controller.enqueue(line(n.value));
          }
          controller.enqueue(line({ done: true, ok: true }));
          ctx.bus.emit({ type: 'ai' });
        } catch (e) {
          const err = e instanceof AiError ? e : new AiError('failed', (e as Error).message);
          try {
            controller.enqueue(line({ done: true, ok: false, error: { code: err.code, message: err.message } }));
          } catch {
            /* the browser went away (Cancel) */
          }
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      },
      cancel() {
        void gen.return(undefined);
      },
    });
    return new Response(stream, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' } });
  });
}
