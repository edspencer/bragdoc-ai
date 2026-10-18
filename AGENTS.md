# Instructions for agents working in this repository

## Where things stand

BragDoc Local is being rebuilt as a free, open-source, **local-first** achievement tracker: you run it on your own
machine, it keeps your data as plain files in `~/.bragdoc`, and nothing leaves your machine except calls to services
you explicitly connect. v0.1 is built on the **`next`** branch as a series of pull requests, tracked in the epic
[#411](https://github.com/edspencer/bragdoc-ai/issues/411). `main` still holds the old hosted app; never touch it.

What exists so far is the **skeleton** (PR1): the package, build, CI and repo hygiene; a Hono server with
`GET /api/health` and the web app's static serving; and a minimal CLI (`serve`, `--version`, `--help`). PR3 added
the file store: the data home's schemas (`shared/schema/`), the store and its index, the watcher, evidence files,
backups, and the services every feature calls. PR2 added the platform: the localhost security guard, config.yaml, the
data home's layout, runtime.json, egress, subprocesses and the event stream. PR5 added the full CLI and `bragdoc
service`. And the **web foundation** (PR4): the Scrapbook component kit, the light / system / dark themes, the app
shell with placeholder pages, the typed API client and the screenshot rig. PR9 added the MCP server (`/mcp`), the
stdio bridge (`bragdoc mcp`), `bragdoc mcp install claude` and the agent guide (`AGENT-GUIDE.md`, `bragdoc guide`).
PR7 built the **Board**: the achievements and evidence API, link previews, store changes forwarded live to the
browser, and the board page (composer, cards, edit drawer, search). PR11 added OCR and the screenshot rules, as a
library (`server/ocr/`, `shared/rules/screenshot.ts`) that the screenshots source builds on. Everything else arrives
PR by PR, in the waves #411 lays out.

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
                     test/fixtures/services/), path.ts (the PATH captured at install), runner.ts (the injectable Runner
                     / Streamer, defaulting to proc.ts), index.ts (which manager this OS has; Windows: not yet)
  index.ts           createApp (routes → JSON 404 for /api/* → static files → SPA fallback) and startServer
  context.ts         AppContext: what every route module gets (version, dataDir, config, bus, egress, runtime,
                     uploads, notices, store, services)
  http.ts            helpers for route modules: apiError, storeError (the store's errors → 400/404/409), handle (run a
                     route's work, answer JSON or the store error), jsonBody
  gitremote.ts       a repo folder's remote, from that one repo's git config: no scan, no subprocess (D46)
  mcp/               the MCP server (SPEC R11, D40–D44): index.ts (the SDK's stateless handler, resource-updated
                     notifications from the store), tools.ts (the tools, resource and prompts, over ctx.services),
                     views.ts (bragdoc_get_context: the house style, the rules, compact views), bridge.ts (`bragdoc mcp`)
  guide.ts           renders AGENT-GUIDE.md (live facts, its generated reference), /llms.txt and the --snippet
  security.ts        the guard on every request: Host allow-list, same-origin Origin, Fetch Metadata, JSON-only or
                     opt-in typed uploads, body limits, security headers + CSP; blobHeaders() for evidence (D10, D26)
  bind-safety.ts     refuses a non-loopback --host without BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1
  config.ts          config.yaml: Zod schema, defaults, the schemaVersion downgrade guard, live re-read (ConfigStore)
  home.ts            the data home's layout and .gitignore on first run; moves the old CLI's files into legacy-cli/
  runtime.ts         runtime.json (0600): pid, port, url and the MCP token, which survives restarts; constantTimeEqual
  egress.ts          the ONLY outbound network path: egressFetch({purpose}, url), allow-list, logs/network.jsonl;
                     plus probeLoopback()/loopbackAccepts(), the CLI's unlogged 127.0.0.1-only readiness probe (D51)
  proc.ts            the ONLY way to run a program: run(), runAttached() (forwards SIGINT/TERM/HUP), launch()
                     (detached, for --open); allow-listed binaries, no shell
  events.ts          the event bus + the SSE stream (GET /api/events)
  live.ts            forwards every store change onto the bus as a ServerEvent named after its entity (D48)
  link-preview.ts    LinkPreviews: the GitHub PR lookup POST /api/link-preview uses, once a GitHub source registers one
  views.ts           how achievements look in the API: achievementView() (+ etag, files, broken), evidenceFile()
  atomic.ts          the platform's own writes (runtime.json, the network log, starter files): atomic, create-only (D27)
  routes/index.ts    registerRoutes(): one line per feature module (D18)
  routes/health.ts   GET /api/health
  routes/{events,meta,network}.ts   GET /api/events, /api/meta, /api/network-log
  routes/mcp.ts      /mcp: the bearer token (runtime.json), 405 on GET/DELETE, then server/mcp/
  routes/guide.ts    GET /agent-guide.md, /llms.txt, /llms-full.txt
  routes/{achievements,evidence,link-preview,problems,found-count}.ts   the board's API (see "The board's API")
  paths.ts           package root, VERSION, WEB_DIST, the data home (resolveDataDir), tildify
  port.ts            DEFAULT_PORT (2724 = BRAG), alone so vite.config.ts can import it
  store/             the only code that touches the data home's files (D5, D24): index.ts (Store: load, index,
                     Problems, write/remove/restore), safefs.ts (atomic writes, nothing deleted), yamldoc.ts
                     (comment-preserving edits, front-matter), files.ts (paths), blobs.ts (evidence files), search.ts
                     (MiniSearch), watch.ts (chokidar), backups.ts (snapshots), errors.ts
  services/          the operations HTTP and MCP both call: achievements, projects/companies/repos (catalog.ts),
                     evidence, found, profile; createServices(store)
  ocr/               reading text in images, locally (D52): index.ts (createOcr: engine choice and fallback, one read
                     at a time, cache by sha256; evidenceOcrCache keeps evidence text in its sidecar), tesseract.ts
                     (tesseract.js + the package's English data) and tesseract-worker.ts (its worker, with no network),
                     vision-macos.ts (Apple Vision through a JXA script on osascript), image.ts (upscaling small PNGs)
shared/              code used by both server/ and src/: no Node or DOM APIs
  api.ts             the HTTP API contract (request/response types, ApiError)
  schema/            the data files' Zod schemas and types (PR3 owns it), the services' input schemas (inputs.ts), the
                     Problem and StoreChange types, and the generated file-format reference (reference.ts)
  ulid.ts, impact.ts, judge.ts   ids; the 1–10 impact scale; the (unimplemented) AI judge seam (D8)
  links.ts           parsePrUrl (→ owner/repo#n and `github_pr:` key), isHttpUrl, githubRepoOf, parsePrKey
  rules/screenshot.ts "is this screenshot praise for me?" from OCR text: plain rules, never a model (D52)
src/                 the web app (React 19, Vite, Tailwind v4, TanStack Router + Query), built into dist/web
  main.tsx           fonts, ThemeProvider, QueryClient, router
  routes/            file-based routes (TanStack Router; tsr.config.json); __root.tsx is the shell
  kit/               the Scrapbook component kit: import from kit/index.ts (see "The web app" below)
  shell/             the header, mobile tabs, theme toggle, logo, nav and settings-tab lists, Placeholder
  board/             the board's pieces: composer.ts (paste/drop/upload logic), DropTray, AchievementCard, EditDrawer,
                     pickers (projects, repos, impact), evidence.ts (stored evidence → the kit's EvidenceView)
  api/               client.ts (the typed `api` wrapper), queries.ts (query keys + hooks), events.ts (live updates)
  theme/theme.tsx    light / system / dark: ThemeProvider + useTheme()
  lib/               pure helpers, unit-tested: colour.ts (inkOn, swatches, tilt), dates.ts (groupByWeek, fmt), gantt.ts
                     (the Projects timeline's window, gridlines, bars, rows and swimlanes)
  projects/          the Projects page's pieces: Gantt, ProjectDialog, CompanyDialog, Pile, ReposPanel
  dev/Kit.tsx        /dev/kit, every kit component on one page (dev and BRAGDOC_KIT=1 builds only, D33)
  styles.css         the Scrapbook tokens (light + lamplight), mapped to Tailwind names through `@theme inline`
public/              static files copied into dist/web: theme-init.js (the theme before first paint) and the
                     favicons (generated from brand/). Only content-hashed names under /assets/ are cached as
                     immutable; anything else is revalidated
brand/               the mark (mark.svg) and generate.mjs, which makes the favicons, icons and social cards
tools/docs-media/    the screenshot rig: `npm run docs:media` (shots.ts lists the shots; it scans each for leaks)
test/                node:test suites, run from source via tsx; fixture.ts has the throwaway-dir helpers
e2e/                 Playwright specs, run against the built server (playwright.config.ts)
scripts/             start.mjs (npm start), dev.mjs (npm run dev), check-no-nul-bytes.mjs, sync-reference.ts,
                     store-demo.ts, whats-new-release.mjs (heads the docs site's What's new at `changeset:version`);
                     the release's: build-info.mjs (dist/build-info.json), strip-maps.mjs,
                     smoke-pack.mjs (npm run smoke:pack), smoke-image.sh (a built Docker image, in CI)
.changeset/          pending changelog entries (`npm run changeset`); config.json versions against next
.github/workflows/   ci.yml (every push and PR); release.yml (manual only, dry run by default: RELEASING.md)
Dockerfile           the image (Docker on your laptop, D14); compose.yaml runs it with ~/.bragdoc at /data
docs/                decisions.md (D1…), data-format.md (the file format; its reference tables are generated)
website/             the documentation site (Astro + Starlight, its own package: never part of the app's build or
                     tarball). Rules in website/CLAUDE.md; test/docs.test.ts keeps its facts in step with the app
```

## Commands

```sh
npm ci                 # from a checkout (env -u NODE_ENV if your shell exports NODE_ENV=production)
npm run dev            # Vite with hot reload on $PORT (2724) + the API (tsx watch) on the next port up
npm start              # build if stale, then run the compiled CLI (`npm start -- --port 5050`, …)
npm run bragdoc -- <args>   # the CLI from source (tsx)
npm run check:nul      # no raw NUL bytes in JS/TS sources
npm run typecheck      # regenerates the route tree, then tsc for server, tools (e2e, tools/) and web
npm test               # node:test, from source via tsx
npm run build          # dist/web (Vite) + dist/server, dist/shared (tsc), source maps stripped, dist/build-info.json
npm run smoke:pack     # pack, install globally into a temp prefix with a throwaway HOME, run it, fetch from it
npm run changeset      # add a changelog entry for a user-visible change
docker compose up -d --build   # the Docker image from this checkout, on 127.0.0.1:2724 with your ~/.bragdoc
npm run test:e2e       # Playwright against the built server (run `npm run build` first)
npm run routes         # regenerate src/routeTree.gen.ts by hand (typecheck, dev and build do it anyway)
npm run docs:media     # build with /dev/kit, boot a throwaway instance, take every shot in tools/docs-media/shots.ts
npm run brand          # regenerate the favicons, icons and social cards from brand/mark.svg
npm run sync:reference # regenerate the reference tables in docs/data-format.md, AGENT-GUIDE.md and the docs site's
                       # copy after a schema change
(cd website && npm install && npm run build && npm run check-links && npm run check-external)   # the docs site
npm run store:demo     # the file store end to end on a throwaway data home (seed, index stats, watcher events)
npm run eval:screenshots -- --ocr   # the screenshot rules' precision and recall on the synthetic screenshots
                       # (test/screenshots.ts), read by real OCR; without --ocr, on perfect text (fast)
npm run bragdoc -- dev ocr <image>  # which OCR engine ran, the text, and what the rules made of it
```

**The definition of done** for every PR: `npm run check:nul && npm run typecheck && npm test && npm run build &&
npm run smoke:pack` pass locally (and `npm run test:e2e` if you touched anything it covers), and CI is green.

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
  409 (`handle()` / `storeError()` in `server/http.ts` do this). Reads that need no logic can use `ctx.store` (`get`, `all`, `problems()`, `search`, `achievementIdsIn`). What
  `get`/`all` return are the index's own objects: **never mutate them** (copy first). Pass the client's `If-Match` to
  updates from the UI (every entry has an `etag`), so an edit made against a stale copy is a 409, not a silent
  overwrite. Serving evidence files: trust only an allow-list of types from the sidecar's `mime` (a sidecar is
  hand-editable), with the blob headers from SECURITY.md.
