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

### D23 — Per-file `schemaVersion`; a file from a newer BragDoc is read-only

- Every file type has its own integer format version (`SCHEMA_VERSIONS` in `shared/schema/common.ts`); an absent
  `schemaVersion` reads as 1, and files BragDoc creates state it. Bump a type's version only when an older BragDoc
  would misread the new shape; adding an optional key never needs one. Adapted from Paddock's `schema-version.ts`.
- A data file (anything but `config.yaml`) from a newer BragDoc, or one whose `schemaVersion` isn't a number, is listed
  as a Problem and **read-only**: if it still validates against the shape this version knows, it's shown; it's never
  written. `config.yaml` from the future refuses to boot (PR2).
- **Considered:** skipping future files entirely, as Paddock does for projects (hides data that's probably fine to look
  at); lenient parsing (the failure this exists to prevent: the next write drops the keys it didn't know).

### D24 — The store and the services are the only write path

- `server/store/` reads and writes the data home's files; `server/services/` is the operations layer that HTTP routes
  and MCP tools both call, reached through `AppContext.store` and `AppContext.services`. Nothing else writes there
  (test/guard-fs.test.ts counts every destructive fs call).
- Store writes are **synchronous** and edit the file as it is on disk at that moment (not the in-memory copy, which may
  lag a hand edit the watcher hasn't reported), as a YAML Document, then validate and write atomically. Synchronous
  means concurrent requests can't interleave inside a read-modify-write. Only file ingest (and Found's keep/merge,
  which ingest) is async.
- A file that's invalid on disk is never written: writes to it fail with a conflict until it's fixed by hand. It still
  claims its `externalKey`s and `legacyId` (read from whatever parses, else its `externalKey:` lines), so a dismissed
  PR doesn't come back while its file is broken. Keys map to sets of files, so a hand copy doesn't lose one on removal.
- Ids are checked before they become paths (a ULID; a sha256 for evidence), so no id can reach outside its own file.
- Evidence items keep keys this version doesn't know, and list edits match items by `id`, so removing one never moves
  another's comments or fields onto its neighbour. A nested mapping (`quote:`) is replaced whole.
- Writes replace a symlinked file with a regular file (atomic rename). Keep the data home itself, not single files in
  it, behind a symlink if you need one.
- A file's `id:` must match its name, and may be left out of a hand-written file. An achievement's folder is the UTC
  month its ULID was made in.
- Removing anything moves its file to `backups/removed/<stamp>/`; references to it are left alone, so restoring is
  lossless. Meanwhile each missing target is **one** dangling-reference Problem, however many files point at it.
- File ingest takes absolute paths only, and refuses anything in the data home or in a hidden directory (after
  following symlinks): an agent asking for `secrets.yaml` or `~/.ssh` is never asking for evidence. A screenshots
  candidate's files must be images.
- Found: decided candidates stay on disk (that's how a dismissed `externalKey` stays dismissed); `decision` records what
  was done so undo can reverse exactly that (remove the achievement a keep made; take off exactly the evidence a merge
  added). Keeping a candidate whose key reached the board meanwhile is a merge, so undo never removes an achievement
  the candidate didn't make. A candidate's local files are copied into `evidence/` only on keep or merge.
- Projects have a `status` of `active`, `paused`, `done` or `archived`; new projects take the next of the twelve
  prototype swatches (`PROJECT_SWATCHES`).
- **Considered:** an async store with per-file locks (Hallway's; needed there because writes await, not here); deleting
  references when a project is removed (many writes, and undo would have to rewrite them all back).

### D25 — js-yaml reads, `yaml` writes

- The boot scan reads every file, and `yaml`'s Document parser takes about 0.13 ms per small file (5,000 achievements:
  ~1.2 s on a fast machine, too close to the 2 s budget on CI). js-yaml is about seven times faster, so the read path
  uses it, with YAML 1.2's core schema (as `yaml` does by default: no timestamps, so dates stay strings) and its
  duplicate-key refusal. Writes still edit `yaml` Documents (comments and order survive), and Problems are located on
  one. A file with an anchor (`&`) is read by `yaml` instead, which caps aliases; js-yaml doesn't.
- test/yamldoc.test.ts holds the two parsers to the same answers on hand-edit edge cases, and a write re-reads its own
  output through the read path before it touches the disk.
- **Considered:** a parsed-value cache in `cache/` (helps warm boots only, and adds invalidation); `yaml` alone
  (simplest, but the budget).
