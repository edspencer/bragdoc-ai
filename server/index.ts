// The HTTP app (createApp) and startServer, which boots the platform and binds it. The app is: the security guard
// (security.ts: Host allow-list, Origin, content types, body limits, headers and CSP) on every request, then every
// route from routes/index.ts, a JSON 404 for any other /api path, then the built web app (a single-page app).
//
// createApp() writes no files (it only reads the store), so tests build it freely; startServer() is where the data
// home is laid out, config.yaml is checked and runtime.json is written. Later PRs add to AppContext rather than reshape this.
import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import type { Notice } from '../shared/api.js';
import { ConfigStore } from './config.js';
import type { AppContext } from './context.js';
import { Egress } from './egress.js';
import { EventBus } from './events.js';
import { initHome } from './home.js';
import { apiError } from './http.js';
import { LinkPreviews } from './link-preview.js';
import { forwardStoreChanges } from './live.js';
import { EvidenceText } from './ocr/evidence-text.js';
import { createOcr, evidenceOcrCache, type Ocr } from './ocr/index.js';
import { VERSION, WEB_DIST } from './paths.js';
import { registerRoutes } from './routes/index.js';
import { Runtime, displayUrl } from './runtime.js';
import { Secrets } from './secrets.js';
import { UploadRegistry, security } from './security.js';
import { createServices } from './services/index.js';
import { createSources } from './sources/index.js';
import { startSnapshots } from './store/backups.js';
import { openStore, type Store } from './store/index.js';
import { watchStore } from './store/watch.js';

