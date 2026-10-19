// Folio "Draft with AI" (v0.2, SPEC R24, D80–D81).
//   POST /api/ai/draft           { folio, purpose? }: a draft from exactly what that folio shows, streamed as
//                                application/x-ndjson (AiDraftEvent: start, text…, done). The clippings are rebuilt
//                                here from the folio's state (never text the page sent); the lowest-impact ones that
//                                don't fit the model's context are left out and counted (`X-BragDoc-Omitted`, and in
//                                `start`). Closing the request cancels the call. 15 minutes on a local runner, 3 to the
//                                internet. The gates (AI or Draft off, no model, no consent, no key) are a 409 before
//                                anything is sent; an empty folio is a 400.
//   POST /api/ai/draft/check     { draft, folio, purpose? }: the check (shared/ai/draft.ts) of an edited draft against
//                                the same clippings. No model call.
//   GET  /api/ai/draft/preview   exactly what a draft sends: the template, or (with a folio's URL params: from, to, p,
//                                c, min, out, group, plus purpose) that folio's prompt. No model call.
// Nothing here writes to the data home: a draft lives in the page until you copy or export it.
import type { Context, Hono } from 'hono';
import { z } from 'zod';
import type { AiDraftEvent, AiDraftPreview } from '../../shared/api.js';
import { contextTokensOf, DEFAULT_CONTEXT_TOKENS } from '../../shared/ai/connections.js';
import { checkDraft } from '../../shared/ai/draft.js';
import { GROUPS, isDay, readSearch, type FolioFilter } from '../../shared/folio.js';
import { checkSources, prepareDraft } from '../ai/draft/prepare.js';
import { AiError } from '../ai/errors.js';
import { whereOf } from '../ai/policy.js';
import { PURPOSE_MAX_CHARS } from '../ai/prompts/draft.js';
import type { AppContext } from '../context.js';
import { FOLIO_MAX_YEARS, folioData } from '../folio.js';
import { apiError, jsonBody } from '../http.js';

/** A draft's time limits: drafts are long, and a CPU-only runner writes about 10–15 tokens a second (SPEC R20). */
export const DRAFT_LOCAL_TIMEOUT_MS = 15 * 60_000;
export const DRAFT_CLOUD_TIMEOUT_MS = 3 * 60_000;
/** The longest draft the check reads. */
export const DRAFT_MAX_CHARS = 50_000;

const Id = z.string().regex(/^[0-9A-Za-z]{1,40}$/);
const FolioSchema = z
  .strictObject({
    from: z.string().refine(isDay, 'a date, YYYY-MM-DD'),
    to: z.string().refine(isDay, 'a date, YYYY-MM-DD'),
    projects: z.array(Id).max(2000).default([]),
    company: Id.optional(),
    minImpact: z.number().int().min(0).max(10).default(0),
    exclude: z.array(Id).max(5000).default([]),
    group: z.enum(GROUPS).default('project'),
  })
  .refine((f) => f.from <= f.to, 'from is after to')
  .refine((f) => Number(f.to.slice(0, 4)) - Number(f.from.slice(0, 4)) <= FOLIO_MAX_YEARS, `a folio covers at most ${FOLIO_MAX_YEARS} years`);
const Purpose = z.string().trim().max(PURPOSE_MAX_CHARS, `the note is at most ${PURPOSE_MAX_CHARS} characters`).optional();
const DraftSchema = z.strictObject({ folio: FolioSchema, purpose: Purpose });
const CheckSchema = z.strictObject({
  draft: z.string().max(DRAFT_MAX_CHARS, `a draft of at most ${DRAFT_MAX_CHARS.toLocaleString('en-US')} characters`),
  folio: FolioSchema,
  purpose: Purpose,
  cited: z.array(Id).max(5000).optional(),
});

