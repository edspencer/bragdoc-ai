# Decision log

Format: the decision, then why, then what was considered instead. Code comments cite these as `(D6)`.

**Append only.** Add new decisions at the end with the next free number; if two PRs race for a number, the one that
rebases second takes the next one. Don't renumber or delete a decision: mark it _superseded by Dn_ and say why in the
new one. Decisions here win over anything contradictory elsewhere (README, docs, comments); if you find a
contradiction, fix the other document.

D1–D16 are seeded from the v0.1 specification (the epic, [#411](https://github.com/edspencer/bragdoc-ai/issues/411)).
D17 onwards are decisions made while building.

---

### D1 — BragDoc Local: package `@bragdoc/local`, binary `bragdoc`, built on `next`

- One repository, `edspencer/bragdoc-ai`. v0.1 is built on the long-lived **`next`** branch; `main` keeps the hosted
  app, untouched, until launch. `next` merges into `main` when v0.1 ships.
- npm: **`@bragdoc/local`** (the project owns the `@bragdoc` scope); binary **`bragdoc`**.
- **Considered:** a new repository (loses the history and the stars); the unscoped `bragdoc` npm name (taken by
  someone else); reusing `@bragdoc/cli` (it's the old cloud CLI, with different behaviour and users).

### D2 — `next` starts from scratch

- No code, prompts, copy, blog posts or research from the hosted app are carried over. Ideas carry over (a 1–10
  impact scale, say) but are written fresh.
- The one exception: the importer (PR12) reads the hosted app's export **format**, because that's how existing users
  move their data over.
- The first commit on `next` removed the old tree; history keeps it.
- **Considered:** porting the old prompts and rubric (they belong to a cloud, AI-first product; v0.1 has no AI).

### D3 — Follow the sibling projects

- BragDoc is shaped like its author's other local apps, in this order of preference: **Hallway**
  (github.com/edspencer/hallway), **Local Review** (github.com/edspencer/local-review), **Paddock**
  (github.com/edspencer/paddock). When one of them already solves something, adapt its file rather than inventing a
  new pattern: rename, drop what BragDoc doesn't need, keep the comments that explain hard-won lessons.
- Every PR lists what it adapted under "Adapted from" (`server/x.ts ← hallway:server/x.ts (+ what changed)`).

### D4 — A single package; Hono + Vite/React; node:test

- One package at the repository root, Hallway's shape: `server/` (Node, TypeScript ESM, Hono), `shared/` (types and
  pure logic used by both sides), `src/` (the web app: Vite, React 19, Tailwind v4, TanStack Router and Query),
  `test/` (node:test via tsx), `e2e/` (Playwright), `scripts/`, and later `website/` (its own package).
- Built with `tsc` (server → `dist/server`, `dist/shared`) and `vite build` (web → `dist/web`). The published package
  is `dist/` plus a few documents; React and everything else the web app bundles are devDependencies.
- No separate linter: `tsc --strict` and the tests are the gate, as in the siblings.
- **Considered:** a monorepo with workspaces (the old layout; more machinery than one app needs); Next.js (a server
  framework for a local SPA with a small API is the wrong shape, and it fights static serving from a package).

### D5 — Your data is plain files

- Markdown with YAML front-matter, one file per achievement; YAML for everything else; content-addressed blobs for
  evidence. An in-memory index (built at boot, kept current by a watcher) serves the feed, filters and search.
- Hand edits are first-class: invalid files are flagged as Problems, never crash the app, and are never silently
  overwritten. Details: SPEC R2 and [data-format.md](data-format.md).
- **Considered:** SQLite via `node:sqlite` (the original recommendation; the data model doesn't need it, and files are
  what people and coding agents can read and edit).

### D6 — Port 2724, never changed for you

- 2724 spells BRAG on a phone keypad. The server binds `127.0.0.1:2724` by default. `--port` / `$PORT` override it.
- If the port is taken, BragDoc says so and exits; it never picks another port, because a bookmark, a service and an
  MCP registration all point at one address.

### D7 — The data home

- `--data-dir` > `$BRAGDOC_HOME` > `~/.bragdoc`. Its layout is in SPEC R2.
- The old CLI also used `~/.bragdoc` (a `config.yml`, `cache/`, `logs/`); on first run those are moved, not deleted,
  into `legacy-cli/` (PR2).

### D8 — AI is off by default, and every AI feature is an explicit opt-in

- v0.1 ships **no AI features and no AI dependencies**. It defines only the seam a future judge plugs into (a `Judge`
  interface in `shared/`, a nullable `verdict` on Found candidates).
- BragDoc never installs Ollama or downloads a model. Later versions may at most detect an existing install, explain
  what a choice would download (size, disk, RAM), and act only when the user confirms.
- Every non-AI path works fully on its own; in particular screenshot OCR + rules → Found.

### D9 — No telemetry; one egress module; one process module

- No telemetry and no update check. All outbound network traffic goes through `server/egress.ts`, with an allow-list
  derived from the integrations the user turned on, and every request is logged for Settings → Network activity.
- Subprocesses run only through `server/proc.ts` (`execFile`, no shell, allow-listed binaries).
- A static guard test fails CI if any other file opens a network connection or spawns a process (PR2).

### D10 — Localhost security, single user, no login

- Bind `127.0.0.1`; refuse anything else unless `BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1` (Docker sets it and publishes on
  `127.0.0.1` only). A Host allow-list on every request (the DNS-rebinding defence), extendable with
  `BRAGDOC_ALLOWED_HOSTS`. Origin checks on writes and SSE; writes are JSON or a typed upload; a strict CSP with no
  inline scripts; a per-install bearer token for MCP. Details: SPEC R3.

### D11 — Nothing reaches the board without you

- Anything BragDoc finds on its own goes to **Found**, where you keep, merge or dismiss it.
- The exception, by default: MCP writes from your own agent go straight to the board, with their provenance shown.
  `mcp.writeTo: found` sends them to Found instead.

### D12 — Vocabulary

- **Achievement** (a thing you did or got credit for; one file each), **Evidence** (what backs it up), **Board**,
  **Found**, **Source**, **Folio**, **Project**, **Company**, **Repo**. Definitions: SPEC "Vocabulary". Use these
  words in code, UI and docs.

### D13 — The UI is Scrapbook

- A pinboard of taped cards, photo-print screenshots, sticky-note quotes and project-coloured tape, in light, dark
  ("lamplight") and system themes. Chosen over two other directions in a design spike. PR4 builds its kit.

### D14 — Distribution: npm and Docker; Node ≥ 22.12

- `npx @bragdoc/local`, a global install, or Docker on your laptop (an alternative to npx, not a server deployment).
  macOS and Linux are first-class; Windows is not ruled out, and `service` says "not supported on Windows yet".
- `engines.node` is `>=22.12`. Hallway needs 22.13 for `node:sqlite`; BragDoc doesn't use it (D5).

### D15 — Found's v0.1 sources: GitHub and screenshots

- Merged PRs (via `gh` or a PAT) and a watched screenshots folder (OCR + deterministic rules), plus MCP agents.
  Chat connectors (Slack, Teams, Discord) are out of scope for v0.1.

### D16 — The docs site lives in `website/`

- Astro + Starlight, adapted from Hallway's site. A documentation site, not marketing. No analytics. Nothing in this
  repository deploys it.

---

### D17 — Vercel doesn't build `next` (remove `vercel.json` before merging into `main`)

- The repository has a Vercel integration from the hosted app, which builds every branch and comments on PRs. Builds
  of `next` and its PR branches would fail (there's no Next.js app on them) and add noise to every PR.
- A root `vercel.json` with `{"git":{"deploymentEnabled":false}}` turns git-triggered deployments off for branches
  that contain it, i.e. `next` and everything branched from it. `main` doesn't have the file, so the hosted app's
  deploys are unaffected.
- **⚠ `vercel.json` must be deleted before `next` merges into `main`.** Otherwise it would turn off deploys of `main`
  too. (By then the hosted app's deployment may be retired anyway, but that's a separate decision.)
- CI enforces it: on a pull request into `main`, the `test` job fails while `vercel.json` exists.
- Observed on PR #412: with the file in place, Vercel posted no status, deployment or comment.
- **Considered:** changing the integration's settings (not ours to change from a PR, and it would affect `main`).

### D18 — Routes: one module per feature, one line in `server/routes/index.ts`

- Each feature's HTTP routes live in `server/routes/<feature>.ts`, exporting `register<Feature>(app, ctx)`, which
  registers full paths on the root Hono app. `registerRoutes()` in `server/routes/index.ts` calls each one, one line
  per feature, alphabetical. What a route needs from the server (store, bus, config) arrives through `AppContext`
  (`server/context.ts`), one field per line.
- Unknown `/api/*` paths are a JSON 404 (`ApiError` in `shared/api.ts`), never the web app's HTML.
- Why: up to six PRs are built in parallel; this keeps each one's change to shared files to a line or two.
- **Considered:** a sub-app mounted at `/api` (some routes, like `/mcp` and `/llms.txt`, live outside `/api`);
  Hallway's single `api.ts` (fine for one author, a conflict magnet for six).

### D19 — The SPA fallback serves `index.html` only for navigations

- `GET`/`HEAD` of a path whose last segment has no file extension gets `index.html` (`Cache-Control: no-cache`); a
  missing file (`/nope.js`, `/assets/old-hash.js`) is a 404. Hashed `/assets/*` are `immutable`. Adapted from Paddock
  (its issue #220): answering a missing script with the shell gives the browser HTML where it expected JavaScript,
  which fails far from the cause, typically right after an upgrade.

### D20 — The route tree is generated, not committed

- TanStack Router's `src/routeTree.gen.ts` is gitignored. `npm run typecheck` runs `tsr generate` first, and `vite`
  (dev and build) regenerates it through the router plugin. Both read `tsr.config.json`.
- Why: every PR that adds a page would otherwise edit the same generated file, and parallel PRs would conflict on it.

### D21 — PR1's interim bind guard

- Until PR2 adds `server/bind-safety.ts` (adapted from Paddock), `serve` refuses a non-loopback `--host` unless
  `BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1`, inline in `server/cli.ts`. PR2 replaces the inline check; the flag's name and
  meaning stay.

### D22 — CI: Node 22.12 / 22 / 24 × Ubuntu / macOS, plus one e2e job

- The `test` job runs check:nul, `npm ci`, typecheck, tests, build and `--version` on every cell. A separate `e2e`
  job runs Playwright against the built server on Ubuntu with Chromium only. `ci-passed` is the one stable check name
  for branch rules; later jobs (PR5 `services`, PR6 `smoke:pack` and Docker, PR18 `website`) join its `needs`.
- No Windows cells: Windows isn't supported in v0.1 (D14). Hallway runs them because it supports Windows best-effort.
- CI runs on pushes and PRs to both `next` and `main`, so nothing needs editing when `next` merges.

### D23 — Origin must be the server's own, on every request; Fetch Metadata guards the API

- Any `Origin` a browser sends must equal the request's own `Host` (host and port; the scheme isn't compared, since a
  TLS-terminating proxy hides it). The check runs on **every** request, not only writes, so the SSE stream and any
  streaming or WebSocket endpoint a later PR adds are covered without anyone remembering to (Paddock's
  WebSocket-origin gap, its #975, was a route that forgot). `Origin: null` is refused.
- An **absent** `Origin` is allowed, including on `/api/events`. SPEC R3 says SSE "requires an allowed Origin, since
  browsers send it on EventSource", but browsers send no `Origin` on a *same-origin* GET, the app's own EventSource
  included: requiring one would refuse the app itself. Cross-origin EventSources do send it, and are refused.
  Non-browser clients send none and can't be a cross-site vector; the Host check still applies to them.
- `/api/*` and `/mcp` refuse `Sec-Fetch-Site: cross-site` and `same-site`. Same-site matters on shared hostnames:
  another app on a sibling subdomain is same-site, but not us.
- Stricter than SPEC's "a present Origin must be allowed" (any allowed hostname, any port): another local app on
  another port is refused too. The cost: a reverse proxy that rewrites `Host` breaks writes. Proxies that pass `Host`
  through (Caddy's default, nginx with `proxy_set_header Host $host`) work.
- **Considered:** Hallway's rule (Origin checked on writes only, any local port); requiring `Origin` on SSE (breaks
  the app, as above).

### D24 — The platform's own files are written by `server/atomic.ts`, not the store

- `runtime.json`, `logs/network.jsonl`, and the starter `.gitignore` / `config.yaml` are machine-written (or written
  once, create-only), so `server/atomic.ts` writes them: Hallway's temp-file-and-rename, and a hard link for
  create-only. Everything people and agents edit still goes only through the store (D5).
- `legacy-cli/`: home.ts moves the old CLI's files there with a plain rename into a fresh directory (nothing can be
  replaced).
- When PR3's `test/guard-fs.test.ts` lands, its allow-list needs entries for `atomic.ts` (one temp `writeFile` with
  flag `wx`, one `appendFile`, one `rename`, one `unlink` of its own temp), `home.ts` (one `rename`) and `egress.ts`
  (one `rename`: rotating the log). Whichever of PR2/PR3 merges second adds them.
- **Considered:** waiting for PR3's safefs (PR2 and PR3 are built in parallel); writing runtime.json with a plain
  `writeFileSync` (not atomic: a reader could see half a file).

### D25 — The legacy notice is shown on the start that moved the files; a recreated `config.yml` warns every start

- A home counts as BragDoc's once it has `config.yaml`, `runtime.json` or `legacy-cli/`. Only a home with none of
  them has the old CLI's `config.yml` / `cache/` / `logs/` moved, so BragDoc's own `cache/` and `logs/` are never
  mistaken for the old CLI's.
- `legacy-moved` is a notice for the life of the process that did the move (there's no notice state to remember a
  dismissal yet). Settings → Data (PR10) can show `legacy-cli/` itself permanently. `legacy-recreated` (a warning) is
  raised on every start while a `config.yml` is back.

### D26 — `config.yaml` v1 owns `allowedHosts`, `mcp.writeTo` and `sources.github.{enabled,auth}`

- The egress allow-list needs to know whether GitHub is connected with a token, so PR2 defines
  `sources.github.enabled` and `sources.github.auth: gh | token` (the token itself lives in `secrets.yaml`). Later PRs
  add optional keys (`sources.screenshots`, …) without bumping `schemaVersion`.
- Unknown keys are ignored on read, and config.yaml is never rewritten by the platform, so nothing is lost.
- An invalid edit keeps the last good settings and raises a `config-invalid` notice; a future or unreadable
  `schemaVersion` refuses to start (Paddock's downgrade guard), and if it appears while running it's a notice.
- PR1's interim inline bind guard (D21) is replaced by `server/bind-safety.ts`, with the same flag and the same rule
  (only `1` counts).
