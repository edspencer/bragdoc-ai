# Instructions for agents working in this repository

## Where things stand

BragDoc Local is being rebuilt as a free, open-source, **local-first** achievement tracker: you run it on your own
machine, it keeps your data as plain files in `~/.bragdoc`, and nothing leaves your machine except calls to services
you explicitly connect. v0.1 is built on the **`next`** branch as a series of pull requests, tracked in the epic
[#411](https://github.com/edspencer/bragdoc-ai/issues/411). `main` still holds the old hosted app; never touch it.

What exists so far is the **skeleton** (PR1): the package, build, CI and repo hygiene; a Hono server with
`GET /api/health` and the web app's static serving; a minimal CLI (`serve`, `--version`, `--help`); and a placeholder
web shell. PR3 added the file store: the data home's schemas (`shared/schema/`), the store and its index, the
watcher, evidence files, backups, and the services every feature calls. Everything else arrives PR by PR, in the waves
#411 lays out.

Before changing behaviour, read, in order:

1. [spec.md](spec.md): what BragDoc is, the product principles and where the full specification lives.
2. [docs/decisions.md](docs/decisions.md): the numbered decisions (D1…), with their reasons.
3. Your PR's brief in #411, if you're building one.

The human-facing version of these conventions is [CONTRIBUTING.md](CONTRIBUTING.md).

## Working rules

These are the product principles from the specification. They are not up for negotiation in a PR.

- **AI is off by default, and every AI feature is an explicit opt-in (D8).** v0.1 has no AI features and no AI
  dependencies. Never install Ollama or download a model; at most detect an existing install, explain what it would
  download, and act only after the user confirms. Every non-AI path must work fully on its own.
- **No telemetry, no update check (D9).** All outbound HTTP goes through `server/egress.ts` (PR2) and is logged;
  subprocesses run only through `server/proc.ts` (PR2). The guard tests enforce both. **Never weaken a guard test to
  make something pass.**
- **Localhost security (D10).** Bind `127.0.0.1`; Host allow-list; Origin checks on writes and SSE; JSON or typed
  uploads only; a strict CSP with **no inline scripts or styles** (`script-src 'self'`); a bearer token for MCP.
- **Your data is just files (D5).** Every write to the data home goes through the store (`server/store/`, PR3);
  nothing else writes files there. Invalid hand edits become Problems; they never crash the app and are never
  overwritten.
- **Nothing reaches the board without the user (D11).** What BragDoc finds goes to Found. MCP writes are the one
  configurable exception.
- **Carry over nothing from the old hosted app (D2).** No code, prompts or copy from `main`. The importer (PR12) reads
  the old export *format*, and that's all.
- **Adapt, don't invent (D3).** When Hallway, Local Review or Paddock already solves something, start from its file,
  and list it under "Adapted from" in the PR body.
- **Keep it generic; the repo is public.** Examples, fixtures, screenshots and docs use placeholders (`Alex Marlowe`,
  `example.com`, `~/Code/my-app`), never a real person, machine, hostname, private path or secret.
- **Record decisions.** If you settle something the spec leaves open, or deviate from your brief, add a decision to
  `docs/decisions.md` (append only, next free number) and say so in the PR body.
- Personal, machine-specific rules go in a git-ignored `CLAUDE.local.md` next to this file.

## Layout

```
server/              the server and CLI (Node, TypeScript ESM, Hono)
  cli.ts             `bragdoc` entry point (the package's bin) and `serve`; args.ts parses arguments; banner.ts is
                     what `serve` prints at startup ("BragDoc on <url>" first, always); node-version.ts the Node check
  commands/          every other command, one file each, one line in commands/index.ts (Hallway's shape); context.ts
                     is the injectable Ctx (runner, probe, clock), ready.ts the /api/health probe and readiness wait
  platform/          `bragdoc service`: spec.ts (what the service is), launchd.ts / systemd.ts (the writers, pinned by
                     test/fixtures/services/), path.ts (the PATH captured at install), runner.ts (its subprocesses;
                     interim, until it moves onto proc.ts: D32), index.ts (which manager this OS has; Windows: not yet)
  index.ts           createApp (routes → JSON 404 for /api/* → static files → SPA fallback) and startServer
  context.ts         AppContext: what every route module gets (version, dataDir, config, bus, egress, runtime,
                     uploads, notices, store, services)
  http.ts            helpers for route modules (apiError)
  security.ts        the guard on every request: Host allow-list, same-origin Origin, Fetch Metadata, JSON-only or
                     opt-in typed uploads, body limits, security headers + CSP; blobHeaders() for evidence (D10, D26)
  bind-safety.ts     refuses a non-loopback --host without BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1
  config.ts          config.yaml: Zod schema, defaults, the schemaVersion downgrade guard, live re-read (ConfigStore)
  home.ts            the data home's layout and .gitignore on first run; moves the old CLI's files into legacy-cli/
  runtime.ts         runtime.json (0600): pid, port, url and the MCP token, which survives restarts; constantTimeEqual
  egress.ts          the ONLY outbound network path: egressFetch({purpose}, url), allow-list, logs/network.jsonl
  proc.ts            the ONLY way to run a program: run()/runAttached(), allow-listed binaries, no shell
  events.ts          the event bus + the SSE stream (GET /api/events)
  atomic.ts          the platform's own writes (runtime.json, the network log, starter files): atomic, create-only (D27)
  routes/index.ts    registerRoutes(): one line per feature module (D18)
  routes/health.ts   GET /api/health
  routes/{events,meta,network}.ts   GET /api/events, /api/meta, /api/network-log
  paths.ts           package root, VERSION, WEB_DIST, the data home (resolveDataDir), tildify
  port.ts            DEFAULT_PORT (2724 = BRAG), alone so vite.config.ts can import it
  store/             the only code that touches the data home's files (D5, D24): index.ts (Store: load, index,
                     Problems, write/remove/restore), safefs.ts (atomic writes, nothing deleted), yamldoc.ts
                     (comment-preserving edits, front-matter), files.ts (paths), blobs.ts (evidence files), search.ts
                     (MiniSearch), watch.ts (chokidar), backups.ts (snapshots), errors.ts
  services/          the operations HTTP and MCP both call: achievements, projects/companies/repos (catalog.ts),
                     evidence, found, profile; createServices(store)
shared/              code used by both server/ and src/: no Node or DOM APIs
  api.ts             the HTTP API contract (request/response types, ApiError)
  schema/            the data files' Zod schemas and types (PR3 owns it), the services' input schemas (inputs.ts), the
                     Problem and StoreChange types, and the generated file-format reference (reference.ts)
  ulid.ts, impact.ts, judge.ts   ids; the 1–10 impact scale; the (unimplemented) AI judge seam (D8)
src/                 the web app (React 19, Vite, Tailwind v4, TanStack Router + Query), built into dist/web
  main.tsx           QueryClient + router
  routes/            file-based routes (TanStack Router; tsr.config.json); __root.tsx is the shell
  styles.css         Tailwind entry (PR4 adds the Scrapbook tokens)
public/              static files copied into dist/web (favicon.svg). Only content-hashed names under /assets/ are
                     cached as immutable; anything else is revalidated
test/                node:test suites, run from source via tsx; fixture.ts has the throwaway-dir helpers
e2e/                 Playwright specs, run against the built server (playwright.config.ts)
scripts/             start.mjs (npm start), dev.mjs (npm run dev), check-no-nul-bytes.mjs, sync-reference.ts,
                     store-demo.ts
docs/                decisions.md (D1…), data-format.md (the file format; its reference tables are generated)
```

Coming soon, so you know where things go: the Scrapbook kit under `src/` and `tools/docs-media/` (PR4), the release
machinery and `Dockerfile` (PR6), `website/` (PR18).

## Commands

```sh
npm ci                 # from a checkout (env -u NODE_ENV if your shell exports NODE_ENV=production)
npm run dev            # Vite with hot reload on $PORT (2724) + the API (tsx watch) on the next port up
npm start              # build if stale, then run the compiled CLI (`npm start -- --port 5050`, …)
npm run bragdoc -- <args>   # the CLI from source (tsx)
npm run check:nul      # no raw NUL bytes in JS/TS sources
npm run typecheck      # regenerates the route tree, then tsc for server + web
npm test               # node:test, from source via tsx
npm run build          # dist/web (Vite) + dist/server, dist/shared (tsc)
npm run test:e2e       # Playwright against the built server (run `npm run build` first)
npm run routes         # regenerate src/routeTree.gen.ts by hand (typecheck, dev and build do it anyway)
npm run sync:reference # regenerate the reference tables in docs/data-format.md after a schema change
npm run store:demo     # the file store end to end on a throwaway data home (seed, index stats, watcher events)
```

**The definition of done** for every PR: `npm run check:nul && npm run typecheck && npm test && npm run build` pass
locally (and `npm run test:e2e` if you touched anything it covers), and CI is green.

## Conventions

### Adding things (the seams the parallel PRs build on)

- **An HTTP route:** write `server/routes/<feature>.ts` exporting `register<Feature>(app: Hono, ctx: AppContext)`,
  registering full paths (`app.get('/api/things', …)`). Add **one line** to `registerRoutes()` in
  `server/routes/index.ts`, alphabetical by feature. Put request/response types in `shared/api.ts` in a section of
  their own, and errors as `ApiError` (`{ error: { code, message } }`) via `apiError()` from `server/http.ts` (never import `server/index.ts` from a route: it imports the routes). Unknown
  `/api/*` paths already 404 as JSON.
- **Something routes need from the server** (the store, the event bus, config): add a field to `AppContext`
  (`server/context.ts`), one line each, and set it in `createApp()`.
- **Middleware that wraps everything:** `app.use('*', …)` in `createApp()`, after the security guard and before
  `registerRoutes()`. Never ahead of the guard.
- **An outbound request:** `ctx.egress.egressFetch({ purpose: 'github.pulls' }, url, init)`, never `fetch`; if it needs a
  new host, extend `egressAllowList()` in `server/egress.ts`, derived from config, never a constant. **A subprocess:**
  `run('gh', args)` from `server/proc.ts`; a `gh` call that reaches the network is also logged with
  `ctx.egress.logProcess(…)`. `test/guard-egress.test.ts` enforces both.
- **A route that takes a raw upload** (an image, a PDF) instead of JSON: call `ctx.uploads.accept({ method, path,
  types, maxBytes })` in its register function. Never a CORS-safelisted type.
- **Something the web app should refetch when it changes:** add a member to `ServerEvent` in `shared/api.ts` and
  `ctx.bus.emit(…)` (or `emitSoon` for bursts).
- **Reading or writing data:** routes and MCP tools call `ctx.services` (`server/services/`), never the files and
  never `ctx.store.write` directly. Validate request bodies with the input schemas in `shared/schema/inputs.ts`
  (strict: unknown keys are errors) or let the service do it. Map the store's errors (`server/store/errors.ts`):
  `NotFoundError` → 404, `ValidationError` → 400 (its `issues` say which keys), `ConflictError` and `ReadOnlyError` →
  409. Reads that need no logic can use `ctx.store` (`get`, `all`, `problems()`, `search`, `achievementIdsIn`). What
  `get`/`all` return are the index's own objects: **never mutate them** (copy first). Pass the client's `If-Match` to
  updates from the UI (every entry has an `etag`), so an edit made against a stale copy is a 409, not a silent
  overwrite. Serving evidence files: trust only an allow-list of types from the sidecar's `mime` (a sidecar is
  hand-editable), with the blob headers from SECURITY.md.