- **Live updates:** `ctx.store.subscribe(fn)` hears every change as a `StoreChange` (`shared/schema/change.ts`),
  whether BragDoc wrote it or a hand edit did; the watcher runs under `startServer`. Our own writes are one event each.
  `server/live.ts` already forwards them all to the browser (`{ type: 'achievement' | 'project' | … | 'problems' }`,
  debounced per type, D48): don't add another forwarder. A page that shows store data just needs query keys that start
  with the matching prefix in `CHANGE_INVALIDATES` (`achievements`, `projects`, `repos`, `companies`, `found`,
  `profile`, `problems`).
- **A field on a data file:** add it as optional (or with a default) to its schema in `shared/schema/`, with a
  `.describe()` sentence, run `npm run sync:reference`, and don't bump `schemaVersion` (D23). Never redefine a type.
- **A page:** add a file under `src/routes/` (TanStack file routes: `found.tsx` → `/found`,
  `settings/$tab.tsx` → `/settings/:tab`). The route tree regenerates itself; it's gitignored (D20), so it never
  conflicts. PR4 left a placeholder in each of the v0.1 pages (`<Placeholder>`): replace it. Build pages from the kit
  (below), never from raw colours.
- **An API call from the web app:** a typed function at the bottom of `src/api/client.ts` (`export const
  getThings = () => api.get<ThingsResponse>('/api/things')`), its query key and hook in `src/api/queries.ts`, and,
  if the server sends `change` events for it, its `ServerEvent` type in `CHANGE_INVALIDATES` (`src/api/events.ts`).
