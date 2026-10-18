// "Tidy this up" (v0.2, SPEC R23, D78–D79): the board's suggestion for a messy paste, a picture's text or an
// achievement as written. It saves nothing: the board shows the suggestion beside your fields, and you Save.
//   POST /api/ai/tidy           AiTidyRequest → AiTidyResponse. 409 for the gates (AI or tidy off, no model, no
//                               consent, no key: nothing sent) and a picture not read yet; 400 for nothing to tidy or
//                               over 10,000 characters (said in the error); a model's failure is its AiError status
//   GET  /api/ai/tidy/preview   AiTidyPreview: exactly what a tidy sends, with a placeholder for your text
// Closing the request (Cancel on the board, a closed tab) cancels the call: its signal is the request's.
import type { Hono } from 'hono';
import type { AiFeatureReadiness, AiTidyPreview } from '../../shared/api.js';
import { AiError } from '../ai/errors.js';
import { whereOf } from '../ai/policy.js';
import { TIDY_MAX_CHARS } from '../ai/prompts/tidy.js';
import { buildTidyPrompt, localToday, runTidy, TidyRefused } from '../ai/tidy.js';
import type { AppContext } from '../context.js';
import { apiError, jsonBody, storeErrorResponse } from '../http.js';

/** What the preview shows in place of your text. */
export const TIDY_PLACEHOLDER = '[Pasted text]\n(what you paste, or the text read from your picture, goes here)';

export function registerAiTidy(app: Hono, ctx: AppContext): void {
  app.post('/api/ai/tidy', async (c) => {
    let body: unknown;
    try {
      body = await jsonBody(c.req);
    } catch (e) {
      return storeErrorResponse(c, e);
    }
    try {
      return c.json(await runTidy(ctx, body, c.req.raw.signal));
    } catch (e) {
      if (e instanceof TidyRefused) return c.json(apiError(e.code, e.message), e.status);
      if (e instanceof AiError) return c.json(apiError(e.code, e.message), e.status as 409);
      throw e;
    }
  });

  app.get('/api/ai/tidy/preview', (c) => {
    const { gate, slot } = ctx.ai.readiness('tidy');
    const readiness: AiFeatureReadiness = { ready: !gate, reason: gate?.code ?? null, message: gate?.message ?? null, slot, where: slot ? whereOf(ctx.config.get().ai, slot.connection) : null };
    const { system, prompt } = buildTidyPrompt(ctx, TIDY_PLACEHOLDER, localToday(ctx.store.now(), ctx.store.profile()?.timezone));
    return c.json({ system, prompt, maxChars: TIDY_MAX_CHARS, readiness } satisfies AiTidyPreview);
  });
}
