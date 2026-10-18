// The Found judge (v0.2, SPEC R21, PR24; D72–D74):
//   POST /api/ai/judge/run                   { ids? } → 202 AiJudgeRunResponse: judge what's waiting (or these ids
//                                            again), in the background. 409 with a gate's code while AI or the judge
//                                            is off (nothing is sent), or `running` while a run is in progress
//   GET  /api/ai/judge/status                AiJudgeStatus: ready or why not, what's waiting, the run in progress, the last
//   GET  /api/ai/judge/preview?candidate=    AiJudgePreview: exactly what would be sent for one candidate; sends nothing
// The judge only ever writes a pending candidate's `verdict`: never its status (SPEC R21).
import type { Hono } from 'hono';
import { z } from 'zod';
import type { AiJudgeRunResponse } from '../../shared/api.js';
import { AiError } from '../ai/errors.js';
import { JudgeRunning, NotJudgeable } from '../ai/judge/index.js';
import type { AppContext } from '../context.js';
import { apiError, jsonBody, storeErrorResponse } from '../http.js';
import { ValidationError } from '../store/errors.js';

const RunSchema = z.strictObject({ ids: z.array(z.string().min(1).max(64)).min(1).max(500).optional() });

export function registerAiJudge(app: Hono, ctx: AppContext): void {
  app.post('/api/ai/judge/run', async (c) => {
    let body: z.infer<typeof RunSchema>;
    try {
      const r = RunSchema.safeParse((await jsonBody(c.req)) ?? {});
      if (!r.success) throw new ValidationError(`a judge run takes { ids? }: ${r.error.issues[0]!.path.join('.') || 'the body'}: ${r.error.issues[0]!.message}`);
      body = r.data;
    } catch (e) {
      return storeErrorResponse(c, e);
    }
    try {
      // not the request's signal: the run goes on after this answer (a page can follow it in /status)
      const r = ctx.judge.start({ ...(body.ids ? { ids: body.ids } : {}), trigger: 'now' });
      r.done.catch(() => {}); // it reports through status and the activity log
      return c.json({ runId: r.runId, queued: r.queued } satisfies AiJudgeRunResponse, 202);
    } catch (e) {
      if (e instanceof JudgeRunning) return c.json(apiError('running', e.message), 409);
      if (e instanceof AiError) return c.json(apiError(e.code, e.message), e.status as 409);
      throw e;
    }
  });

  app.get('/api/ai/judge/status', (c) => c.json(ctx.judge.status()));

  app.get('/api/ai/judge/preview', async (c) => {
    const id = c.req.query('candidate');
    if (!id) return c.json(apiError('invalid', 'say which candidate: ?candidate=<id>'), 400);
    try {
      return c.json(await ctx.judge.preview(id));
    } catch (e) {
      if (e instanceof NotJudgeable) return c.json(apiError('not_judgeable', e.message), 409);
      return storeErrorResponse(c, e);
    }
  });
}
