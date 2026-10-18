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
browser, and the board page (composer, cards, edit drawer, search). PR14 built **Folio**: a date window, filtered,
exported as markdown, copied or printed. PR11 added OCR and the screenshot rules, as a
library (`server/ocr/`, `shared/rules/screenshot.ts`) that the screenshots source builds on. PR13 built **Found** and
the **GitHub source**: the Found page, its API, the source framework (`server/sources/`) and the GitHub card in
Settings → Sources (see "Found and sources" below). PR15 added the **screenshots folder** (a source) and reads the
board's pictures in the background, so their text is searchable. PR16 built **onboarding**: Welcome (the first run, and its steps
again from Settings → Data), the bounded repo scan, and the example data (see "Onboarding and example data" below).
PR19 brought the docs site up to date with what was built, with real screenshots from the capture rig's example world.
PR17 is the v0.1 release candidate: an end-to-end pass over all of it, the fixes it turned up, and the 0.1.0 changeset.
v0.1's feature set is complete. **v0.2 adds opt-in AI** (epic [#434](https://github.com/edspencer/bragdoc-ai/issues/434)),
built on the `v0.2` branch: PR21 laid down the AI core and PR22 the shared plumbing the features use (instructions
files, the AI activity log, live evals; see "AI (v0.2)" below); PR24 the Found judge's engine. Its UI and the other
features follow.

Before changing behaviour, read, in order:

1. [spec.md](spec.md): what BragDoc is, the product principles and where the full specification lives.
2. [docs/decisions.md](docs/decisions.md): the numbered decisions (D1…), with their reasons.
3. Your PR's brief in #411, if you're building one.

The human-facing version of these conventions is [CONTRIBUTING.md](CONTRIBUTING.md).

## Working rules

These are the product principles from the specification. They are not up for negotiation in a PR.