- **A CLI flag:** add it to `VALUE_FLAGS` or `BOOLEAN_FLAGS` in `server/args.ts` and to the command's `check()` list
  in `cli.ts`, then document it in `USAGE`.
- **Anything a user can see from outside** (a command, a `serve` flag, a `BRAGDOC_*` variable, an MCP tool, a file
  field): document it on the docs site too (`website/src/content/docs/reference/`, `agents/mcp.md`; rules in
  `website/CLAUDE.md`). `test/docs.test.ts` fails on a command, `serve` flag, env var or (once `server/mcp/` exists)
  MCP tool the site doesn't list. A page about a feature you've just built loses its "Coming in v0.1" note.
- **An MCP tool:** register it in `server/mcp/tools.ts` (verb_noun, `bragdoc_` prefix, a description written for
  tool search, a strict input schema, `run(…)` for the error mapping), calling `ctx.services`; add it to `TOOLS` in
  test/mcp.test.ts and to the MCP table in AGENT-GUIDE.md (test/guide.test.ts checks). New HTTP routes go in the guide's
  "The HTTP API" table too.
- **A decision:** append to `docs/decisions.md` with the next free D-number at rebase time.
- **Dependencies:** each PR adds its own. On a lockfile conflict, regenerate it (`npm install`), never hand-merge it.
  Only what the server needs at run time is a `dependency`; React and everything bundled into `dist/web` is a
  `devDependency`.

