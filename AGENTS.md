# Instructions for agents working in this repository

## Where things stand

BragDoc Local is being rebuilt as a free, open-source, **local-first** achievement tracker: you run it on your own
machine, it keeps your data as plain files in `~/.bragdoc`, and nothing leaves your machine except calls to services
you explicitly connect. v0.1 is built on the **`next`** branch as a series of pull requests, tracked in the epic
[#411](https://github.com/edspencer/bragdoc-ai/issues/411). `main` still holds the old hosted app; never touch it.

What exists so far is the **skeleton** (PR1): the package, build, CI and repo hygiene; a Hono server with
`GET /api/health` and the web app's static serving; and a minimal CLI (`serve`, `--version`, `--help`). And the
**web foundation** (PR4): the Scrapbook component kit, the light / system / dark themes, the app shell with
placeholder pages, the typed API client and the screenshot rig. Everything else arrives PR by PR, in the waves #411
lays out.

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
  cli.ts             `bragdoc` entry point (the package's bin); args.ts parses arguments; banner.ts is what
                     `serve` prints at startup
  index.ts           createApp (routes → JSON 404 for /api/* → static files → SPA fallback) and startServer
  context.ts         AppContext: what every route module gets (version, dataDir; later the store, bus, config)
  http.ts            helpers for route modules (apiError)
  routes/index.ts    registerRoutes(): one line per feature module (D18)
  routes/health.ts   GET /api/health
  paths.ts           package root, VERSION, WEB_DIST, the data home (resolveDataDir), tildify
  port.ts            DEFAULT_PORT (2724 = BRAG), alone so vite.config.ts can import it
shared/              code used by both server/ and src/: no Node or DOM APIs
  api.ts             the HTTP API contract (request/response types, ApiError)
src/                 the web app (React 19, Vite, Tailwind v4, TanStack Router + Query), built into dist/web
  main.tsx           fonts, ThemeProvider, QueryClient, router
  routes/            file-based routes (TanStack Router; tsr.config.json); __root.tsx is the shell
  kit/               the Scrapbook component kit: import from kit/index.ts (see "The web app" below)
  shell/             the header, mobile tabs, theme toggle, logo, nav and settings-tab lists, Placeholder
  api/               client.ts (the typed `api` wrapper), queries.ts (query keys + hooks), events.ts (live updates)
  theme/theme.tsx    light / system / dark: ThemeProvider + useTheme()
  lib/               pure helpers, unit-tested: colour.ts (inkOn, swatches, tilt), dates.ts (groupByWeek, fmt)
  dev/Kit.tsx        /dev/kit, every kit component on one page (dev and BRAGDOC_KIT=1 builds only, D23)
  styles.css         the Scrapbook tokens (light + lamplight), mapped to Tailwind names through `@theme inline`
public/              static files copied into dist/web: theme-init.js (the theme before first paint) and the
                     favicons (generated from brand/). Only content-hashed names under /assets/ are cached as
                     immutable; anything else is revalidated
brand/               the mark (mark.svg) and generate.mjs, which makes the favicons, icons and social cards
tools/docs-media/    the screenshot rig: `npm run docs:media` (shots.ts lists the shots; it scans each for leaks)
test/                node:test suites, run from source via tsx; fixture.ts has the throwaway-dir helpers
e2e/                 Playwright specs, run against the built server (playwright.config.ts)
scripts/             start.mjs (npm start), dev.mjs (npm run dev), check-no-nul-bytes.mjs
docs/                decisions.md (D1…), data-format.md
```

Coming soon, so you know where things go: `server/{config,home,runtime,security,egress,proc,events}.ts` (PR2),
`server/store/`, `server/services/` and `shared/schema/` (PR3), `server/commands/` and `server/platform/` (PR5), the release machinery and `Dockerfile`
(PR6), `website/` (PR18).

## Commands

```sh
npm ci                 # from a checkout (env -u NODE_ENV if your shell exports NODE_ENV=production)
npm run dev            # Vite with hot reload on $PORT (2724) + the API (tsx watch) on the next port up
npm start              # build if stale, then run the compiled CLI (`npm start -- --port 5050`, …)
npm run bragdoc -- <args>   # the CLI from source (tsx)
npm run check:nul      # no raw NUL bytes in JS/TS sources
npm run typecheck      # regenerates the route tree, then tsc for server, tools (e2e, tools/) and web
npm test               # node:test, from source via tsx
npm run build          # dist/web (Vite) + dist/server, dist/shared (tsc)
npm run test:e2e       # Playwright against the built server (run `npm run build` first)
npm run routes         # regenerate src/routeTree.gen.ts by hand (typecheck, dev and build do it anyway)
npm run docs:media     # build with /dev/kit, boot a throwaway instance, take every shot in tools/docs-media/shots.ts
npm run brand          # regenerate the favicons, icons and social cards from brand/mark.svg
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
- **Middleware that wraps everything** (PR2's security): `app.use('*', …)` at the top of `createApp()`, before
  `registerRoutes()`.
- **A page:** add a file under `src/routes/` (TanStack file routes: `found.tsx` → `/found`,
  `settings/$tab.tsx` → `/settings/:tab`). The route tree regenerates itself; it's gitignored (D20), so it never
  conflicts. PR4 left a placeholder in each of the v0.1 pages (`<Placeholder>`): replace it. Build pages from the kit
  (below), never from raw colours.
- **An API call from the web app:** a typed function at the bottom of `src/api/client.ts` (`export const
  getThings = () => api.get<ThingsResponse>('/api/things')`), its query key and hook in `src/api/queries.ts`, and,
  if the server sends `change` events for it, its kind in `CHANGE_INVALIDATES` (`src/api/events.ts`).
- **A CLI flag:** add it to `VALUE_FLAGS` or `BOOLEAN_FLAGS` in `server/args.ts` and to the command's `check()` list
  in `cli.ts`, then document it in `USAGE`.
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
  (`src/lib/colour.ts`), which picks black or white with at least 3:1 contrast (D24). `safeColour()` guards
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
| Paper | `Card` (taped card: `tape`, `tapeAt`, `tiltId`, `fresh`), `Panel` (forms/settings sheet), `Masonry` (1/2/3 columns), `Tape`, `Print` (photo print + lightbox), `Lightbox`, `PdfPage`, `Sticky`, `StickyQuote`, `Stamp`, `Receipt`, `Ruled` |
| Type | `PageTitle` (title, `hand` aside, `sub`, `right` actions), `SectionTitle`, `Kicker`, `Hand`, `WeekHeader` (for `groupByWeek` groups) |
| Controls | `Btn` (`accent` · `go` · `paper` · `ink` · `ghost` · `danger`; `size="sm"`), `LinkBtn` (a router link styled as a button), `btnClass()`, `Switch`, `Field` (label, `hint`, `error`), `TextInput`, `TextArea`, `inputCls`, `FilterChip`, `CountBadge`, `Dot`, `ColourPicker` (12 swatches + any colour) |
| Tags | `ProjectPill` (`name`, `color`, `active`, `onClick`), `RepoTag`, `ImpactBadge` (1–10), `ProvenanceBadge` (`github` · `screenshot` · `mcp` + `agent` · `import`; `soft` on cards, `solid` on Found), `PROVENANCE` (labels and colours for filter rows) |
| Evidence | `EvidenceBit` (draws an `EvidenceView`: `image` · `pdf` · `file` · `link` · `github_pr` · `quote`), and each kind alone: `PrSlab` (shows `owner/repo#n` without a title), `LinkCard`, `PdfChip`, `FileChip`; `formatBytes`, `domainOf` |
| Feedback | `ToastProvider` (in the shell) and `useToast()`: `toast({ msg, undo?, tone? })` |
| Navigation | `NotebookTabs` + `NotebookTab` (Settings' divider tabs; router links) |

Shell pieces in `src/shell/`: `Header` and `MobileTabs` (the nav; the Found badge reads `useFoundCount()`, a stub
until PR13), `ThemeToggle`, `Mark` / `Wordmark`, `NAV` and `SETTINGS_TABS`, `Placeholder`. Dates: `groupByWeek`,
`weekLabel`, `fmt.*`, `todayIso` in `src/lib/dates.ts` (calendar days, weeks from Monday).

**The API client** (`src/api/client.ts`): `api.get/post/put/patch/delete<T>(path, …)` send and receive JSON
(same-origin, relative paths) and reject with an `ApiRequestError` carrying the envelope's `code` and `message` and
the HTTP `status`; `code: 'network'` (status 0) means the server didn't answer. `api.upload<T>(path, file)` sends a
typed upload (raw bytes, the file's type, never a CORS-safelisted one, `X-Filename`). `isApiError(e, code?)` narrows.
The `QueryClient` (`createQueryClient()` in `queries.ts`) doesn't retry 4xx. `useServerEvents()` (mounted in the
shell, **off until `/api/events` exists**: flip `LIVE_UPDATES` in `src/routes/__root.tsx`) refreshes queries from
the server's SSE `change` events by their key's first segment, and everything on `hello`.

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
- **Tests never touch a real home or data home.** Use `tmpDir()` / `tmpHome()` from `test/fixture.ts`, and pass
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
  `HOME` / `XDG_CONFIG_HOME`, `--dry-run` or `--print`.
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
- Changesets arrive with PR6; until then, user-visible changes say so in the PR body.
