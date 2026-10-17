// POST /api/import/plan and /api/import/apply (SPEC R12): the hosted app's export file is the JSON body (up to 50 MB,
// D47). `plan` is the dry run: what would be added, skipped and left behind, and any problems, with nothing written.
// `apply` imports it. Both answer an ImportReport (shared/api.ts). Settings → Data's import and `bragdoc import`
// (when a server is running) call these.
import type { Hono } from 'hono';
import type { ImportReport } from '../../shared/api.js';
import type { AppContext } from '../context.js';
import { apiError } from '../http.js';
import { ImportRunning, takeImportLock } from '../import/lock.js';
import { ExportRefused, MAX_EXPORT_BYTES } from '../import/v1-schema.js';
import { SnapshotFailed, apply, planImport } from '../import/v1.js';

export function registerImport(app: Hono, ctx: AppContext): void {
  ctx.uploads.acceptLargeJson({ method: 'POST', path: /^\/api\/import\/(?:plan|apply)$/, maxBytes: MAX_EXPORT_BYTES });

  app.post('/api/import/plan', async (c) => {
    try {
      return c.json(planImport(ctx.store, await c.req.text()).report satisfies ImportReport);
    } catch (e) {
      if (e instanceof ExportRefused) return c.json(apiError(e.code, e.message), 400);
      throw e;
    }
  });

  app.post('/api/import/apply', async (c) => {
    const text = await c.req.text();
    let release: () => void;
    try {
      release = takeImportLock(ctx.dataDir, ctx.store.now());
    } catch (e) {
      if (e instanceof ImportRunning) return c.json(apiError('import_running', `Can't import now: ${e.message}.`), 409);
      throw e;
    }
    try {
      // planned and applied under the lock, so its duplicate checks see every earlier import
      const report = await apply(ctx.store, ctx.services, planImport(ctx.store, text));
      return c.json(report satisfies ImportReport);
    } catch (e) {
      if (e instanceof ExportRefused) return c.json(apiError(e.code, e.message), 400);
      if (e instanceof SnapshotFailed) return c.json(apiError('snapshot_failed', `${e.message}.`), 500);
      throw e;
    } finally {
      release();
    }
  });
}