### The web app

**The look is Scrapbook v2** (the design prototype): a pinboard of taped cards, photo prints, sticky notes and
project-colour tape, on an oat board (light) or a dim cork board under a desk lamp ("lamplight", dark).

- **Colours are tokens**, as Tailwind names: `bg-surface` (card stock), `bg-sunk`, `text-ink`, `text-muted`,
  `text-faint`, `border-line`, `bg-accent` / `text-accent-ink` (tomato), `bg-print`, `bg-sticky`, `bg-slab`,
  `text-good` / `text-warn` / `text-bad`. They switch with the theme by themselves; `dark:` exists for the rare
  exception. Fonts: `font-sans` (Instrument Sans, the default), `font-grotesk` (headings), `font-hand` (Caveat),
  `font-mono` (Geist Mono). All self-hosted; never add a font or anything else from a CDN.
- **Project colours are data, and any colour.** Paint them with `style`, and put text on them with `inkOn(hex)`
  (`src/lib/colour.ts`), which picks whichever of near-black and white reads better (at least ~4.2:1, D34). `safeColour()` guards
  anything read from a file.
- **CSP:** no inline `<script>`, `<style>` or `style=""` in HTML, and no library that injects a `<style>` tag at run
  time. React's `style={{…}}` prop is fine (it sets styles through the CSSOM, which the CSP allows); e2e checks every
  page under the production CSP.