- **Live updates:** `ctx.store.subscribe(fn)` hears every change as a `StoreChange` (`shared/schema/change.ts`),
  whether BragDoc wrote it or a hand edit did; the watcher runs under `startServer`. Our own writes are one event each.
- **A field on a data file:** add it as optional (or with a default) to its schema in `shared/schema/`, with a
  `.describe()` sentence, run `npm run sync:reference`, and don't bump `schemaVersion` (D23). Never redefine a type.
- **A page:** add a file under `src/routes/` (TanStack file routes: `found.tsx` → `/found`,
  `settings/$tab.tsx` → `/settings/:tab`). The route tree regenerates itself; it's gitignored (D20), so it never
  conflicts.
- **A CLI flag:** add it to `VALUE_FLAGS` or `BOOLEAN_FLAGS` in `server/args.ts` and to the command's `check()` list
  in `cli.ts`, then document it in `USAGE`.
- **A decision:** append to `docs/decisions.md` with the next free D-number at rebase time.
- **Dependencies:** each PR adds its own. On a lockfile conflict, regenerate it (`npm install`), never hand-merge it.
  Only what the server needs at run time is a `dependency`; React and everything bundled into `dist/web` is a
  `devDependency`.

### Code

- **Server imports use `.js` extensions** (NodeNext); tests and `src/` import `.ts` files directly. The build
  rewrites them.
