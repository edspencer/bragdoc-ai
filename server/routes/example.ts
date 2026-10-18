// Example data (SPEC R10; server/example.ts): the made-up Alex Marlowe dataset, added in one click from the empty board
// and removed in one click from Settings → Data. Everything it adds is marked `example: true`; removing takes exactly
// those away (into backups/removed/), never anything of yours.
//   GET  /api/example           ExampleStatus
//   POST /api/example           { asOf?: YYYY-MM-DD } → ExampleChanged (what was added: nothing twice)
//   POST /api/example/remove    {} → ExampleChanged (what was removed, and any files left alone)
import type { Hono } from 'hono';
import { z } from 'zod';
import type { ExampleChanged } from '../../shared/api.js';
import type { AppContext } from '../context.js';
import { addExample, removeExample, status } from '../example.js';
import { handle, jsonBody } from '../http.js';
import { validate } from '../services/util.js';

const AddSchema = z.strictObject({ asOf: z.iso.date('a date, YYYY-MM-DD').optional() });

export function registerExample(app: Hono, ctx: AppContext): void {
  app.get('/api/example', (c) => c.json(status(ctx.store)));

  app.post('/api/example', (c) =>
    handle(c, async () => {
      const { asOf } = validate(AddSchema, await jsonBody(c.req));
      const changed = await addExample(ctx.store, ctx.services, { asOf });
      return { changed, status: status(ctx.store) } satisfies ExampleChanged;
    }),
  );

  app.post('/api/example/remove', (c) =>
    handle(c, async () => {
      validate(z.strictObject({}), await jsonBody(c.req));
      const { skipped, ...changed } = removeExample(ctx.store, ctx.services);
      return { changed, ...(skipped.length ? { skipped } : {}), status: status(ctx.store) } satisfies ExampleChanged;
    }),
  );
}