- **Theme:** `useTheme()` gives `{ pref, setPref, dark }`. The choice is in localStorage (`bragdoc.theme`);
  `public/theme-init.js` applies it before first paint, so keep the two in step (`test/web.test.ts` checks).
- **AI is off** and v0.1 has none: no AI badge, chip, score or "confidence" anywhere in the UI (D8).

**The kit** (`src/kit/index.ts`; see each on `/dev/kit` under `npm run dev`):

| Group | Components |
|---|---|
| Paper | `Card` (taped card: `tape`, `tapeAt`, `tiltId`, `fresh`), `Panel` (forms/settings sheet), `Masonry` (1/2/3 columns), `Tape`, `Print` (photo print + lightbox; `full` for a separate full-size source; draws "can't be shown" for a broken picture), `Lightbox`, `PdfPage`, `Sticky`, `StickyQuote`, `Stamp`, `Receipt`, `Ruled` |
| Type | `PageTitle` (title, `hand` aside, `sub`, `right` actions), `SectionTitle`, `Kicker`, `Hand`, `WeekHeader` (for `groupByWeek` groups) |
| Controls | `Btn` (`accent` · `go` · `paper` · `ink` · `ghost` · `danger`; `size="sm"`), `LinkBtn` (a router link styled as a button), `btnClass()`, `Switch`, `Field` (label, `hint`, `error`), `TextInput`, `TextArea`, `inputCls`, `FilterChip`, `CountBadge`, `Dot`, `ColourPicker` (12 swatches + any colour) |
| Tags | `ProjectPill` (`name`, `color`, `active`, `onClick`), `RepoTag`, `ImpactBadge` (1–10), `ProvenanceBadge` (`github` · `screenshot` · `mcp` + `agent` · `import`; `soft` on cards, `solid` on Found), `PROVENANCE` (labels and colours for filter rows) |
| Evidence | `EvidenceBit` (draws an `EvidenceView`: `image` · `pdf` · `file` · `link` · `github_pr` · `quote`), and each kind alone: `PrSlab` (shows `owner/repo#n` without a title), `LinkCard`, `PdfChip`, `FileChip`; `formatBytes`, `domainOf` |
| Feedback | `ToastProvider` (in the shell) and `useToast()`: `toast({ msg, undo?, tone? })`; `Dialog` (a modal sheet on the native `<dialog>`: `open`, `onClose`, `title`, `footer`, `tape`, `size`) |
| Navigation | `NotebookTabs` + `NotebookTab` (Settings' divider tabs; router links) |

Shell pieces in `src/shell/`: `Header` and `MobileTabs` (the nav; the Found badge reads `useFoundCount()`, a stub
until PR13), `ThemeToggle`, `Mark` / `Wordmark`, `NAV` and `SETTINGS_TABS`, `Placeholder`. Dates: `groupByWeek`,
`weekLabel`, `fmt.*`, `todayIso` in `src/lib/dates.ts` (calendar days, weeks from Monday).

**The API client** (`src/api/client.ts`): `api.get/post/put/patch/delete<T>(path, …)` send and receive JSON
(same-origin, relative paths) and reject with an `ApiRequestError` carrying the envelope's `code` and `message` and
the HTTP `status`; `code: 'network'` (status 0) means the server didn't answer. `api.upload<T>(path, file)` sends a
typed upload (raw bytes, the file's type, never a CORS-safelisted one, `X-Filename`). `isApiError(e, code?)` narrows.
The `QueryClient` (`createQueryClient()` in `queries.ts`) doesn't retry 4xx. `useServerEvents()` (mounted in the
shell) refreshes queries from the server's SSE `change` events (a `ServerEvent`, by its `type`) by their key's first
segment, and everything on `hello` after a reconnect.

### The board's API (PR7)

What Found (PR13), Folio (PR14) and MCP build on. Types are in `shared/api.ts` ("board (PR7)"); request bodies are
the services' input schemas.

| Route | What |
|---|---|
| `GET /api/achievements` | `AchievementsPage`: whole weeks (Monday start), newest first; `q`, `projectId`, `repoId`, `companyId`, `from`, `to`, `archived` (`exclude`·`include`·`only`), `source`, `minImpact`, `weeks` (default 8), `before` (the previous page's `nextBefore`). Search results are by date too, so weeks stay whole |
| `GET /api/achievements/:id` | one `AchievementView`: the achievement + `etag` + `files` (sidecars of its evidence files, by sha) + `broken`/`readOnly` |
| `POST /api/achievements` | `AchievementCreate` → 201 `{ achievement, created: true }`, or 200 `created: false` when its top-level `externalKey` (or `legacyId`) is already on the board |
| `PATCH /api/achievements/:id` | `AchievementUpdate` with `If-Match: <etag>` → the new view; a stale ETag is 409 `conflict` (with the current `ETag` header) |
| `POST /api/achievements/:id/{archive,unarchive,remove,restore}` | remove moves the file to `backups/removed/` (`{ removedTo }`; takes `If-Match`), restore brings the newest copy back |
| `POST /api/evidence` | a typed upload (raw bytes, Content-Type, URI-encoded `X-Filename`) → `{ evidence, file, created }`: an Evidence item with a fresh id, on no achievement yet (send it in `evidence`). 413 over 25 MB; 415 `type_mismatch` / `damaged` (D50) |
| `GET /api/evidence/:sha` · `/thumb` | the file with the blob headers (non-pictures download); `/thumb` is pictures only (D49) |
| `POST /api/link-preview` | `{ url }` → `LinkPreview`: a PR → `owner/repo#n`, its `github_pr:` key (lower case: build keys with `prKey()` from `shared/links.ts`), the matching repo, its projects as suggestions, `onBoard`; a title only via `ctx.linkPreviews.setGithub(lookup)` (PR13 registers it). Other URLs → domain only, never fetched |
| `GET /api/projects` · `/api/repos` | PR8's (`server/routes/catalog.ts`): `ProjectEntry` / `RepoEntry` with `etag` (projects also `achievements`, a count); the board's pickers read them |
| `GET /api/problems` · `/api/found/count` | the Problems list; `{ pending }` for Found's strip and badge |

Errors from the store map through `storeErrorResponse(c, e)` in `server/http.ts` (404 / 400 with `issues` / 409).
In the web app: `getAchievements` … `previewLink` in `src/api/client.ts`, `useAchievements` (an infinite query over
`before`), `useProjects`, `useRepos`, `useProblems`, `useFoundCount` in `queries.ts`.

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
  elements you assert on a `data-testid`. `e2e/shell.spec.ts` checks every page under the production CSP with a
  clean console and no third-party requests: add new pages to its `PAGES`.
- `test/web.test.ts` builds the web app into a temp dir and fails on any `http(s)://` URL in the bundle outside its
  allow-list, on inline scripts in `index.html`, and on `/dev/kit` leaking into a release build.

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
  for paths, hostnames and real names: the repo is public. `npm run docs:media` takes repeatable ones on a throwaway
  home and refuses to write a shot whose text looks like a path, a private address or a real email
  (`tools/docs-media/leaks.ts`).

### Branches, PRs and issues

- v0.1 work: branch `v01/<n>-<slug>` from the latest `origin/next`, PR into `next`, `Refs #411` in the body.
  Other work: a descriptive branch off `next`.
- Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`). PRs into `next` are
  squash-merged, so the PR title becomes the commit: make it a conventional one.
- The PR body says what and why, "Adapted from", how you verified it (commands, plus Playwright notes for anything
  visible), and screenshots for UI changes. The template in `.github/` has the sections.
- Never force-push, never push to `main`, never merge your own v0.1 PR.
- Task notes (`tasks/`) and QA scratch (`qa/`, `.qa/`, `.playwright-mcp/`) are gitignored: keep them out of commits.
- A user-visible change adds a changeset (`npm run changeset`, `patch` before 1.0; CONTRIBUTING.md says how to word
  it). Never bump `version` or edit `CHANGELOG.md`: the release does (RELEASING.md). Nothing is published from a
  laptop, ever.
- **Something new the installed package needs at run time** (a file outside `dist/`, a runtime dependency, a binary
  the server runs): add it to `files` or `dependencies`, and to what `npm run smoke:pack` checks. If the server runs
  a binary, the Docker image needs it too (`Dockerfile`'s runtime stage); CI's Docker job will tell you.