- **CLI exit codes:** 0 success, 1 error, 2 usage error (with the usage printed). Throw `UsageError`
  (`server/args.ts`) for bad usage, a plain `Error` otherwise; `cli.ts` turns them into messages and exit codes. Set
  `process.exitCode`, never call `process.exit()` (it can cut off piped output).
- **The default port is one constant**, `DEFAULT_PORT` in `server/port.ts`. Never auto-pick another port (D6).
- **No environment variable is required** for normal operation: services and agents' shells start with an empty
  environment. `BRAGDOC_HOME`, `PORT` and friends are overrides only.
- **Comments explain why**, and cite decisions as `(D6)`. Keep the sibling projects' hard-won comments when adapting
  their files.
- TypeScript strict, ESM, React function components. No separate linter or formatter: match the surrounding code.

### Tests

- node:test via tsx (`test/*.test.ts`). Test the HTTP app in-process with `createApp(...).request(path)`; test the CLI
  as a child process (`test/cli.test.ts` shows how).
- **Tests never touch a real home or data home.** Use `storeHome()` from `test/store-fixture.ts` for a store (with
  services, a fake clock and a `put()` for hand edits), and `tmpDir()` / `tmpHome()` from `test/fixture.ts`, and pass
  `tmpHome().env` to any child process (it points `HOME`, `XDG_*` and `BRAGDOC_HOME` into a temp dir).
