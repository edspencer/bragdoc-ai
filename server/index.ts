// The HTTP app (createApp) and startServer, which binds it. The app is: every route from routes/index.ts, a JSON 404
// for any other /api path, then the built web app (a single-page app) for everything else.
//
// Later PRs wrap this rather than reshape it: PR2 puts its security middleware (Host allow-list, Origin, content
// types, CSP) first with `app.use('*', …)`, and the store, event bus and config arrive as AppContext fields.
import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import type { AppContext } from './context.js';
import { apiError } from './http.js';
import { VERSION, WEB_DIST } from './paths.js';
import { registerRoutes } from './routes/index.js';

export interface AppOptions {
  /** The data home, absolute. */
  dataDir: string;
  /** The built web app to serve (dist/web). Null: API only, as under `npm run dev`, where Vite serves the UI. */
  webDist?: string | null;
  /** Defaults to the package version. */
  version?: string;
}

/**
 * True when the path's last segment has a file extension (`/assets/index-abc.js`, `/favicon.ico`). The SPA fallback
 * uses it to tell a missing static file (→ 404) from a client-side route (→ index.html). Serving the shell for a
 * missing script instead hands the browser HTML with a 200 where it expected JavaScript, which fails far from the
 * cause (Paddock issue #220; D19).
 */
export function hasFileExtension(pathname: string): boolean {
  const last = pathname.slice(pathname.lastIndexOf('/') + 1);
  return /\.[^./]+$/.test(last);
}

/** A Vite output file: `/assets/index-CqW7J_rx.js` (Vite's hashes are 8 base64url characters). */
const HASHED_ASSET = /^\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/;

export function createApp({ dataDir, webDist = WEB_DIST, version = VERSION }: AppOptions): Hono {
  const app = new Hono();
  const ctx: AppContext = { version, dataDir };

  registerRoutes(app, ctx);
  app.all('/api/*', (c) => c.json(apiError('not_found', `no API route ${c.req.method} ${c.req.path}`), 404));

  if (webDist) {
    const index = path.join(webDist, 'index.html');
    // Vite's content-hashed bundles (`/assets/<name>-<hash>.<ext>`) never change, so they're cached for good; anything
    // else in dist/web (the favicon, index.html itself, an unhashed file someone puts in public/assets/) is revalidated,
    // so a new version shows up on the next load.
    app.use('*', async (c, next) => {
      await next();
      if (c.res.ok && !c.req.path.startsWith('/api/') && !c.res.headers.has('Cache-Control'))
        c.res.headers.set('Cache-Control', HASHED_ASSET.test(c.req.path) ? 'public, max-age=31536000, immutable' : 'no-cache');
    });
    app.use('*', serveStatic({ root: webDist }));
    app.on(['GET', 'HEAD'], '*', (c) => {
      // /assets/ is Vite's output and nothing else: a path there that serveStatic didn't find is a missing file
      if (hasFileExtension(c.req.path) || c.req.path === '/assets' || c.req.path.startsWith('/assets/')) return c.text('Not found', 404);
      if (!fs.existsSync(index)) return c.text('The web app is not built. Run `npm run build` (or `npm start`).', 500);
      c.header('Cache-Control', 'no-cache');
      return c.html(fs.readFileSync(index, 'utf8'));
    });
  }
  return app;
}

export interface ServerOptions extends AppOptions {
  /** The address to bind (default 127.0.0.1). */
  hostname?: string;
}

/**
 * Serve the app on `hostname`:`port`. Resolves with the bound port (useful with port 0) and a function that stops it;
 * rejects if it can't bind (EADDRINUSE, EACCES), for the CLI to explain.
 */
export async function startServer(port: number, { hostname = '127.0.0.1', ...opts }: ServerOptions): Promise<{ port: number; close: () => Promise<void> }> {
  const app = createApp(opts);
  return new Promise((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
      server.off('error', reject);
      const close = () =>
        new Promise<void>((res) => {
          server.close(() => res());
          // idle keep-alive connections (and, later, open event streams) would otherwise hold close() open
          if ('closeAllConnections' in server) server.closeAllConnections();
        });
      resolve({ port: info.port, close });
    });
    server.once('error', reject);
  });
}