- **AI is off by default, and every AI feature is an explicit opt-in (D8).** v0.1 has no AI features; v0.2 adds them
  behind a master switch and a switch per feature, all off (see "AI (v0.2)"). With AI off, no AI code runs and the AI
  SDK isn't even loaded. Never install Ollama or download a model; at most detect an existing install, explain what it
  would download, and act only after the user confirms. Every non-AI path must work fully on its own.
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
  config.ts          config.yaml: Zod schema, defaults, the schemaVersion downgrade guard, live re-read (ConfigStore),
                     and update(), the one way Settings edits it (D53)
  home.ts            the data home's layout and .gitignore on first run; moves the old CLI's files into legacy-cli/
  runtime.ts         runtime.json (0600): pid, port, url and the MCP token, which survives restarts; constantTimeEqual
  egress.ts          the ONLY outbound network path: egressFetch({purpose}, url), allow-list, logs/network.jsonl;
                     plus probeLoopback()/loopbackAccepts(), the CLI's unlogged 127.0.0.1-only readiness probe (D51)
  proc.ts            the ONLY way to run a program: run(), runAttached() (forwards SIGINT/TERM/HUP), launch()
                     (detached, for --open); allow-listed binaries, no shell
  events.ts          the event bus + the SSE stream (GET /api/events)
  live.ts            forwards every store change onto the bus as a ServerEvent named after its entity (D48)
  link-preview.ts    LinkPreviews: the GitHub PR lookup POST /api/link-preview uses (the GitHub source registers it)
  secrets.ts         secrets.yaml (0600): the GitHub token and AI keys (aiKey, setAiKey, aiKeyHint), written through
                     atomic.ts, never logged, returned or backed up
  ai/                v0.2's AI runtime (see "AI (v0.2)"): policy.ts (the gates and the AI allow-list hosts, pure),
                     run.ts (ctx.ai: queue, object/stream/test/models), local.ts (ctx.localAi: hardware, detection, the
                     confirmed Ollama download; PR23), errors.ts (AiError, the fixed codes), sdk.ts
                     (the ONLY place the AI SDK is loaded, by import()), providers.ts (connection → model), ollama.ts
                     (Ollama's native /api/chat as a model), activity.ts (ctx.aiActivity: logs/ai-runs.jsonl, PR22),
                     judge/ (the Found judge, PR24: index.ts ctx.judge, input.ts what it reads, starter.ts),
                     prompts/ (one file per prompt: judge-screenshot.ts, judge-github.ts)
  discover.ts        Welcome's "Your code": the bounded scan of one named folder (4 levels, 5 s, stops at .git,
                     symlink-loop safe), opt-in editor hints, recency from each repo's own .git (D60)
  example.ts         the example dataset (fixtures/example/): add (create-only, `example: true`), remove exactly it (D61)
  sources/           what fills Found by itself (D15): index.ts (Sources: createSources, start()), github.ts (gh or a
                     token, windowed search, dedup by prKey, backoff, the hourly check; D57), screenshots.ts (a folder
                     watched for new screenshots: name/size filters, OCR, the rules, Found; D58)
  views.ts           how achievements look in the API: achievementView() (+ etag, files, broken), evidenceFile()
  atomic.ts          the platform's own writes (runtime.json, the network log, starter files): atomic, create-only (D27)
  routes/index.ts    registerRoutes(): one line per feature module (D18)
  routes/health.ts   GET /api/health
  routes/{events,meta,network}.ts   GET /api/events, /api/meta, /api/network-log (+ POST …/guard-check, D54)
  routes/settings.ts /api/backups, /api/settings (+ PUT /api/settings/mcp), /api/mcp/token (+ rotate)
  routes/mcp.ts      /mcp: the bearer token (runtime.json), 405 on GET/DELETE, then server/mcp/
  routes/guide.ts    GET /agent-guide.md, /llms.txt, /llms-full.txt
  routes/{achievements,evidence,link-preview,problems,found-count}.ts   the board's API (see "The board's API")
  routes/folio.ts    GET /api/folio: a window's achievements as clippings, safe to export (D55)
  routes/{found,sources}.ts   Found's list and decisions, the sources' status and the GitHub card's actions
  routes/{welcome,discover,example}.ts   first run + profile.yaml (D59), the repo scan and adding repos, example data
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
                     vision-macos.ts (Apple Vision through a JXA script on osascript), image.ts (upscaling small PNGs),
                     evidence-text.ts (the board's pictures, read in the background into their sidecars; D58)
shared/              code used by both server/ and src/: no Node or DOM APIs
  api.ts             the HTTP API contract (request/response types, ApiError)
  schema/            the data files' Zod schemas and types (PR3 owns it), the services' input schemas (inputs.ts), the
                     Problem and StoreChange types, and the generated file-format reference (reference.ts)
  ulid.ts, impact.ts, judge.ts   ids; the 1–10 impact scale; the (unimplemented) AI judge seam (D8)
  folio.ts           Folio (D55): presets, the URL state, filters, grouping, the markdown, and toClipping (what a
                     folio may show: no ids, paths or local URLs)
  links.ts           parsePrUrl (→ owner/repo#n and `github_pr:` key), isHttpUrl, githubRepoOf, parsePrKey
  rules/screenshot.ts "is this screenshot praise for me?" from OCR text: plain rules, never a model (D52)
  ai/                v0.2: hosts.ts (hostClass: this computer · your network · internet), connections.ts (kinds,
                     presets, isCloud), consent.ts (the versioned statements), models.ts (the recommended models),
                     grounding.ts (ungrounded, isVerbatim), instructions.ts (the instructions files' names and cap)
src/                 the web app (React 19, Vite, Tailwind v4, TanStack Router + Query), built into dist/web
  main.tsx           fonts, ThemeProvider, QueryClient, router
  routes/            file-based routes (TanStack Router; tsr.config.json); __root.tsx is the shell
  kit/               the Scrapbook component kit: import from kit/index.ts (see "The web app" below)
  shell/             the header, mobile tabs, theme toggle, logo, nav and settings-tab lists, Placeholder
  board/             the board's pieces: composer.ts (paste/drop/upload logic), DropTray, AchievementCard, EditDrawer,
                     pickers (projects, repos, impact), evidence.ts (stored evidence → the kit's EvidenceView)
  found/             Found's pieces: FoundCard, MergeInto (the search picker), EmptyFound (both empty states),
                     decide.ts (keep / merge / dismiss with the Undo toast)
  onboarding/        steps.ts (Welcome's steps), ExampleData.tsx (the board's example strip, Settings → Data's panel,
                     useAddExample); routes/welcome.tsx is Welcome itself
  settings/          Settings' tabs (SourcesTab + GithubCard, AiTab + ai/ (v0.2), NetworkTab, DataTab, AboutTab) and what they share (common.tsx:
                     CopyButton, CommandSlab, LoadError, Slot); routes/settings/$tab.tsx picks one
  api/               client.ts (the typed `api` wrapper), queries.ts (query keys + hooks), events.ts (live updates)
  theme/theme.tsx    light / system / dark: ThemeProvider + useTheme()
  lib/               pure helpers, unit-tested: colour.ts (inkOn, swatches, tilt), dates.ts (groupByWeek, fmt), gantt.ts
                     (the Projects timeline's window, gridlines, bars, rows and swimlanes)
  folio/             the Folio page's pieces: Filters, Clippings, Sheet (the printout), folio.css (the print stylesheet)
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
fixtures/example/    the example dataset (example.json + evidence/), shipped in the package and the image (D61)
scripts/             gen-example.ts (npm run gen:example: the example evidence files), start.mjs (npm start), dev.mjs (npm run dev), check-no-nul-bytes.mjs, sync-reference.ts,
                     store-demo.ts, whats-new-release.mjs (heads the docs site's What's new at `changeset:version`),
                     eval/ (v0.2's live evals: lib.ts is the harness, one spec per eval: smoke.ts, tidy.ts);
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
npm run docs:media:sync # copy the shots the docs site uses (<Shot name> in its pages) into website/src/assets/
npm run brand          # regenerate the favicons, icons and social cards from brand/mark.svg
npm run sync:reference # regenerate the reference tables in docs/data-format.md, AGENT-GUIDE.md and the docs site's
                       # copy after a schema change
(cd website && npm install && npm run build && npm run check-links && npm run check-external)   # the docs site
npm run store:demo     # the file store end to end on a throwaway data home (seed, index stats, watcher events)
npm run eval:screenshots -- --ocr   # the screenshot rules' precision and recall on the synthetic screenshots
                       # (test/screenshots.ts), read by real OCR; without --ocr, on perfect text (fast)
npm run bragdoc -- dev ocr <image>  # which OCR engine ran, the text, and what the rules made of it
BRAGDOC_LIVE_AI=1 npm run eval:smoke -- --connection ollama@http://127.0.0.1:11434 --model qwen3.5:4b [--record]
                       # a live eval on a REAL model (refuses under CI); --record saves answers for replay tests
BRAGDOC_LIVE_AI=1 npm run eval:tidy -- --connection … --model …   # Tidy this up on 30 synthetic blobs (PR26)
BRAGDOC_LIVE_AI=1 npm run eval:judge -- --connection … --model … [--perfect-text] [--judge-all] [--only messages|prs]
                       # the Found judge on the 218 labelled screenshots and 20 PRs (record with --perfect-text)
npm run gen:example    # remake fixtures/example/evidence/ after changing a picture in scripts/gen-example.ts
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
- **A setting the user changes in Settings** (a source's on/off, its options): add the key to `ConfigSchema` in
  `server/config.ts`, then write it with `ctx.config.update({ sources: { … } })` (a merge patch on the file as it is
  on disk; it keeps comments, refuses a broken file with `ConfigWriteError` → 409, and fires the `config` event).
  Expose it in `SettingsResponse` (`GET /api/settings`). Never write config.yaml any other way (D53).
- **A Sources card:** a component next to `GithubCard.tsx` and `ScreenshotsCard.tsx`, mounted in
  `src/settings/SourcesTab.tsx`. Data → the Example data `Slot` (marked) is PR16's; the importer is PR12's
  `ImportPanel` (`src/import/`).
- **A source** (something that fills Found by itself): see "Found and sources" below.
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
  field): document it on the docs site too (`website/src/content/docs/reference/`, `agents/mcp.mdx`; rules in
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
- **AI is off** unless you turn it on: with AI off, no AI badge, chip, score or "confidence" anywhere in the UI (D8).
  v0.2's affordances appear only when their feature is on (SPEC R26).

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

Shell pieces in `src/shell/`: `Header` and `MobileTabs` (the nav; the Found badge reads `useFoundCount()`), `ThemeToggle`, `Mark` / `Wordmark`, `NAV` and `SETTINGS_TABS`, `Placeholder`. Dates: `groupByWeek`,
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

### Found and sources (PR13)

**The model.** A candidate is a `found/<id>.yaml` (`FoundCandidate`, shared/schema/found.ts): `source` (`github` ·
`screenshots` · `mcp`), `externalKey`, title/summary/body, `happenedAt`, `evidence`, `files` (paths copied into
evidence/ only on keep or merge), `matchedRules` (the plain-words reasons its card shows: there's no AI, so no
confidence), `suggestedProjects` / `suggestedRepos`, `status` (`pending` · `kept` · `dismissed`) and `decision`. Every
change goes through `ctx.services.found` (`add`, `keep`, `merge`, `dismiss`, `undo`, `list`, `pendingCount`):

- `add()` is idempotent on keys: a key (its own or an evidence's) already in Found, dismissed, or on the board adds
  nothing (`reason: 'exists' | 'dismissed' | 'on-board'`). Build PR keys with `prKey()` (lower case); a screenshot's is
  `screenshot:<sha256>`.
- `dismiss()` leaves a tombstone holding only `keyHashes` (D56); the store indexes them, so `foundIdByKey(key)` still
  finds it. Undo restores from memory while the server runs. Don't read a dismissed candidate's content: it's gone.
- Keep makes an achievement (`source` from the candidate's: github → `github-pr`, screenshots → `screenshot`, mcp →
  `mcp`); merge adds its evidence to one (`addEvidence`). Both are undoable.

**A source** lives in `server/sources/<name>.ts`, is created in `createSources()` (server/sources/index.ts, from the
AppContext), and runs anything in the background from `Sources.start()` (startServer calls it; createApp never does, so
tests start nothing). It adds candidates with `ctx.services.found.add({ source, externalKey, title, happenedAt,
evidence, files, matchedRules, suggestedProjects, suggestedRepos })` and never writes found/ itself. Its settings are
keys under `sources.<name>` in `ConfigSchema` (written with `ctx.config.update()`), its machine state goes in
`cache/sources/<name>.json` through `atomicWrite` (derived, deletable), it emits `{ type: 'sources' }` when its status
changes, and it reports in `GET /api/sources` (`SourcesResponse`: PR15 replaces `screenshots: { enabled }` with its
own status). Its Settings card is a component next to `GithubCard.tsx`. Found's empty state (`EmptyFound.tsx`) lists
what's watching: add a line for the new source.

**The screenshots folder (PR15, D58)** is `ctx.sources.screenshots` (`ScreenshotsSource`): `status()`, `update({
enabled, folder, onlyScreenshots })` (checks the folder first; throws `ScreenshotsSourceError` with a
`ScreenshotsErrorCode`), `suggestions()`, `lookBack(days)`, `process(file)` (one file through the filters, OCR and the
rules; tests call it directly), `handles()` (what's open: nothing once it's off) and `idle()`. OCR goes through
`ctx.ocr`, the app's one queue, which `ctx.evidenceText` (the board's pictures) shares. **For onboarding (PR16):**
`PUT /api/sources/screenshots { folder, enabled: true }` is the whole of "turn it on" (`putScreenshots()` in
`src/api/client.ts`), `GET /api/sources/screenshots/suggestions` lists folders worth offering
(`useScreenshotSuggestions()`), and `<ScreenshotsFolderPicker onSaved saveLabel />` (src/settings/ScreenshotsCard.tsx)
is the folder choice on its own. The source reads nothing until profile.yaml has a name (`needsProfile` in its status).

**The API** (types in shared/api.ts, "Found + sources (PR13)" and "the screenshots folder (PR15)"):

| Route | What |
|---|---|
| `GET /api/found?source=` | `FoundListResponse`: pending candidates, newest first (one check's newest-merged first), and `counts` per source (unfiltered) |
| `POST /api/found/:id/{keep,merge,dismiss,undo}` | `FoundDecided`; keep takes an optional `FoundKeep` body, merge `{ achievementId }`; a decided one is 409 |
| `GET /api/found/count` | `{ pending }` for the badge and the board strip |
| `GET /api/sources` | `SourcesResponse` (`github: GithubSourceStatus`, `screenshots: ScreenshotsSourceStatus`) |
| `GET /api/sources/github/gh` | `{ installed }`: gh on PATH? (a look, nothing runs) |
| `GET /api/sources/screenshots/suggestions` · `PUT /api/sources/screenshots` · `POST /api/sources/screenshots/look-back` | folders to offer; choose/switch on/off (`ScreenshotsSettingsRequest`, the folder checked first: 400/409 with a `ScreenshotsErrorCode`); read the last `days` once |
| `GET /api/found/:id/picture` · `GET /api/evidence/:sha/ocr` | a screenshot candidate's picture from where it is (404 `gone`); a board picture's text (`EvidenceOcrResponse`, with the quote when the rules pass) |
| `POST /api/sources/github/{connect,run,disconnect}`, `PUT /api/sources/github` | connect (`{ auth: 'gh' }` or `{ auth: 'token', token }`, + `lookBackDays`, `repos`), Check now (waits; 429 while rate limited), disconnect (`forgetToken`), options (`lookBackDays`, `repos`, `hourly`). Errors: `GithubErrorCode` |

In the web app: `useFound(source)`, `useSources()`, `useGhInstalled()`, `useScreenshotSuggestions()`, `useEvidenceOcr(sha)`; `useDecide()` (src/found/decide.ts) does a
decision with its toast. Query keys start `found` / `sources`; the `found`, `sources` and `config` events refresh them.

**Testing a source:** never with a real login. `test/fixtures/fake-gh/gh` is a fake GitHub CLI (invented repos in
`prs.json`, dates in days-ago); its scenario comes from `FAKE_GH_SCENARIO` or `$HOME/.fake-gh/scenario` (`ok`,
`logged-out`, `rate-limited`, `offline`, `zero`, `many`, `not-json`). test/github-source.test.ts builds a PATH with only
it and node; the e2e server has it first on PATH. The token path is tested with a fake `fetchImpl` behind the real
egress module. The screenshots source is tested with a fake `Ocr` (`createAppWithContext({ ocr })`) that "reads" the
text each rendered screenshot was drawn with (test/screenshots-source.test.ts); found.spec.ts drives it end to end with
real OCR (serially, so its candidates can't land while that spec counts the badge). As root, `chmod 000` doesn't make a
folder unreadable: test a denied folder with a stand-in (the unit test) or a server run as another user.

### AI (v0.2)

PR21 built the runtime every AI feature stands on (SPEC R17–R20, R28; D62–D66); PR23 built Settings → AI on it (D69–D71).
**The rules:** nothing AI runs *or loads* unless AI and that feature are on; every model call goes through `ctx.ai` →
`egress.fetchFor()`; local or cloud is decided by **host**, and cloud needs consent; nothing is installed or downloaded
without a confirm; nothing a model says reaches the board or changes a Found candidate's status without a click.

- **Settings** are config.yaml's `ai:` section (`server/config.ts`: `enabled`, `connections` (a map by id), `text`,
  `vision`, `features.{judge,tidy,draft}`), every default off, written only with `ctx.config.update({ ai: … })`. They're
  served by `GET /api/ai` (`AiStatus`), not `SettingsResponse` (D64): connections with `class`, `cloud`, `consent`,
  `hasKey`/`keyHint` and `blocked`, readiness per feature, and the AI hosts on the allow-list. Types: `shared/api.ts`
  "AI (PR21)". Routes: `server/routes/ai.ts` (the table is on the docs site's HTTP API page).
- **Where a call goes is its host** (`shared/ai/hosts.ts` `hostClass(url)`): `this-computer` (loopback),
  `your-network` (RFC 1918, ULA, link-local, `.local`, `host.docker.internal`) or `internet`. `isCloud(connection)`
  (`shared/ai/connections.ts`) is "its base URL's host is on the internet", whatever its kind. Plain http only to the
  first two. Consent (`shared/ai/consent.ts`) is versioned per kind and stored as `{ at, version, host }`: it counts
  only for that host and a version at least the statement's.
- **Keys:** `ctx.secrets.aiKey(id, connections?)` (a `jev` reads its `via`'s), `setAiKey(id, key | null)`,
  `aiKeyHint(id)` (`…abcd`). Never anywhere else.
- **Egress:** `egressAllowList()` adds AI hosts only while `ai.enabled` (local ones; cloud ones with consent).
  `ctx.egress.fetchFor({ purpose, feature, model, connectionId })` is the only fetch a provider gets: it re-checks
  *that* connection on every request (so revoking one of two on the same host stops it), refuses any other host,
  follows no redirect, sends `User-Agent: BragDoc` and no attribution headers, and logs `where`, `feature`, `model`
  and `sent` (bytes; never content). `ctx.egress.logVia('ollama', …)` logs a download Ollama makes itself (a pull).
- **The SDK** (`ai` + `@ai-sdk/*`) is imported only in `server/ai/sdk.ts` (by `import()`), `providers.ts` and
  `decide.ts` (Jev, PR28); `@ai-sdk/provider` also in `ollama.ts` (guard-egress's `AI_SDK_FILES`). Anything that
  `createApp` imports statically may only `import type` from them. `test/ai-lazy.test.ts` runs an AI-off session under
  a loader hook and fails if `ai` is ever resolved: keep it green.
- **`ctx.ai`** (`server/ai/run.ts`):
  - `object({ feature, purpose, slot?, schema, schemaName?, system, prompt, signal?, priority?, timeoutMs?, runId? })`
    → `{ object, connection, model, where, ms, tokensIn, tokensOut, mode, repaired }`: the provider's own schema
    support, then Zod, then ONE repair retry; JSON mode (schema in the instructions) for a server that refuses schemas.
  - `stream({ … })` → `{ textStream, done }`; breaking out of `textStream` cancels the call.
  - `test(connectionId, model?)`, `models(connectionId)`, `readiness(feature)`, `cancelAll(code, message)`,
    `onCall(fn)` (every finished call as a `CallRecord`, no content: PR22's activity log listens here), `queue()`.
  - Gates (409, checked before queueing, when a job starts, and every second while it runs): `ai_off`, `no_model`,
    `not_consented`, `no_key`. Errors (`AiError.code`): `unreachable`, `model_missing`, `key_refused`, `quota`,
    `rate_limited`, `timeout`, `no_structured_output`, `bad_output`, `context_too_long`, `cancelled`, `busy`,
    `failed`. `AiError.status` is the HTTP status to answer with.
  - The queue: per connection, one at a time locally and two to the internet; `priority: 'now'` (default; the judge's
    default is `background`) goes first; timeouts count from the start: 180 s local, 60 s cloud, or `timeoutMs`.
- **Found:** `VerdictSchema` has `from`, `impact`, `inputHash`. `ctx.services.found.setVerdict(id, verdict)` writes
  only a pending candidate's verdict (replacing it whole) and never its status; a decided one is left alone
  (`written: false, reason: 'decided'`). `dismiss()` clears `verdict`; undo brings it back.
- **The fake model server** (`test/fixtures/fake-llm/`): Ollama (`/api/version`, `/api/tags`, `/api/chat`,
  `/api/pull`), OpenAI-compatible (`/v1/models`, `/v1/chat/completions`) and Anthropic (`/v1/messages`). Scenarios
  `ok`, `slow`, `down`, `bad-json`, `bad-json-once`, `no-schema`, `timeout`, `rate-limited`, `refused-key`, `quota`,
  `context-too-long`, `no-models`, picked per request by a `/s/<scenario>/` path prefix (so one server can be several
  connections), else `--scenario`, `FAKE_LLM_SCENARIO`, `$HOME/.fake-llm/scenario` (re-read each request). A model
  named `missing…`, or an unpulled one on the Ollama side, is a 404. Answers come from the rule table in `answers.ts`
  (by schema name, the properties asked for, or the prompt): **add your feature's rows there**, above the catch-alls.
  In tests: `startFakeLlm({ scenario?, slowMs? })` → `{ url, requests, close }`; `requests` records each body (check
  `think`, `num_ctx`, headers). On the box: `node --import tsx test/fixtures/fake-llm/server.ts --port <p>`. Cloud
  paths can't point at it: test them with an injected egress `fetchImpl` (`test/ai-fixture.ts`).
- **`bragdoc dev ai --connection <id> --model <m> [--schema ok] "<prompt>"`** makes one call through all of the above.
- **Settings → AI (PR23, D69–D71)** is `src/settings/AiTab.tsx` plus `src/settings/ai/` (ConnectionCard, AddConnection,
  ConsentDialog, Detect, Models with the download confirm, `words.ts` for the plain words and the header chip). With AI
  off it offers nothing that could reach a runner. In the web app: `useAi()` / `useAiOn()` (the `ai` event refreshes
  them), `useAiModels(id, baseUrl, enabled)`, `useAiHardware`, `useAiDetect`; client functions in `src/api/client.ts`
  ("AI"). Its own routes are `server/routes/ai-local.ts` over `ctx.localAi` (`server/ai/local.ts`): `GET
  /api/ai/hardware`, `GET|POST /api/ai/detect` (through `egress.probe()`, loopback and `host.docker.internal` only),
  `POST /api/ai/connections/:id/pull` (`{ confirm: true, model }`, recommended models only; NDJSON progress; logged
  twice). **A feature's card**: a component in `src/settings/ai/`, then replace its `Card: null` in `FEATURE_CARDS`
  (`src/settings/ai/index.ts`) with it: one line. It gets `{ status, readiness }` and owns its feature's switch.

PR22 added the plumbing the three features share (D67, D68):

- **Instructions files** (`ai/what-counts.md` for the judge, `ai/style.md` for tidy and draft): a store kind,
  `instructions`, owned by the store like every data file (backed up, watched, never gitignored). Through
  `ctx.services.instructions`:
  - `forPrompt(name)` → the markdown a prompt includes (after any front-matter, trimmed; the last good copy while the
    file is broken), or null. **A prompt reads instructions only this way**, and a feature that needs them checks
    `get(name).problems` too: a server started with the file already broken has no last good copy.
  - `setStarter(name, () => text)` registers the feature's starter (do it where the feature is created; PR24 makes the
    judge's from the profile). `ensure(name, text)` writes it only if there's no file (a first switch-on);
    `reset(name)` puts it back, moving the user's version to `backups/removed/` first.
  - `get(name)` / `put(name, { text }, { ifMatch })`: the whole file, for an editor. A broken file is a Problem and is
    replaced only with its ETag; over 20,000 characters (`INSTRUCTIONS_MAX_CHARS`) is a Problem too.
  - Routes `GET/PUT /api/ai/instructions/:name`, `POST …/reset` (`server/routes/ai-instructions.ts`); types
    `AiInstructions*` in `shared/api.ts`; the `instructions` event refreshes query keys starting `ai-instructions`.
    Not gated on AI: they're files.
- **The AI activity log** (`logs/ai-runs.jsonl`, `ctx.aiActivity`, `server/ai/activity.ts`): every `ctx.ai` call is a
  line by itself, unless it belongs to a run. **A feature that makes several calls for one job opens a run:**
  ```ts
  const run = ctx.aiActivity.start({ feature: 'judge', trigger: 'schedule' }); // now · arrival · schedule · eval · cli
  try {
    for (const c of items) { await ctx.ai.object({ …, runId: run.id }); run.count('win'); }
  } finally {
    run.end({ error: code, cancelled }); // one line; nothing at all if it never called a model
  }
  ```
  A single call can say what started it with `trigger` (default `now`). Counts and errors are **codes**
  (`probably-not`, `unreachable`), never sentences. `GET /api/ai/activity?limit&offset` (`AiActivityResponse`, newest
  first) and the `ai-activity` event are what PR23's receipt shows (`getAiActivity` / `useAiActivity`).
- **Live evals** (`scripts/eval/lib.ts`): a feature's eval is a spec (`EvalSpec`: synthetic `cases`, `run(case, ask)`
  using `ask.object()` / `ask.text()`, `score()`, optional `summarise()`) in `scripts/eval/<name>.ts` ending
  `if (isMain(import.meta.url)) process.exitCode = await main(SPEC)`, plus an `eval:<name>` script. The harness does
  the rest: the refusal (no `BRAGDOC_LIVE_AI=1`, or `CI` set), `--connection <id | kind@url>`, `--model`, `--limit`,
  `--record`, the table, stopping on a run-level failure, one activity run (trigger `eval`). `smoke.ts` is the example.
  - **Recordings** go to `test/fixtures/ai-recordings/<eval>/<model>.json`, keyed by a hash of exactly what was asked.
    `replay(spec, recording)` (`test/ai-replay.ts`) runs the spec against the fake model server answering from it:
    assert `stale`, `missing` and `unanswered` are empty and the scores are what you expect. **Changing a prompt
    or a schema makes its recordings stale**: re-record on a machine with the model (`--record`), never by hand. `node --import tsx
    test/fixtures/fake-llm/server.ts --recording <file>` serves one for box QA.

PR26 added **Tidy this up** on the board (SPEC R23; D78, D79): `POST /api/ai/tidy` and `GET /api/ai/tidy/preview`
(`server/routes/ai-tidy.ts`), the prompt in `server/ai/prompts/tidy.ts` (`tidyPrompt`, `tidyMaterial`: labelled parts
in one delimited block), and `server/ai/tidy.ts`: `gatherTidy` (the server collects the text: pasted, board pictures'
OCR, an achievement's fields), `runTidy`, and the pure `finishTidy` (clips, nulls, impact, project names → ids,
`allowedDates` for dates, `ungrounded` flags). Nothing it does writes anything. On the board: `src/board/tidy.ts`
(`useTidyAvailability`: shown only while AI and Tidy are on; `useTidy`: the call with Cancel; `applyTitle`/`applyBody`,
which keep what you wrote in the notes) and `src/board/TidySheet.tsx` (the button, the thinking sticky, the sheet).
The composer's Summary and Until fields appear only once a suggestion sets them. **For PR27:** `ai/style.md` reaches a
prompt through `services.instructions.forPrompt('style')`, as Tidy does; the fake's `tidy` row (answers.ts) is keyed on
the schema name `achievement_tidy`.

PR27 added **Draft with AI** in Folio (SPEC R24, D80–D81):

- `POST /api/ai/draft { folio: AiDraftFolio, purpose? }` streams NDJSON (`AiDraftEvent`: `start`, `text`…, `done`);
  `POST /api/ai/draft/check` and `GET /api/ai/draft/preview` make no model call (`server/routes/ai-draft.ts`). The
  server rebuilds the clippings from the folio's state: `folioData()` (`server/folio.ts`, shared with `GET
  /api/folio`) → `prepareDraft()` (`server/ai/draft/prepare.ts`: numbering, the budget in `budget.ts`, the prompt in
  `prompts/draft.ts`, and the check's sources). One activity run per draft (`sent`, `omitted`).
- The check is `checkDraft(draft, sources)` in `shared/ai/draft.ts` (pure): per line, against the clippings that line
  cites. `draftExportName()` names the download. The fake's `draft` row plants `37%` and one uncited bullet; a note
  containing `(clean)` leaves them out (handy for screenshots).
- In the web app: `streamDraft()` / `checkAiDraft()` / `getAiDraftPreview()` (`src/api/client.ts`), `useDraft()`
  (`src/folio/draft.ts`), `DraftPanel` (`src/folio/DraftPanel.tsx`), `DraftCard` in Settings → AI. The Folio page's
  leave guard asks only when leaving `/folio` (its filters are URL changes too). `StyleEditor.tsx` is PR26's, copied
  byte for byte.
- `npm run eval:draft` (live): three example-data folios (a quarter, six months, a year on a 4k context that hits the
  budget); `EVAL_SHOW=1` prints each draft.

PR24 added **the Found judge** (SPEC R21; D72–D74). It only ever writes a pending candidate's `verdict`
(through `services.found.setVerdict`), never its status. **For PR25 (schedule, Found UI) and PR28 (Jev):**

- **`ctx.judge`** (`server/ai/judge/index.ts`, `createJudge(deps)`; no SDK import, so createApp builds it with AI off):
  - `start({ ids?, trigger, priority?, signal? })` → `{ runId, queued, done }`: a run in the background. Throws an
    `AiError` for a gate (409) or `JudgeRunning` (one run at a time). `trigger` is the activity log's (`now` ·
    `arrival` · `schedule`); priority defaults to `now` for `trigger: 'now'`, else `background`. `done` resolves to a
    `RunSummary` (`total`, `done`, `counts`, `outcome`, `error`); it never rejects for a model's failure.
  - `judgePending(opts)`: `start()` and wait. `cancel()` stops the run in progress (what's judged stays).
  - `eligible(ids?)`: what a run would take (pending, ticked kinds, no verdict unless `ids`, newest first, `maxPerRun`).
  - `status()` → `AiJudgeStatus` (`ready`/`reason`, `kinds`, `waiting`, `running`, `last`), `preview(id)` →
    `AiJudgePreview` (the exact system and prompt, nothing sent; `NotJudgeable` for a decided or MCP candidate),
    `prepare(c)` → `Prepared` (input, prompt, `inputHash`, project map), `decide(c, context)` (the `Judge` seam).
  - `checkAnswer(answer, prepared)`: the checks every verdict passes (quote verbatim in the message judged, `from` its
    author, projects to ids, `why` ≤ 160, clamps). **Jev (PR28) runs its answer through it too.**
  - Counts are `win` · `probably-not` · `failed` · `skipped`. A run emits `{ type: 'ai-judge' }` as it goes; the store
    forwards `found` as each verdict is written.
- **Routes** (`server/routes/ai-judge.ts`): `POST /api/ai/judge/run` (`{ ids? }` → 202), `GET /api/ai/judge/status`,
  `GET /api/ai/judge/preview?candidate=`. Web: `runJudge`, `getJudgeStatus`, `getJudgePreview`, `useJudgeStatus()`.
- **The input** (`judge/input.ts`): `screenshotInput`, `githubInput`, `inputBudget`. Messages come from
  `compileMessages(profile)` in `shared/rules/screenshot.ts`: the rules' own split, with `notMe` kept and flagged.
- **The starter** `ai/what-counts.md` (`judge/starter.ts`, from the profile) is registered with
  `services.instructions.setStarter` when the app is made, and written when the judge is first switched on.
- **Found's card** shows the verdict (`VerdictNote` in `src/found/FoundCard.tsx`: stamp, why, "judged by …", "judged
  earlier" while the judge is off) and the page has a minimal Judge now. Grouping, "Probably not" and Judge again are
  PR25's.
- **The fake's judge rows** (`answers.ts`, schema names `found_judge` and `found_judge_pr`): praise words → a win
  (0.86), sarcasm markers → probably not, "(the user)"'s own message → probably not; a PR titled bump/chore/typo/revert
  → routine (impact 1), else notable (5). **`e2e/judge.spec.ts`** runs its own server and fake.
- **Recordings** `test/fixtures/ai-recordings/judge/<model>.json` (perfect text) are replayed in `test/ai-judge-replay.test.ts`.

**Adding an AI feature** (five steps):
1. Its settings already exist under `ai.features.<name>` (PR21 laid down all of them); read them with
   `ctx.ai.readiness(feature)`, never by checking `enabled` yourself.
2. A prompt in `server/ai/prompts/<feature>.ts`: a pure function of its inputs (instructions from
   `services.instructions.forPrompt()`), tested for what it includes and what it leaves out (never a path, an id or a
   local URL); the same function feeds the "what's sent" preview. Several calls for one job are one activity run.
3. A Zod schema for the answer, and one call: `ctx.ai.object({ feature, purpose: 'ai.<feature>', schema, system,
   prompt, signal: c.req.raw.signal })` (or `stream`). Map an `AiError` to `c.json(apiError(e.code, e.message),
   e.status)`. Check the output with `shared/ai/grounding.ts` before showing it.
4. A route module (`server/routes/ai-<feature>.ts`, one line in `routes/index.ts`), documented on the HTTP API page,
   and rows in the fake's `answers.ts` for its tests and e2e. Its live eval (`scripts/eval/<feature>.ts`) and a
   recording from each recommended model, replayed in a test.
5. Its card in Settings → AI (`src/settings/ai/`, one line in `FEATURE_CARDS`, after PR23), and its affordance shown
   only while `readiness` says it's on.

### Onboarding and example data (PR16)

- **First run** (D59): `GET /api/welcome` → `firstRun` while there's no profile.yaml and `welcome.skipped` is false.
  Only the board (`/`) redirects to `/welcome` (`src/routes/__root.tsx`). `GET/PUT /api/profile` read and write
  profile.yaml (If-Match optional; the first write needs a name). **The shared e2e server's home has a profile.yaml**
  (playwright.config.ts), so its board stays the board; `e2e/welcome.spec.ts` runs its own servers on fresh homes.
- **Welcome's steps:** `/welcome?step=you|sources|code` (`src/onboarding/steps.ts`). The Sources step reuses
  `GithubCard` and PR15's `ScreenshotsCard` as they are, so a change to either card shows in both places.
- **Repo scan** (D60): `GET /api/discover/suggestions`, `POST /api/discover/scan {root?, hints?}` (stores nothing),
  `POST /api/discover/add {repos: [{path, project?}]}` (re-checks each path, then `services.repos.create`).
- **Example data** (D61): `GET /api/example`, `POST /api/example {asOf?}`, `POST /api/example/remove`. Everything it
  adds is `example: true`; anything that lists entries for the user (a page, an export, an agent's view) may want to
  say so. Deterministic for a given `asOf`, for the docs' captures (PR19) and the release candidate (PR17).

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