- e2e specs go in `e2e/` and run against the built server on a throwaway home (`playwright.config.ts`). Give
  elements you assert on a `data-testid`.

### QA with a throwaway HOME

Driving the real app by hand (or with an agent) must never touch your real `~/.bragdoc`, `~/.claude`, `gh` login or
service manager:

```sh
export HOME=$(mktemp -d) BRAGDOC_HOME=$HOME/.bragdoc
npm run build && node dist/server/cli.js serve --port 5050
```

- Never run a real `bragdoc service install` or `bragdoc mcp install claude` against your own user: use a throwaway
  `HOME` / `XDG_CONFIG_HOME`, `--dry-run` or `--print`. The service's real lifecycle runs only in CI
  (`scripts/services-real.mjs`, which refuses to run elsewhere); test/service.test.ts covers it with the manager mocked.
- Use a fake `gh` on `PATH` with fixture output, not your own GitHub login.
- To reach a dev build through a reverse proxy: `--host 0.0.0.0` with `BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1`, and (from
  PR2) `BRAGDOC_ALLOWED_HOSTS=<the proxy's hostname>`. Never outside a throwaway instance.
- Confirm the server you're driving is your build (check the served bundle) before trusting a screenshot.
- UI changes ship before / after / control screenshots, light and dark, from synthetic data only. Check every pixel
  for paths, hostnames and real names: the repo is public.

### Branches, PRs and issues

- v0.1 work: branch `v01/<n>-<slug>` from the latest `origin/next`, PR into `next`, `Refs #411` in the body.
  Other work: a descriptive branch off `next`.
- Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`). PRs into `next` are
  squash-merged, so the PR title becomes the commit: make it a conventional one.
- The PR body says what and why, "Adapted from", how you verified it (commands, plus Playwright notes for anything
  visible), and screenshots for UI changes. The template in `.github/` has the sections.
- Never force-push, never push to `main`, never merge your own v0.1 PR.
- Task notes (`tasks/`) and QA scratch (`qa/`, `.qa/`, `.playwright-mcp/`) are gitignored: keep them out of commits.
- Changesets arrive with PR6; until then, user-visible changes say so in the PR body.