export function registerAiDraft(app: Hono, ctx: AppContext): void {
  const issue = (e: z.ZodError) => {
    const i = e.issues[0]!;
    return `${i.path.join('.') || 'the request'}: ${i.message}`;
  };
  const body = async <T>(c: Context, schema: z.ZodType<T>): Promise<T | Response> => {
    let raw: unknown;
    try {
      raw = await jsonBody(c.req);
    } catch (e) {
      return c.json(apiError('invalid', (e as Error).message), 400);
    }
    const r = schema.safeParse(raw ?? {});
    return r.success ? r.data : c.json(apiError('invalid', issue(r.error)), 400);
  };

  /** The draft's input for this folio, budgeted against the model Draft would use (the default context if none). */
  const prepare = (folio: FolioFilter, purpose?: string, template = false) => {
    const cfg = ctx.config.get();
    const { slot } = ctx.ai.readiness('draft');
    const conn = slot ? cfg.ai.connections[slot.connection] : undefined;
    return prepareDraft({
      data: template ? { ...folioData(ctx.store, folio.from, folio.from), items: [] } : folioData(ctx.store, folio.from, folio.to),
      folio,
      purpose: purpose || null,
      role: ctx.store.profile()?.role ?? null,
      style: ctx.services.instructions.forPrompt('style'),
      contextTokens: conn ? contextTokensOf(conn, cfg.ai.connections) : DEFAULT_CONTEXT_TOKENS,
    });
  };

  app.post('/api/ai/draft', async (c) => {
    const b = await body(c, DraftSchema);
    if (b instanceof Response) return b;
    // the gates first: with AI or Draft off, nothing is read or built, let alone sent
    const { gate, slot } = ctx.ai.readiness('draft');
    if (gate || !slot) return c.json(apiError(gate?.code ?? 'no_model', gate?.message ?? 'no model is chosen (Settings → AI).'), 409);
    const p = prepare(b.folio as FolioFilter, b.purpose);
    if (!p.picked.length) return c.json(apiError('empty', 'Nothing is picked in this folio, so there’s nothing to draft from. Widen the window or tick some clippings.'), 400);
    if (!p.sent)
      return c.json(
        apiError('context_too_long', `Not even the first clipping fits in this model’s context (${p.budget.contextTokens.toLocaleString('en-US')} tokens)${p.styleCut ? ', after a shortened “How I write”' : ''}. Raise the connection’s context size in Settings → AI${p.styleCut ? ', or shorten “How I write”' : ''}.`),
        400,
      );

    const where = whereOf(ctx.config.get().ai, slot.connection);
    const q = ctx.ai.queue()[slot.connection];
    const ahead = q ? q.running + q.waiting : 0;
    const run = ctx.aiActivity.start({ feature: 'draft', trigger: 'now' });
    run.count('sent', p.sent);
    run.count('omitted', p.omitted);
    // the browser going away (a closed tab, Cancel) cancels the call, as does the stream being cancelled
    const stop = new AbortController();
    const signal = AbortSignal.any([c.req.raw.signal, stop.signal]);
    let s: Awaited<ReturnType<typeof ctx.ai.stream>>;
    try {
      s = await ctx.ai.stream({
        feature: 'draft',
        purpose: 'ai.draft',
        system: p.system,
        prompt: p.prompt,
        signal,
        runId: run.id,
        timeoutMs: where === 'internet' ? DRAFT_CLOUD_TIMEOUT_MS : DRAFT_LOCAL_TIMEOUT_MS,
        maxOutputTokens: p.budget.answerTokens,
        temperature: 0.2,
      });
    } catch (e) {
      run.end({ error: e instanceof AiError ? e.code : 'failed' });
      if (e instanceof AiError) return c.json(apiError(e.code, e.message), e.status as 409);
      throw e;
    }

    const enc = new TextEncoder();
    const line = (e: AiDraftEvent) => enc.encode(JSON.stringify(e) + '\n');
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (e: AiDraftEvent) => {
          try {
            controller.enqueue(line(e));
          } catch {
            /* the browser went away */
          }
        };
        send({ type: 'start', model: slot.model, connection: slot.connection, where, sent: p.sent, omitted: p.omitted, cited: p.cited, ahead, styleCut: p.styleCut });
        let text = '';
        try {
          for await (const t of s.textStream) {
            text += t;
            send({ type: 'text', text: t });
          }
          const info = await s.done;
          send({ type: 'done', ok: true, ms: info.ms, tokensIn: info.tokensIn, tokensOut: info.tokensOut, check: checkDraft(text, p.sources) });
          run.end();
        } catch (e) {
          const err = e instanceof AiError ? e : new AiError('failed', (e as Error).message);
          run.end({ error: err.code === 'cancelled' ? null : err.code, cancelled: err.code === 'cancelled' });
          send({ type: 'done', ok: false, error: { code: err.code, message: err.code === 'cancelled' ? 'Cancelled.' : err.message } });
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      },
      cancel() {
        stop.abort();
      },
    });
    return new Response(stream, {
      headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-bragdoc-omitted': String(p.omitted) },
    });
  });

  app.post('/api/ai/draft/check', async (c) => {
    const b = await body(c, CheckSchema);
    if (b instanceof Response) return b;
    const folio = b.folio as FolioFilter;
    if (b.cited) {
      const data = folioData(ctx.store, folio.from, folio.to);
      return c.json(checkDraft(b.draft, checkSources({ data, folio, purpose: b.purpose || null, role: ctx.store.profile()?.role ?? null }, b.cited)));
    }
    return c.json(checkDraft(b.draft, prepare(folio, b.purpose).sources));
  });

  app.get('/api/ai/draft/preview', (c) => {
    const q = c.req.query();
    const known = ['from', 'to', 'p', 'c', 'min', 'out', 'group', 'purpose'];
    const unknown = Object.keys(q).filter((k) => !known.includes(k));
    if (unknown.length) return c.json(apiError('invalid', `Unknown query parameter: ${unknown.join(', ')}.`), 400);
    const purpose = Purpose.safeParse(q.purpose);
    if (!purpose.success) return c.json(apiError('invalid', issue(purpose.error)), 400);
    if (q.from || q.to) {
      if (!isDay(q.from) || !isDay(q.to)) return c.json(apiError('invalid', 'from and to are dates, YYYY-MM-DD.'), 400);
      if (q.from > q.to) return c.json(apiError('invalid', 'from is after to.'), 400);
      if (Number(q.to.slice(0, 4)) - Number(q.from.slice(0, 4)) > FOLIO_MAX_YEARS) return c.json(apiError('invalid', `A folio covers at most ${FOLIO_MAX_YEARS} years.`), 400);
      const folio = readSearch(q, q.to);
      const p = prepare(folio, purpose.data);
      return c.json({ system: p.system, prompt: p.prompt, sent: p.sent, omitted: p.omitted, budget: p.budget } satisfies AiDraftPreview);
    }
    // the template: a folio's clippings go where the marker is
    const p = prepare({ from: '2026-07-01', to: '2026-09-30', projects: [], minImpact: 0, exclude: [], group: 'project' }, purpose.data, true);
    const prompt = p.prompt
      .replace(/<<<CLIPPINGS\n[\s\S]*?\nCLIPPINGS>>>/, '<<<CLIPPINGS\n(the folio’s achievements, numbered [1], [2], … best first: each one’s title, date, impact, projects and company, summary, and evidence: quotes word for word with who said them, pull request numbers and titles, link sites and titles, file names)\nCLIPPINGS>>>')
      .replace(/^The period: .*$/m, 'The period: (the folio’s window).')
      .replace(/^There (?:is|are) \d+ clippings?\.$/m, 'There are (how many) clippings.');
    return c.json({ system: p.system, prompt, sent: null, omitted: null, budget: p.budget } satisfies AiDraftPreview);
  });
}