export interface AppOptions {
  /** The data home, absolute. */
  dataDir: string;
  /** The built web app to serve (dist/web). Null: API only, as under `npm run dev`, where Vite serves the UI. */
  webDist?: string | null;
  /** Defaults to the package version. */
  version?: string;
  /** The live config.yaml (default: one reading `<dataDir>/config.yaml`, which may not exist: the defaults). */
  config?: ConfigStore;
  bus?: EventBus;
  runtime?: Runtime;
  /** Swaps the real network out of the egress module (tests). */
  egress?: Egress;
  /** What starting up had to say (home.ts: the legacy move-aside). */
  startupNotices?: Notice[];
  /** The data home's store; opened (loaded) from `dataDir` when not given. */
  store?: Store;
  /** The GitHub PR lookup behind POST /api/link-preview (tests); a GitHub source registers its own on it. */
  linkPreviews?: LinkPreviews;
  /** The environment the sources run gh with (tests: a fake gh on PATH). Defaults to this process's. */
  env?: NodeJS.ProcessEnv;
  /** The clock the sources use (tests). */
  now?: () => Date;
  /** OCR (tests: fake engines). Default: createOcr() with evidence text cached in sidecars. */
  ocr?: Ocr;
  /** The home folder the screenshots source expands `~/` in and suggests folders from (tests). */
  homedir?: string;
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

export function createApp(opts: AppOptions): Hono {
  return createAppWithContext(opts).app;
}

/** createApp, and the AppContext its routes share: startServer starts and stops what runs in the background (the sources). */
export function createAppWithContext({ dataDir, webDist = WEB_DIST, version = VERSION, startupNotices = [], ...o }: AppOptions): { app: Hono; ctx: AppContext } {
  const app = new Hono();
  const bus = o.bus ?? new EventBus();
  const config = o.config ?? new ConfigStore(dataDir, { onChange: () => bus.emit({ type: 'config' }) });
  const store = o.store ?? openStore(dataDir);
  const services = createServices(store);
  // one OCR queue for the whole app (SPEC R8): a burst of screenshots and a pasted picture take turns
  const ocr = o.ocr ?? createOcr({ cache: evidenceOcrCache(store, services) });
  const base: Omit<AppContext, 'sources'> = {
    version,
    dataDir,
    config,
    bus,
    egress: o.egress ?? new Egress({ dataDir, config: () => config.get(), onLog: () => bus.emitSoon('network', { type: 'network' }) }),
    runtime: o.runtime ?? new Runtime(dataDir),
    uploads: new UploadRegistry(),
    notices: () => [...startupNotices, ...config.notices()],
    store,
    services,
    linkPreviews: o.linkPreviews ?? new LinkPreviews(),
    secrets: new Secrets(dataDir),
    ocr,
    evidenceText: new EvidenceText({ store, services, ocr }),
  };
  const ctx: AppContext = { ...base, sources: createSources(base, { env: o.env, now: o.now, homedir: o.homedir }) };
  // every change to a data file (ours, an agent's over MCP, a hand edit the watcher saw) reaches open tabs, projects,
  // companies and repos included (PR8's pages), as one event per kind per burst (D48): the one forwarder
  forwardStoreChanges(store, bus);

  // first, so nothing (a route, a static file, the SPA fallback) answers a request it hasn't checked (D10)
  app.use('*', security({ allowedHosts: () => config.allowedHosts(), uploads: ctx.uploads }));
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
    // Only when there's a build: on a missing root, serveStatic prints a warning to stdout, ahead of the "BragDoc on
    // <url>" line that scripts wait for (banner.ts). Without one, the fallback below says how to build.
    if (fs.existsSync(webDist)) app.use('*', serveStatic({ root: webDist }));
    app.on(['GET', 'HEAD'], '*', (c) => {
      // /assets/ is Vite's output and nothing else: a path there that serveStatic didn't find is a missing file
      if (hasFileExtension(c.req.path) || c.req.path === '/assets' || c.req.path.startsWith('/assets/')) return c.text('Not found', 404);
      if (!fs.existsSync(index)) return c.text('The web app is not built. Run `npm run build` (or `npm start`).', 500);
      c.header('Cache-Control', 'no-cache');
      return c.html(fs.readFileSync(index, 'utf8'));
    });
  }
  return { app, ctx };
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
  // config.yaml first, read-only: one from a newer BragDoc refuses to start (ConfigFromTheFuture) before anything in
  // the data home is touched. Then the layout (which moves the old CLI's files aside first), then the MCP token.
  const bus = opts.bus ?? new EventBus();
  const config = opts.config ?? new ConfigStore(opts.dataDir, { onChange: () => bus.emit({ type: 'config' }) });
  config.load();
  const home = initHome(opts.dataDir);
  config.load(); // initHome may have just written the starter config.yaml
  const runtime = opts.runtime ?? new Runtime(opts.dataDir);
  // the store is loaded before the port is bound, then watched for changes on disk and snapshotted (on start, hourly)
  const store = opts.store ?? openStore(opts.dataDir);
  const { app, ctx } = createAppWithContext({ ...opts, bus, config, runtime, store, startupNotices: [...(opts.startupNotices ?? []), ...home.notices] });
  const version = opts.version ?? VERSION;
  const watcher = watchStore(store);
  const stopSnapshots = startSnapshots(opts.dataDir);
  const stopSources = ctx.sources.start(); // the hourly GitHub check (D57) and the screenshots folder, only if you turned them on
  const stopEvidenceText = ctx.evidenceText.start(); // the board's pictures, read in the background
  const bound = await new Promise<{ port: number; close: () => Promise<void> }>((resolve, reject) => {
    const failed = (e: Error) => {
      stopSnapshots();
      stopSources();
      stopEvidenceText();
      void ctx.ocr.close();
      void watcher.close();
      reject(e);
    };
    const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
      server.off('error', failed);
      const close = async () => {
        stopSnapshots();
        stopSources();
        stopEvidenceText();
        await watcher.close();
        await ctx.ocr.close(); // the tesseract worker thread
        await new Promise<void>((res) => {
          server.close(() => res());
          // idle keep-alive connections (and, later, open event streams) would otherwise hold close() open
          if ('closeAllConnections' in server) server.closeAllConnections();
        });
      };
      resolve({ port: info.port, close });
    });
    server.once('error', failed);
  });
  try {
    runtime.write({ pid: process.pid, port: bound.port, url: displayUrl(hostname, bound.port), version, startedAt: new Date().toISOString() });
  } catch (e) {
    await bound.close(); // a server without its runtime.json would be unreachable for agents: don't leave it running
    throw e;
  }
  return bound;
}
