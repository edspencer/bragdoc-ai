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

### D26 — Origin must be the server's own, on every request; Fetch Metadata guards the API

- Any `Origin` a browser sends must equal the request's own `Host` (host and port; the scheme isn't compared, since a
  TLS-terminating proxy hides it). The check runs on **every** request, not only writes, so the SSE stream and any
  streaming or WebSocket endpoint a later PR adds are covered without anyone remembering to (Paddock's
  WebSocket-origin gap, its #975, was a route that forgot). `Origin: null` is refused.
- An **absent** `Origin` is allowed, including on `/api/events`. SPEC R3 says SSE "requires an allowed Origin, since
  browsers send it on EventSource", but browsers send no `Origin` on a *same-origin* GET, the app's own EventSource
  included: requiring one would refuse the app itself. Cross-origin EventSources do send it, and are refused.
  Non-browser clients send none and can't be a cross-site vector; the Host check still applies to them.
- `Origin: null` is refused, with one exception: together with `Sec-Fetch-Site: same-origin`. The Fetch spec gives a
  same-origin write under `Referrer-Policy: no-referrer` (SPEC R3's header, which we send) `Origin: null`, and Firefox
  follows it; Sec-Fetch-Site can't be set by a page, so it tells that apart from a sandboxed frame. CI runs the e2e
  suite in Firefox for this.
- `/api/*` and `/mcp` refuse `Sec-Fetch-Site: cross-site` and `same-site`. Same-site matters on shared hostnames:
  another app on a sibling subdomain is same-site, but not us.
- Stricter than SPEC's "a present Origin must be allowed" (any allowed hostname, any port): another local app on
  another port is refused too. The cost: a reverse proxy that rewrites `Host` breaks writes. Proxies that pass `Host`
  through (Caddy's default, nginx with `proxy_set_header Host $host`) work.
- **Considered:** Hallway's rule (Origin checked on writes only, any local port); requiring `Origin` on SSE (breaks
  the app, as above).

### D27 — The platform's own files are written by `server/atomic.ts`, not the store

- `runtime.json`, `logs/network.jsonl`, and the starter `.gitignore` / `config.yaml` are machine-written (or written
  once, create-only), so `server/atomic.ts` writes them: Hallway's temp-file-and-rename, and a hard link for
  create-only. Everything people and agents edit still goes only through the store (D5).
- `legacy-cli/`: home.ts moves the old CLI's files there with a plain rename into a fresh directory (nothing can be
  replaced).
- When PR3's `test/guard-fs.test.ts` lands, its allow-list needs entries for `atomic.ts` (one temp `writeFile` with
  flag `wx`, one `appendFile`, one `rename`, one `unlink` of its own temp), `home.ts` (two `rename`s: each legacy entry
  into the fresh `legacy-cli.partial/`, then that directory to `legacy-cli/`) and `egress.ts` (one `rename`: rotating
  the log). Whichever of PR2/PR3 merges second adds them.
- **Considered:** waiting for PR3's safefs (PR2 and PR3 are built in parallel); writing runtime.json with a plain
  `writeFileSync` (not atomic: a reader could see half a file).

### D28 — The legacy notice is shown on the start that moved the files; a recreated `config.yml` warns every start

- A home counts as BragDoc's once it has `config.yaml`, `runtime.json` or `legacy-cli/`. Only a home with none of
  them, and with the old CLI's signature (its `config.yml` or `cache/commits/`), has the old CLI's `config.yml` /
  `cache/` / `logs/` moved: BragDoc's own `cache/` and `logs/`, or a `--data-dir` folder that merely has a `logs/`,
  are never mistaken for the old CLI's.
- The entries go into `legacy-cli.partial/` and that is renamed to `legacy-cli/` at the end, so a move cut short is
  finished on the next start instead of leaving the home half-moved but marked as ours.
- `legacy-moved` is a notice for the life of the process that did the move (there's no notice state to remember a
  dismissal yet). Settings → Data (PR10) can show `legacy-cli/` itself permanently. `legacy-recreated` (a warning) is
  raised on every start while a `config.yml` is back.

### D29 — `config.yaml` v1 owns `allowedHosts`, `mcp.writeTo` and `sources.github.{enabled,auth}`

- The egress allow-list needs to know whether GitHub is connected with a token, so PR2 defines
  `sources.github.enabled` and `sources.github.auth: gh | token` (the token itself lives in `secrets.yaml`). Later PRs
  add optional keys (`sources.screenshots`, …) without bumping `schemaVersion`.
- Unknown keys are ignored on read, and config.yaml is never rewritten by the platform, so nothing is lost.
- An invalid edit keeps the last good settings and raises a `config-invalid` notice; a future or unreadable
  `schemaVersion` refuses to start (Paddock's downgrade guard), and if it appears while running it's a notice.
- PR1's interim inline bind guard (D21) is replaced by `server/bind-safety.ts`, with the same flag and the same rule
  (only `1` counts).

### D30 — `proc` resolves binaries itself; its allow-list includes `open` and `xdg-open`

- `proc.run('git', …)` resolves `git` to an absolute path from the **absolute** entries of `PATH` only. An empty or
  relative entry (`::`, `.`) would otherwise let a repository's own `./git` run when `git` is started with that
  repository as its working directory.
- The allow-list is PLAN's: SPEC R3's (`gh`, `git`, `osascript`, `launchctl`, `systemctl`, `journalctl`, `claude`,
  `defaults`) plus `open` and `xdg-open`, which `bragdoc serve --open` (PR5) needs. `tail` is not on it: PR5's
  `service logs` on macOS follows the log file in-process, or adds `tail` here with a reason.
- `logProcess()` records a `gh` run by its leading subcommand and path only, stopping at the first flag: a flag's
  value can be a header (`-H 'Authorization: …'`) or a GraphQL query.

### D31 — `bragdoc service`: a login service, always restarted, read back from its own unit

- macOS: a **LaunchAgent** `ai.bragdoc.local` in `~/Library/LaunchAgents`; Linux: a **systemd user unit**
  `bragdoc.service` in `$XDG_CONFIG_HOME/systemd/user`. Windows: "not supported yet" (D14). It runs as you, so it
  **starts at login, not at boot**; on Linux, `loginctl enable-linger` (suggested, never run) keeps it past logout.
- The unit runs `process.execPath` and the realpath of `dist/server/cli.js` (never the bin shim), with the PATH
  captured at install minus per-shell directories. Homebrew's versioned `Cellar/node/<v>` path is swapped for its
  `opt/node` symlink, which survives `brew upgrade`; `status` warns when the Node a unit names has gone. `install` refuses to run from npx's (or pnpm dlx's, bunx's) cache,
  and from an unbuilt checkout.
- **Always restarted**: KeepAlive `<true/>` / `Restart=always` (Paddock #872: a conditional restart leaves it down
  after a graceful SIGTERM). Stopping on purpose is `bragdoc service stop`, which lasts until the next login
  (or, on Linux with lingering on, the next boot; launchd: bootout; systemd: stop, never disable). `serve` exits 0 on
  SIGTERM, which is exactly the case a conditional restart would leave down; the CI job proves it comes back. `uninstall` is the permanent one.
- The port is always written into the unit, and `status` / `start` / `restart` read it back from there; the data home
  is written only when it was chosen (`--data-dir`, `$BRAGDOC_HOME`), so by default the service and a terminal
  `bragdoc` share `~/.bragdoc`. `install`, `start` and `restart` wait up to 20 s for `/api/health`; a timeout is
  reported as a caveat, not an error.
- Logs: macOS writes both streams to `<data home>/service/bragdoc.log` (followed in Node by `service logs`, no
  `tail`); Linux uses the journal (`journalctl --user -u bragdoc.service -f`).
- **Deviation:** `install` creates `<data home>/service/` itself (launchd and systemd both need the working directory
  to exist before they start the job). That's a write to the data home outside the store (PR3), and only that
  directory; PR3's fsguard allow-list and PR2's `.gitignore` should include `service/`.
- `install --dry-run` prints the unit and the commands and writes nothing.
- **Considered:** a LaunchDaemon / system unit (boots without a login, but runs as root, without your `gh` login);
  Hallway's `stop` that also disables (Paddock's "for this session" is easier to explain, and the same on both).

### D32 — Until PR2: one subprocess module, one fetch site

- PR2 brings `server/proc.ts` and `server/egress.ts` and a guard test that only they may spawn or fetch (D9). PR5 was
  built alongside it, so its subprocesses all go through `server/platform/runner.ts` (`execFile` for launchctl,
  systemctl; a streaming `spawn` for `journalctl -f`; a detached `spawn` for `open` / `xdg-open`), and its one HTTP
  call, the loopback `/api/health` probe (with a plain TCP connect as its fallback, so a non-HTTP listener still counts
  as "taken"), is in `server/commands/ready.ts`.
- Whichever of PR2 and PR5 merges second moves those two files onto `proc.ts` / `egressFetch`. `proc.ts` needs a
  streaming variant (inherited stdio, no timeout) for `journalctl -f`, and `launch` (detached, not awaited) for `--open`.
- PR2's bind guard replaces `assertBindAllowed()` in `server/cli.ts`, its single call site (D21).

- **At integration (PR5 merged after PR2), the move was deferred, not done.** It isn't a drop-in: `proc.ts` has no
  detached `launch` (for `--open`), `runAttached` doesn't forward SIGTERM/SIGHUP to `journalctl -f` as the streamer
  does, the probe's TCP fallback needs `node:net`, and `egressFetch` would log every 250 ms readiness poll to
  `logs/network.jsonl`. So `test/guard-egress.test.ts` lists these two files with exact counts, marked interim, and
  the move is a follow-up PR with its own review. Until then nothing else may import `node:child_process` or call
  `fetch`.
- **Done in PR20.** `proc.ts` gained `launch()` (detached, no stdio, unref'd; resolves once started), and
  `runAttached()` forwards SIGINT/SIGTERM/SIGHUP to its child while it runs. `runner.ts` keeps the injectable
  `Runner`/`Streamer` types with proc.ts as their defaults (a `journalctl` stopped by one of those signals still counts
  as exit 0, as before). The probe moved into egress.ts (D51). guard-egress has no interim entries left.

### D33 — `/dev/kit` exists in dev and `BRAGDOC_KIT=1` builds, never in a release

- The component kit's showcase (`src/dev/Kit.tsx`) is the reference for building pages and the source of the kit's
  screenshots, but it isn't part of the product. `vite.config.ts` defines `__BRAGDOC_KIT__`: true under `npm run dev`
  and in builds made with `BRAGDOC_KIT=1` (the capture rig makes one), false otherwise. When false, the route's lazy
  import is dead code the bundler drops, and `/dev/kit` is the not-found page. `test/web.test.ts` and an e2e spec
  check a release build leaves it out.
- The route file always exists, so the generated route tree is the same in every mode (D20 keeps it uncommitted;
  this keeps it from churning between builds).
- **Considered:** an ignore pattern for `src/routes/dev/` in production builds (the route tree would differ by mode,
  and the typed links to it would break); shipping it (about 25 KB of demo content plus its fixture images, for nobody).

### D34 — Text on a project colour: whichever of near-black and white reads better

- Project colours can be any colour (SPEC R6), so text on them (pills, Gantt bars, nav pills) is picked in `inkOn()`:
  the ink with the higher WCAG contrast. The crossover is near luminance 0.18, and no colour gets less than about
  4.2:1. A unit test sweeps the swatches and a range of colours.
- The Scrapbook prototype used a fixed threshold of 0.36, which put white on its own green at 2.67:1 and on tomato at
  3.39:1. Now green, tomato, pink and teal get dark text (the Board and Folio nav pills too); blue, violet, purple,
  brown, slate and near-black keep white. A visible change from the prototype, made for legibility.
- Kit text on fixed colours follows the same rule: dark ink on the green `go` button and the amber Found badge.
  The tomato accent button keeps the design's white text (3.4:1, bold); revisit if it reads poorly.

### D35 — Brand assets are generated with Playwright's Chromium; fonts are self-hosted

- `brand/mark.svg` (a "b" path on a tomato tile, no font needed) is the source of the favicons, icons and social
  cards, which `brand/generate.mjs` renders. Adapted from Local Review's generator, but rasterising with the Chromium
  that `@playwright/test` already brings instead of adding `@resvg/resvg-js` and `opentype.js`. The app and the docs
  site (PR18) both use `brand/`.
- The four Scrapbook fonts come from `@fontsource` packages, bundled into `dist/web` by Vite: the app makes no
  request to a font CDN (or anywhere else off the machine; `test/web.test.ts` and e2e check).
- Browser-driving code (`e2e/`, `tools/`) type-checks under its own `tsconfig.tools.json`, which adds the DOM types
  for `page.evaluate()` callbacks, so the server's config stays DOM-free.

### D36 — Every build writes `dist/build-info.json`; only the release workflow's is "official"

- `scripts/build-info.mjs` runs at the end of every `npm run build`, so the npm package, the Docker image and a
  checkout's build all have one: version, commit, build time (`SOURCE_DATE_EPOCH`, set by the release to the commit's
  time), Actions run URL, `official`. `official` is true only with `BRAGDOC_OFFICIAL_BUILD=1` **and** a run URL, which
  only `release.yml`'s non-dry runs set. CI, dry runs and `npm pack` on a laptop are "unofficial builds".
- `GET /api/meta` (PR2) serves it as `build`, typed `BuildInfo` in `shared/api.ts`, and passes on only a file of that
  shape (anything else is `null`). It's a claim, never a verification (SPEC R14): About → Verify (PR10) shows it next to
  `npm audit signatures` and `gh attestation verify`.
- Source maps: none are emitted (tsconfig.build.json, Vite's default); `scripts/strip-maps.mjs` (Paddock's
  `copyTreeWithoutMaps`, in place) removes any that appear, and smoke:pack checks the installed package.
- **Considered:** writing it only in the release workflow (then a dev build has no `build`, and About has two code
  paths); a version-embedded TS module (a rebuild of the server for a metadata change).

### D37 — `release.yml` is manual-only and dry-run by default until the release channel is decided

- Triggers: `workflow_dispatch` (inputs `dist-tag`: `next` | `latest`, and `dry-run`, default **true**) and
  `pull_request` on changes to `release.yml` itself, always a dry run. No push trigger (#411 Q1 is open). A real run is
  refused outside `next` and `main`.
- Hallway's shape (changesets version PR, detect, `verify-ci`, publish, provenance check, GitHub Release from the
  CHANGELOG section) plus Paddock's images (native amd64/arm64 runners, push by digest, `imagetools create`), with
  these changes: the npm tarball is built and smoke-tested once (`pack`) and that exact file is published and attached
  to the release; the image is started and checked (`scripts/smoke-image.sh`) before it's pushed; build provenance and
  an SBOM are attested on the image in GHCR, and provenance on the tarball; **npm publishes last**, after the image
  (Paddock's lesson: the irreversible step goes last).
- The pull-request dry run exists because GitHub only lets you dispatch workflows that are on the default branch
  (`main`), so until `next` merges, dispatching it is impossible and the PR run is the only way to exercise it.
- A dry run skips every step that writes (the version PR, registry login and pushes, attestations, tags, the Release)
  and runs `npm publish --dry-run`. test/release.test.ts holds those properties.
- **Considered:** a reusable workflow for SLSA Build L3 (RECOMMENDATIONS §12; worth doing, but after there's anything
  to release); building the image only on PRs that touch it (D38).

### D38 — The Docker image: `--host 0.0.0.0` in CMD, uid 1000, git and gh inside, built on every PR

- `ghcr.io/edspencer/bragdoc`, multi-stage from `node:22-slim`, tini as pid 1, `HEALTHCHECK` on `/api/health` with
  Node's `fetch` (no curl in the image), `BRAGDOC_HOME=/data`, `VOLUME /data`, `BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1`.
- The bind is `serve --host 0.0.0.0` in `CMD`, not `ENV HOST=0.0.0.0` as the brief said: `serve` doesn't read `HOST`,
  and shouldn't, because many shells export it and a normal install must not open up because of that.
- It runs as the image's `node` user (uid 1000), not root, so what it writes into a mounted `~/.bragdoc` belongs to the
  user (compose.yaml's `user:` maps another uid). An unwritable data home now says so (`cli.ts`), instead of the old
  message blaming the port for any `EACCES`.
- git and gh are installed (GitHub's apt repo), because the server runs them for repositories and PRs (PR13); about
  150 MB of the image, which is ~550 MB unpacked.
- compose.yaml: `127.0.0.1:2724:2724`; `~/.bragdoc:/data`; the code folder (`BRAGDOC_CODE_DIR`, default `~/Code`)
  read-only at the same absolute path; the screenshots folder and `~/.config/gh` as commented, read-only options.
  Bind sources use `create_host_path: false`, so a missing folder is an error rather than an empty root-owned one.
- CI builds and checks the image on both architectures on **every** PR, not only those touching the Dockerfile: the
  image is the whole app, so a dependency or build change anywhere can break it. Nothing is pushed from CI.

### D39 — The docs site: Hallway's, plus a blog, the brand kit, and no third-party anything

- `website/` is Hallway's site (Astro 7, Starlight 0.42, sidebar in `src/sidebar.mjs`, generated llms.txt and per-page
  Markdown, a custom landing page with its copy in `copy.ts`), with local-review's `test/docs.test.ts` and What's-new
  release flow (SPEC R16). Its content rules are in `website/CLAUDE.md`.
- **Nothing third-party:** no analytics (Hallway's PostHog and `functions/ingest/` dropped), and no Mermaid (it loads
  from a CDN). `website/scripts/check-external.mjs` fails CI on any script, stylesheet, image, font or frame from
  another origin in `dist/`.
- **A blog**, which neither sibling has: a plain `blog` content collection rendered through `<StarlightPage>`, with an
  RSS feed (`@astrojs/rss`). Chosen over a third-party Starlight blog plugin so a Starlight upgrade can't break it.
- **The brand comes from the repo's kit** (`brand/`, PR4), copied in by `website/scripts/sync-brand.mjs`
  (local-review's) instead of PR18's planned placeholder `make-brand.mjs`; `test/docs.test.ts` compares the copies once
  `brand/` exists.
- **The landing page follows the reader's theme**, using Starlight's own `starlight-theme` key, because the app has a
  light and a dark theme (Hallway's landing page is always dark).
- **Honesty before release:** pages about unbuilt features carry a "Coming in v0.1" note, and `RELEASED` in
  `website/src/site.mjs` drives a "not on npm yet" notice. `test/docs.test.ts` fails if `RELEASED` disagrees with
  `package.json` (0.1.0 or later means released), or if any "Coming in v0.1" is left after the release.
- **The data-folder reference is generated:** `npm run sync:reference` writes the schema tables into
  `website/src/content/docs/reference/data-folder.md` as well as `docs/data-format.md`.
- **Deploying is Ed's:** Cloudflare Pages, root `website`, `npm install && npm run build`, output `dist`, production
  branch `next` until it merges into `main` (`website/README.md` "Deploying"). CI only builds and checks.
- **Considered:** `starlight-blog` (a dependency on a third-party plugin's release cadence); an always-dark landing
  page like Hallway's (unlike the app); generating the brand placeholder here (the real kit exists).

### D40 — `/mcp` is a route on BragDoc's own app, behind security.ts; the bearer token is checked before anything else

- `/mcp` is registered like any other route (`server/routes/mcp.ts`), so the security guard (Host allow-list,
  same-origin Origin, Fetch Metadata, JSON only, 1 MB) runs first, as for the API. The route then checks
  `Authorization: Bearer <token>` against `runtime.json`'s token in constant time, read on every request so a rotated
  token takes effect at once, before the SDK reads the body. GET and DELETE get 405 after auth (stateless, Paddock).
- `/.well-known/oauth-*` answers a JSON 404: a client that gets our 401 looks for OAuth metadata there, and the SPA
  fallback would otherwise hand it the web app's HTML with a 200.
- The SDK's stateless `createMcpHandler` (2026-07-28, with 2025-era clients served statelessly) is used as Hallway uses
  it. Resource-updated notifications for `bragdoc://context` come from `store.subscribe`, debounced to 250 ms.
- **Considered:** `@modelcontextprotocol/hono`'s `createMcpHonoApp` and its Host/Origin middlewares (PLAN names the
  adapter): security.ts is stricter (Origin must be our own host:port, not any localhost port) and already covers
  `/mcp`, so the adapter isn't a dependency.

### D41 — MCP tool arguments use the files' camelCase names; one extra tool, `bragdoc_get_achievement`

- SPEC R11 writes `external_key` and `repo_path`; the tools take `externalKey` and `repoPath`. An agent then uses one
  vocabulary everywhere: the files it may edit, the HTTP API, the tool arguments and what the tools return.
- `bragdoc_get_achievement` (read-only) returns one achievement in full with its etag, for
  `bragdoc_update_achievement`'s optional `etag`. Everything else is SPEC R11's list. No tool deletes anything.
- Tool inputs are strict objects: a misspelt key is an error the agent sees, not a value silently dropped.
- Evidence is given as `{ url | path | quote, title? }`. A GitHub pull request URL becomes `github_pr` evidence keyed
  `github_pr:owner/repo#n`, which also makes adding the same PR twice a no-op.

### D42 — `sourceAgent` holds the name the board shows; who it is comes from X-BragDoc-Client, then clientInfo

- `sourceAgent` is a display name (`Claude Code`), so a hand-edited file and the board agree and the kit's
  `ProvenanceBadge` shows it as is. Known client ids (`claude-code`, `claude-ai`, `cursor`, …) map to product names;
  anything else is shown as sent (printable, at most 60 characters).
- Order: the `X-BragDoc-Client` header (`mcp install claude` sets `claude-code`), then the client's own name from the
  request's metadata (2026-07-28 clients send `clientInfo` with every request). A 2025-era client served statelessly
  has no clientInfo on a `tools/call` (it was in an earlier request), so without the header it gets none and the board
  says "Written by an agent". SPEC says "an MCP client"; storing that placeholder in the file would make it look like a
  name, so nothing is stored. The stdio bridge sends the initialize's client name as the header, so stdio clients are
  always named.

### D43 — Files attached over MCP: an allow-list of types; `mcp.writeTo: found` leaves them in place

- A path given to `bragdoc_add_achievement`, `bragdoc_attach_evidence` or `bragdoc_add_found` passes the store's
  checks (absolute, a regular file, at most 25 MB, not in the data home or a hidden folder) and then a type allow-list,
  sniffed from the content: images, PDFs, office documents, plain text / markdown / CSV / JSON, and mp4 / mov / webm.
  An executable, an archive or unknown binary is refused before anything is stored (`IngestOptions.accept`, added to
  blobs.ts).
- With `mcp.writeTo: found`, a new achievement becomes a Found candidate whose files stay where they are until the user
  keeps it (D24); the same checks run at once, so a bad file fails the call rather than the keep, and again when it's
  kept (the file may have changed since: Found's keep applies `ATTACHABLE` to an agent's candidates).
- Updates and `attach_evidence` change achievements that already exist, so they apply whatever `mcp.writeTo` says.

### D44 — The stdio bridge goes through egress; `mcp install` needs runtime.json for its token

- `bragdoc mcp` sends each message with `egressFetch` (purpose `mcp.bridge`, loopback only), so its traffic is in
  `logs/network.jsonl` like everything else. That makes the bridge a second process appending to the log: appends are
  line-atomic, but if both rotate at the same moment the older file can lose its history, and the bridge's entries don't
  push a live `network` event (Settings shows them on its next load). Accepted for v0.1; the server could log `/mcp`
  requests itself instead if it matters. It reads the token from `runtime.json` and reads it again once on a 401
  (comparing with the token that request sent), so rotating the token doesn't need the client restarted. When
  `runtime.json` is missing or its pid is gone, it exits 1 with SPEC's message before reading stdin.
- `mcp install claude` (HTTP) takes the token and the port from `runtime.json`; before BragDoc's first run there's no
  token, and it says to start BragDoc once (or use `--stdio`) rather than minting one outside the server. An existing
  `bragdoc` registration is replaced (`claude mcp remove`, then `add`, both at user scope). `--stdio` registers this
  Node and the realpath of `dist/server/cli.js` (npx's command when running from npx's cache), plus `--data-dir` when
  one was chosen; from an unbuilt checkout it refuses.

### D45 — Deleting a project, company or repo from the UI takes it off whatever refers to it (and undo puts it back)

- The store's `remove` moves a file to `backups/removed/` and leaves references to it alone (D24), so a restore brings
  everything back as it was. Left like that, deleting a project from the Projects page would leave every achievement
  tagged with it pointing at nothing: a dangling-reference Problem each, in a list meant for broken hand edits.
- So the HTTP delete (`DELETE /api/projects/:id`, `/api/companies/:id`, `/api/repos/:id`) calls `removeAndDetach`:
  it checks `If-Match` first (a stale delete changes nothing), moves the file aside, then takes the id off every
  achievement (`projects`, `repos`, `companyId`) and, for companies and repos, every project (`companyId`,
  `repoIds`). It answers with the ids it changed (`detached`); `POST …/:id/restore` with `{ reattach: detached }`
  undoes both, and never overwrites a company a project was given in the meantime. A file that can't be edited
  (broken by hand, or from a newer BragDoc) keeps its dangling reference rather than failing the delete.
- A deleted company's projects therefore land in the Gantt's "No company" lane (SPEC R6). The UI offers **Archive**
  (status `archived`, hidden from the Gantt by default) next to Delete for anything you might want back later.
- The file is moved aside before the references are detached, so a crash in between leaves dangling references (the
  Problems list shows them) and an undo that can't know which files to reattach; the file itself is still restorable.
  Only the store's per-file refusals (a broken, newer or vanished file) are skipped while detaching; a real I/O error
  fails the request.
- MCP and other callers keep the plain `remove` (references left, as D24 says) unless they choose otherwise.
- **Considered:** refusing to delete anything still referenced (pushes people to hand-edit dozens of files);
  leaving dangling references (Problems noise, and the Board would draw pills for projects that don't exist).

### D46 — Adding a repo by folder reads that repo's git config, and nothing else

- `POST /api/repos { localPath }` checks the folder exists and has a `.git` (a folder, or a `gitdir:` file for a
  linked worktree or submodule), then reads exactly one file, that repository's `config`, for its remote: `origin`,
  else the first. No folder is listed or scanned (onboarding's bounded scan is PR16), and no `git` is run, so it
  works without git installed and stays off `proc.ts`'s allow-list.
- A remote BragDoc can't normalise (`normalizeRemote`) is left out rather than stored as written: a URL in a git
  config can carry credentials (`https://user:token@…`), and the normalised form never does.
- The folder is stored as people write it (`~/Code/my-app`) and compared that way, so adding it twice finds the first.
- A project's dates are checked on the way in (`end` on or after `start`); a hand-edited file that breaks the rule
  still loads and still draws (the Gantt clamps it), since files are never rejected for what the UI wouldn't allow.

### D47 — The importer: lenient per item, strict on the envelope; `legacyId` on companies and projects; 50 MB of JSON

- `server/import/` reads the hosted app's export version 1.0 (its format only, D2). The envelope is all-or-nothing:
  not JSON, not an object, no `version`, another `version`, or a list that isn't a list, and nothing is imported, with a
  sentence saying which. Each item is then checked on its own and more forgivingly than the hosted app's schema (any
  non-empty id, any date Date can read, a nullable field may be missing): one that still fails is an error in the
  report and the rest import. Items that need a small change import with a warning (an unusable colour gets a swatch,
  an unknown status becomes `active`/`done` by its end date, a reference to something not in the export is dropped and
  kept under `meta.legacy`, an empty title takes the summary's first line, an impact off the 1–10 scale is kept only in
  `meta.legacy`).
- Idempotency is by the hosted id: `legacyId` on achievements (already in the schema), and now on **companies and
  projects** too (optional fields, no version bump, D23); repos by their normalised remote; documents and reviews by
  the `legacyId` in their front-matter under `imports/`. A project that's already here isn't re-linked to its repo.
- `impactSource`: `user` stays `user`; anything else (the hosted app's `llm`) becomes `import`. The original is kept
  in `meta.legacy`. Dates are the calendar day of the hosted timestamps in the user's zone (the profile's, else the
  machine's): the hosted app's date picker stored local midnight and showed dates in the browser's zone, so the UTC day
  would move everyone east of Greenwich a day early. An achievement's company is written only when its project
  doesn't already imply it.
- Every field the export carries is either mapped, kept in `meta.legacy`, or reported as left behind with a reason, so
  the dry run accounts for all of it; a key that isn't in version 1.0 at all is reported as left behind too.
- Writes go through the services (D24); documents through `Store.writeImportFile` (create-only, 0444; the route calls
  the store for these directly, as there's no service for files nothing else writes). `apply` takes a snapshot first
  (if that fails, nothing is imported), re-checks each `legacyId` as it writes, and yields to the event loop every 200
  writes, so the server keeps answering during a large import (5,000 achievements: about 3 s). An item whose project,
  company or repo failed to import fails too, rather than come in unlinked, so re-running the import (once the cause is
  fixed) brings both, linked. One import at a time per data home: `cache/import.lock` holds the importer's pid and
  start time, and an in-process flag says whether this process holds it; a lock naming a dead process, our own pid
  without the flag (a restarted container reuses its pid), or more than an hour old is taken over. Releasing it is the
  one new `unlink` in test/guard-fs.test.ts.
- What was imported and then deleted (moved to `backups/removed/`) comes back if the same export is imported again:
  the importer only knows what's in the data home. The docs say so.
- `bragdoc import` sends the file to the running server (`POST /api/import/{plan,apply}`, via egress, loopback) when
  runtime.json names a live process, so the server stays the one writer (if nothing listens on its port, that pid has
  been reused, and the import goes direct); otherwise it lays out the data home as `serve`
  would and writes through the store itself, under the lock. A dry run on a data home that doesn't exist creates
  nothing.
- **The 50 MB body.** SPEC R3 caps JSON at 1 MB; an export of a few thousand achievements is several MB. Rather than
  make the export a typed upload (a JSON file is still JSON), `UploadRegistry.acceptLargeJson()` lets one route take
  `application/json` up to `LARGE_JSON_LIMIT` (50 MB); every other check (Host, Origin, Fetch Metadata, content type)
  applies as usual, and every other route keeps 1 MB. The CLI refuses a file over 50 MB before reading it.
- **Considered:** importing in one transaction that rolls back on any error (the store has no transactions, and a
  partial import is safe to finish by re-running it); matching companies and projects by name (would merge two
  different "Platform" projects); writing documents as achievements (they're reviews and reports, not things you did).

### D48 — Every store change reaches open tabs as a ServerEvent named after its entity

- `server/live.ts` subscribes to the store (`Store.subscribe`), which hears every change to a data file whether
  BragDoc wrote it (a route, an MCP tool) or something else did (a hand edit, `git pull`, an agent; the watcher), and
  emits `{ type: <entity> }` on the event bus (`achievement`, `evidence`, `project`, `repo`, `company`, `found`,
  `profile`), plus `{ type: 'problems' }` with each, since any change can break or fix a file. `createApp()` wires it, so
  there is exactly one forwarder; features don't add their own.
- Events are hints, never data: each type is debounced (`emitSoon`, keyed by type), so a burst of 200 files from a
  `git pull` is one push per type (a stream that never pauses still pushes once a second: `MAX_WAIT_MS`), and the
  web app refetches by query-key prefix (`CHANGE_INVALIDATES`:
  `achievement` and `evidence` → `achievements`, `project` → `projects`, and so on).
- **Considered:** carrying the id and op in each event (a debounced burst keeps only the last one, so the client would
  have to refetch anyway); one `{ type: 'store' }` event (every page would refetch everything on every change).

### D49 — `/api/evidence/:sha/thumb` serves the picture itself until there is an image library

- The board asks for `/thumb` on cards and the full file in the lightbox, so the URL contract is in place. In v0.1
  `/thumb` returns the stored picture unchanged (same blob headers, cached immutably: the bytes are content-addressed),
  and 404s for anything that isn't a picture. Cards load pictures lazily and decode them off the main thread.
- Making real thumbnails means a native image library (sharp/libvips, ~30 MB installed, per-platform binaries in the
  npm and Docker builds) or a slow pure-JS one; for pictures served over loopback that's a lot of weight for little
  gain. When that changes, `/thumb` starts writing resized copies to `cache/` (derived, deletable) and nothing else
  moves.
- **Considered:** `sharp` as an optional dependency with a fallback (two code paths, and an install that differs by
  platform); thumbnails made in the browser at upload (not derivable again, so not cache).

### D50 — Board uploads: stored as soon as they're added; the claimed type is checked against the bytes

- The composer uploads each file (`POST /api/evidence`) the moment it's pasted, dropped or picked, so a refused file
  (too big, spoofed, damaged) is said at once, and pinning is one small JSON request. If the server goes away
  mid-upload the item stays in the composer to retry; nothing is half-written (blobs are written atomically). A file
  uploaded and then taken out of the composer stays in `evidence/` unreferenced: content-addressed and harmless, and
  nothing is ever deleted (D24).
- The bytes decide the type (`sniff`, magic bytes), but the browser's Content-Type is a claim that's checked: one
  sent as `image/*` or `application/pdf` whose bytes aren't that is a 415 `type_mismatch` (an HTML page named `.png`),
  and a PNG/JPEG/GIF/WebP whose header has no readable size is a 415 `damaged`. A file the browser has no type for
  (a `.key`, a `.txt` sent as octet-stream) is stored as a file and served as a download.
- **Considered:** uploading on "Pin it" (a refusal would only show at the end, and a slow upload would block saving);
  rejecting every type mismatch (a `.key` is a zip; a type the browser doesn't know is not a lie).

### D51 — The CLI's readiness probe lives in egress.ts, is fixed to 127.0.0.1, and isn't logged

- `bragdoc service start|restart|status` polls `GET /api/health` every 250 ms for up to 20 s, and `serve` asks the
  same question once when its port is taken; when that request fails, a plain TCP connect tells "nothing there"
  from "something that isn't HTTP". Both now live in `server/egress.ts` as `probeLoopback(port, path, timeoutMs)` and
  `loopbackAccepts(port, timeoutMs)`, so `node:net` and the real `fetch` are still in one file only (SPEC R4).
- **They don't write to `logs/network.jsonl`.** A deviation from R4's "every request is logged", on purpose: the
  network log is the record of what BragDoc sends (or tried to send) somewhere, and a poll would fill it (up to 80 lines
  per start) with BragDoc asking itself whether it's up, burying the entries it exists to show. The exemption is safe by
  construction rather than by policy: the host is a constant (`127.0.0.1`), the caller gives only a port (checked as an
  integer, 1–65535) and a path (must start with a single `/`), no body or headers can be passed, redirects aren't
  followed, and the TCP check sends nothing. The CLI also has no data home's config or `Egress` instance at that point
  (it's probing a server that may not exist yet).
- Everything else to loopback (the `bragdoc mcp` stdio bridge, D44) still goes through `egressFetch` and is logged:
  it carries data.
- **Considered:** `egressFetch` with a "don't log" flag (a flag any caller could set, to any allowed host); logging
  only the first and last poll (still the CLI writing into the server's log, from another process); a separate
  `server/platform/probe.ts` allowed `node:net` (a second network file for the guard to trust).

### D52 — OCR: tesseract.js with its English data in the package and no network; Vision through JXA; rules you can read

PR11 (SPEC R7, R8, R4). The library is `server/ocr/` and `shared/rules/screenshot.ts`; the screenshots source and
pasted images (PR15) are its callers.

- **The language data ships with the package, never fetched.** `@tesseract.js-data/eng` is a runtime dependency, and
  tesseract.js reads its LSTM-only `4.0.0_best_int` model (2.9 MB) from disk. Fetching it from tesseract.js's default
  CDN would be a download nobody asked for, and an egress call; an opt-in download was the alternative and buys
  nothing for one language. Other languages, if ever, are an explicit opt-in download through `egress`.
- **tesseract.js can't reach the network or write a file.** Images go in as bytes (a string is fetched if it looks like
  a URL), `langPath` is a local directory, `cacheMethod: 'none'` (by default it caches the data in the current
  directory). And the worker thread runs `server/ocr/tesseract-worker.ts`, our copy of tesseract.js's 15-line Node
  worker entry, whose adapter's `fetch` only fails and whose cache writes are no-ops. That file is the egress guard's
  one reviewed `node:worker_threads` import, and tesseract.js itself is allowed only in the two OCR files (it can
  fetch). The worker also ends its thread when language data fails to load or initialise: tesseract.js 7's
  `createWorker()` otherwise never settles, and the stray thread keeps the process alive. The engine listens for the
  thread's own `error`/`exit` (tesseract.js's `onerror` does nothing on a Node Worker, so an error in the thread would
  otherwise crash the server). tesseract.js is pinned `~7.0.0`, because the worker loads its internals. Checked by
  test/ocr.test.ts (the worker pointed at the CDN fails; the global fetch throws throughout), `smoke:pack` (the
  installed package with every socket, DNS lookup and fetch made to throw) and the Docker smoke (`--network none`).
- **Small screenshots are scaled up.** A PNG narrower than 1600 px is decoded (pngjs, pure JS), flattened onto white
  and scaled 2× before tesseract reads it: a non-Retina chat screenshot went from mean confidence 33 to 85. Over 40 MP
  is refused. Other formats go in as they are.
- **Apple Vision is a JXA script, not a binary.** `osascript -l JavaScript` bridging to `VNRecognizeTextRequest`, run
  through `proc.run`, with the image as base64 on stdin (no temp file) and JSON lines back. A capability probe runs
  once; a failure on any image falls back to tesseract.js, and the result says which engine ran and why another
  didn't. It is checked for real on the macOS CI runners only; the Linux box tests its contract with a fake osascript.
- **One read at a time, cached by sha256.** At most 100 waiting (then `busy`); the same image queued twice is read
  once; a read past its timeout (60 s) terminates the worker. The cache is in memory, except that evidence files keep
  their text in their sidecar's `ocr` (where search reads it): a screenshot that isn't kept leaves no text on disk.
- **The rules, as built.** `pass` = (a) your name, surname, handle or a non-initials alias, OCR-tolerant
  (`AIex` is Alex), minus `notMe`; or (b) your initials, case-sensitive, never a time (`9 AM`, `AM PT`, `AM/PM`) or
  capitals; **and** (c) praise, or an impact (a number with a unit, money, customers, a promotion), **in the same
  message**. Messages are split at chat author lines (`Dana Whitfield 4:52 PM`); without any, a name and a praise word
  must be within three lines. (d), the chat cues (`#channel`, replies, timestamps, @-mentions), only lift borderline
  cases: a lone "thanks"/"great" or an impact number counts in a chat window, not on a dashboard. Additions to the brief
  from testing on OCR text: your own messages and bots' never pass; a bare acknowledgement ("thx AM") is dropped, as in
  the spike, but only when nothing after the thanks praises; a reply in a thread under your own message counts as
  (a) when it names nobody else on screen; avatar initials and emoji debris that OCR reads into a message are cleaned
  off. A name of three letters or fewer is matched as written ("Al" isn't every "AI"); a bot is a lower-case `…bot`
  author or an `APP`/`BOT` tag, not any name ending in "bot"; a `#` needs a letter to be a channel (`#412` is a PR).
- **Measured** (`npm run eval:screenshots`, the Found spike's 218 messages drawn as screenshots): perfect text, recall
  83% / precision 70% (96% without sarcasm); through tesseract (`-- --ocr`), recall 79% / precision 69% (95% without
  sarcasm). **These are in-sample:** the praise and impact vocabulary was tuned on these same messages, so a fresh set
  will do worse; they're a regression floor (test/screenshot-rules.test.ts pins them), not a forecast. The
  misses are DMs that never name you; nearly every false pass is sarcasm, which rules can't read and the future judge
  is for (`shared/judge.ts`, unchanged: the seam already had the right shape). All 18 hand-made screenshots (Slack light,
  dark, small and Retina; an email; a dashboard; a code editor; a standup invite; a blank image) give their expected
  outcome; "praise for someone else, naming you in passing" passes, and is documented as a limit.
- **Size:** the installed package grows from about 24 MB to 80 MB: tesseract.js-core is 43 MB (six wasm builds, of
  which one runs) and the language package 13 MB (two models, of which the 2.9 MB one is read). Vendoring just the
  model and one wasm build would save about 50 MB but means maintaining tesseract.js's loader ourselves; not worth it
  for v0.1.
- **Considered:** a compiled Swift helper for Vision (a binary to build, sign and ship per arch); the CDN or an opt-in
  download for the data; sharp for scaling (native, large); counting impact numbers anywhere (every dashboard passed).

### D53 — Settings edits config.yaml through `ConfigStore.update()`, byte for byte where it can

- The Settings pages change settings (PR10: `mcp.writeTo`; PR13 and PR15 their sources) with `ctx.config.update(patch)`,
  a JSON merge patch applied to the file **as it is on disk at that moment**, so a hand edit made a second earlier
  survives. A change to one existing plain value (`writeTo: board` → `found`) replaces just those characters, so the
  rest of the file, the template's aligned comments included, stays byte for byte; anything else re-prints the
  document through the store's `yamldoc` (comments and unknown keys kept, alignment not). The result must validate;
  the write is the store's `safefs.atomicWrite`.
- A broken config.yaml (bad YAML, a value that doesn't validate, a `schemaVersion` from a newer BragDoc, unreadable) is
  **never overwritten**: `update()` throws `ConfigWriteError`, the API answers 409 with the reason, and the UI says to
  fix the file by hand. This is SPEC R2's rule for every other data file.
- config.yaml stays outside the store (D27): it isn't an entity, it has no id and no index, and the live re-read in
  `ConfigStore.get()` already makes hand edits take effect. The notices that name it now say `~/.bragdoc/config.yaml`
  rather than the absolute path (shorter, and nothing private in a screenshot).
- **Considered:** making config.yaml a store entity (a lot of machinery for one file whose reader already exists);
  re-printing the document every time (it re-spaces the comments people line up).

### D54 — Settings → Network activity can ask for a forbidden request ("Test the guard")

- `POST /api/network-log/guard-check` asks `egress` for `https://guard-check.bragdoc.invalid/`. It's refused before
  anything is sent (no allow-list can contain it, and `.invalid` can never resolve anyway, RFC 2606), logged like any
  refusal, and pushed to the open receipt as a red "refused · not sent" line. It's what the plan's "denied-egress test
  hook" became: rather than a hidden test route, the user can see the promise kept. `refused: false` is reported as a
  broken guard.
- The receipt pages the log 100 entries at a time, newest first; a `network` event refetches every loaded page
  together, so offsets stay consistent as new entries arrive (1,500 entries page in about 0.1 s each on the dev box).
- No AI tab. The prototype has one, but v0.1 has no AI (D8), so the only AI copy in Settings is one sentence on the
  Network page saying no model is ever contacted. The AI opt-in arrives with the AI work, as its own tab.
- **Considered:** a test-only route behind an environment variable (invisible to the people the promise is for).

### D55 — Folio: made in the browser, from clippings that can't point back at this machine

PR14 (SPEC R9). `GET /api/folio?from&to` returns the window's achievements (archived ones left out) already cut down
to "clippings" (`toClipping` in `shared/folio.ts`), plus every project and company and the profile's name. Filters,
include/exclude, the printout and the markdown are all worked out in the browser from that one answer, by the same pure
functions the tests pin, so changing a filter never waits on the server and Copy, Export and Print can't disagree.
Export is a download of a blob made in the page; nothing about a folio is written to the data home.

- **What a folio may contain.** Titles, summaries (or, with none, the body's first paragraph on one line), dates,
  impact, project and company names, and evidence as something a reviewer can follow: pull requests as
  `owner/repo#n` links to github.com, links as links, quotes as blockquotes, and files (pictures, PDFs, anything else)
  **by name only** (a caption, else the name it was added with, with any folder stripped). Never an id, a sha, a
  file's location, or a URL that only works on this machine or its network: loopback in any spelling, private and
  link-local ranges (IPv4 and IPv6, IPv4-mapped included), single-label hosts and `.local`, `.lan`, `.internal`,
  `.home.arpa`, `*.localhost`. A link evidence item to such an address is named and marked "a local address, left
  out"; a non-web one (`mailto:`, `ftp:`, `file:`) is dropped; a PR key or URL that isn't GitHub's
  `owner/repo#n` shape becomes "a pull request", unlinked. **Text people wrote is scrubbed too** (`scrubText`: titles,
  summaries, the body's first paragraph, quotes, captions): local links become "(a local link)", home-ish, relative,
  Windows and `file:` paths become the file's name, and BragDoc's own `/api/…` routes and content hashes go. Ordinary
  slashes ("PDF/CSV") are left alone. Lines that would start a markdown block (a heading, list, quote, rule, setext
  underline) are escaped, so a summary of `---` can't restructure the document. The server makes the clippings, so
  the page never holds what it mustn't export.
- **Order and grouping.** Best first: impact, then newest (unrated last). Grouped by project (default; a
  multi-project achievement goes under the first project the filter kept, once), by month or by week (newest first;
  each line then names its projects). "At least N impact" leaves unrated achievements out, as the board's filter does.
- **State lives in the URL** (`from`, `to`, `p`, `c`, `min`, `out`, `group`, `view`): a reload, Back or a bookmark
  gives the same folio. A malformed value is dropped rather than refused; a filter on a project or company that has
  since been deleted counts for nothing.
- **Presets** are worked out from the user's local today: this quarter (to today), last quarter, the last six months,
  this year (to today), last year. No window in the URL means the last six months.
- **No AI, and no AI affordance** (D8, SPEC R9): no "Draft with AI" button, locked or otherwise. The page says the
  folio is exactly what you picked, nothing added or rewritten.
- **Considered:** generating the markdown on the server (`GET /api/folio.md`): one more place the format lives, and a
  long `out=` list in a URL either way; rendering the printout from the markdown (a markdown renderer in the bundle
  for one page); grouping by week only (a six-month review would have 26 headings).

### D56 — A dismissed candidate keeps only the hashes of its keys; undo comes from memory

- Dismissing rewrites `found/<id>.yaml` as a tombstone: id, source, status, the decision, its dates, the title
  `Dismissed`, and `keyHashes` (`sha256:<hex>` of its `externalKey` and its evidence's keys). The PR's title, body and
  link, a screenshot's path, an agent's text and the suggestions are all cleared. The store indexes the hashes, so
  `foundIdByKey()` still finds it (also when the file is broken: `scanKeys` reads the hash lines), and the same PR or
  screenshot is never added again, by a source or by MCP's `bragdoc_add_found`. This is FOUND-SPIKE §7's data
  minimisation ("keep at most a hash of externalKey for rejected items"), applied to every source.
- Undo (the toast's) restores the candidate from a copy the FoundService holds in memory while the server runs. After
  a restart a dismissal is final, and undo says so (409). Keep and merge undo as before.
- The hash isn't secret: anyone who can guess a PR's key can check it. It's there so the file doesn't hold the content,
  not to hide that a key was seen. Snapshots taken before the dismissal still hold the full candidate until they're
  pruned (30 days at most).
- **Considered:** keeping dismissed candidates whole (simplest, but keeps text the user said no to); deleting the file
  and keeping hashes in a separate list (a second file to keep consistent with found/, and one more place for
  hand edits to go wrong); undo by re-sending the candidate from the browser (a client could then write any candidate).

### D57 — The GitHub source: opt-in, no polling unless you turn it on, and where to look starts from your tracked repos

- **When it runs:** on connect, on **Check now**, and every hour while BragDoc runs **only if `sources.github.hourly`
  is on** (default off). SPEC R7 says "polls hourly while running"; the orchestrator's rule for v0.1 is no polling the
  user didn't ask for, so hourly is a switch on the card. One check at a time; a second request gets the running one.
- **Where it looks:** `sources.github.repos`, owners (`acme`) and repositories (`acme/app`). The connect form fills it
  with the GitHub remotes of the repos you track; empty means everywhere you merged, which the form says. Owners and
  repositories are searched separately (GitHub ORs qualifiers of one kind), and results are filtered again locally.
  A repository BragDoc doesn't know is added to `repos/` untracked (SPEC R6: repos come from PR discovery).
- **What it searches:** merged on or after a cursor (UTC dates; the first check looks back `lookBackDays`, 90), by
  windows: a window GitHub can't return in full (over 1,000 results) is split in two and searched again. The cursor
  moves only after a check that worked. Changing `repos` or `lookBackDays` resets it; dedup by key makes re-looking
  harmless. `gh search prs --json` has no merged time, only `closedAt`, which for a merged PR is when it was merged.
- **Its state** (cursor, login, last check, backoff) is machine-written, derived and deletable, so it's
  `cache/sources/github.json` (via atomic.ts, 0600), not config.yaml and not the store.
- **Connecting with a token:** the egress allow-list only has `api.github.com` while a token is connected (D29), so the
  token is saved and the source switched on, `GET /user` checks it, and on any failure both are put back exactly as
  they were. The token is never kept if GitHub refuses it. It lives in `secrets.yaml` (0600, `server/secrets.ts`
  through atomic.ts), never in config.yaml, and is never logged (the network log has paths only).
- **Errors** are a fixed set of codes with plain-words messages (`gh_missing`, `gh_logged_out`, `token_missing`,
  `token_invalid`, `token_scope`, `rate_limited`, `offline`, `failed`), shown on the card and in Found's empty state.
  A rate limit waits until GitHub's reset time (or `Retry-After`); without one, 15 minutes doubling to 6 hours. While
  it waits, Check now answers 429 and nothing is sent.
- **Considered:** auto-creating repos only on Keep (candidates would then carry no repo to show or suggest from);
  polling hourly by default (SPEC's wording; overruled for v0.1); storing the cursor in config.yaml (machine state in
  the user's file).

### D58 — The screenshots folder: opt-in, new files only, read through one OCR queue; the board's pictures too

- **Opt-in, and only what's new.** Off until you choose a folder in Settings → Sources (`sources.screenshots.enabled`,
  `folder`, `onlyScreenshots` in config.yaml, written through `ctx.config.update()`, D53). chokidar with
  `ignoreInitial` and `awaitWriteFinish` (the size must hold still for a second), depth 0, no links followed, hidden
  and temp files ignored (macOS writes a hidden `.Screenshot …` first). What's already there is read only when you
  ask: **Look at the last 7 days** (1–30 days), once: pictures only, the newest 1,000, read oldest first, one look back
  at a time. So screenshots saved while BragDoc was stopped (or the folder was gone) aren't read by themselves: catching
  up on start would be the back-scan nobody asked for; the docs point at the look back instead. Suggestions come from `defaults read com.apple.screencapture
  location` through proc.ts on macOS (else `~/Desktop`), and `XDG_PICTURES_DIR/Screenshots` on Linux.
- **The filters, before any OCR:** a picture extension; a name like a screenshot's (on by default): "screenshot" in the
  languages macOS uses and the common tools' names, or a date-then-time stamp, which covers macOS's U+202F before
  AM/PM, GNOME, Spectacle, Flameshot and Windows (best effort); the bytes must sniff as a picture; no side under 64 px;
  nothing over 25 MB (it could never be kept as evidence, MAX_BLOB_BYTES). A key already in Found or on the board is
  skipped before OCR. Without a name in profile.yaml nothing is read: the rules couldn't pass.
- **Rules, never a model (D8, D52).** `compileRules(profile)`. A pass becomes a candidate keyed `screenshot:<sha256>`
  with a quote evidence (the passing message, who, where), the file it points at (`files`, copied in only on keep,
  D24), a title from the quote's first sentence, the day from the file's mtime, and the reasons as chips (the chat cues
  merged into one). A fail is counted; its text is in OCR's memory cache at most, never on disk (R7). Counts, the last
  match and the last file seen are in `cache/sources/screenshots.json` (atomic.ts, 0600): names and numbers only.
- **No cached thumbnail (deviation from the brief).** There's no image library to make one (D49), and a copy in
  cache/ of every passing screenshot is a second copy of something the user hasn't kept. The card's picture is read
  from where it is (`GET /api/found/:id/picture`: pending screenshots candidates only, `checkIngestPath`'s rules, a
  sniffed picture type, the blob headers), and only if its sha256 is still the candidate's key: a hand-edited path or a
  file replaced under the same name shows nothing. Keep checks the same and keeps the quote alone if the picture has
  gone or changed (`missingFiles`).
- **Pause is the switch.** Off closes the watcher, drops what was waiting, and a read that was running finishes without
  adding anything (a generation counter, like D57's); the folder and the counts are kept for when it's back on.
- **A folder that goes wrong** (deleted, unreadable, permission taken back; macOS TCC's EPERM on Desktop, Documents,
  Downloads) closes the watcher and shows a red status with a plain message; every 30 s the folder is looked at again
  and watching resumes by itself. A folder made again at the same path is a new directory (dev, inode, birth time),
  so the old watch is replaced. Folder checks are asynchronous: the first read of a protected folder waits for the
  macOS prompt, and the server keeps answering meanwhile. No retry loop, nothing in the log per attempt. The folder may not be (or hold) the data
  home, nor be hidden: a candidate from there could never be kept (`checkIngestPath`).
- **One OCR queue for the app.** `ctx.ocr` is one `createOcr({ cache: evidenceOcrCache(...) })`, shared by the
  screenshots source and the board's pictures, so a burst of screenshots and a paste take turns (R8), and each source
  feeds it one file at a time. `ctx.evidenceText` (server/ocr/evidence-text.ts, started by startServer) reads every
  image sidecar without text (a store change, plus a sweep at start), writes it with `setOcr`, which makes it
  searchable; a picture OCR can't read is remembered as failed until restart. `GET /api/evidence/:sha/ocr` reports it,
  with the quote when the rules pass, which the composer offers as a sticky (quote evidence).
- **Considered:** polling the folder (chokidar already falls back to polling where it must); reading every picture by
  default (a Desktop is full of pictures that aren't screenshots); OCR'ing pasted images inline in the upload request
  (a slow upload, and a second queue).

### D59 — First run: no profile.yaml and Welcome not skipped; only the board sends you there

- **The rule:** `GET /api/welcome` says `firstRun` while there's no `profile.yaml` **and** `welcome.skipped` in
  config.yaml is false. "Skip for now" (or finishing Welcome without saving a profile) sets `welcome.skipped: true`
  through `ctx.config.update()` (D53). Without that, skipping would bring you straight back: SPEC R10 defines first run
  as "no profile.yaml", and skipping "About you" leaves none.
- **Only the board redirects** (`/` → `/welcome`, in the shell). A link to Settings, Folio or Found opens what it says,
  so a deep link or a bookmark is never hijacked. While the answer is pending, the board waits rather than flash.
- **A broken config.yaml** refuses the write (409). The page says so and goes to the board anyway, and a
  sessionStorage flag stops this tab bouncing back; another browser would see Welcome again until the file is fixed.
- **Re-running:** Settings → Data → Welcome steps opens any step. The form fills in from the profile.
- **The company** typed in "About you" becomes a `companies/<id>.yaml` (once, if none of that name exists): the
  profile has no company field, and adding one would duplicate companies/.
- **Considered:** localStorage for the skip (per browser; a service has several); a `cache/` marker (deletable cache
  that changes behaviour); redirecting from every page (breaks deep links).

### D60 — Finding your repos: one named folder, bounded; other sources only when ticked; nothing kept but what you add

- **The scan** (`server/discover.ts`) reads only the folder you name: breadth first, 4 levels down, 5 s (then partial
  results and `timedOut`), at most 500 repos. It stops at a folder with `.git` (dir or file), and skips dot-folders,
  `node_modules`, `Library`, `Applications`, `__pycache__`, `site-packages`, `Pods` and `vendor`. A symlinked folder is
  followed only when its real path is inside the named folder's real path, and each real path once, so loops end and
  nothing outside is listed; a folder is re-checked when it's read (swapped for a symlink since it was listed), and
  each read races the time left (a hung network mount). The named folder may itself be a repo: it's listed, and its
  insides are still looked through. `/` is refused (`too_broad`); `~` is allowed (the bounds hold), and on macOS the
  folders under home that raise a privacy prompt (Desktop, Documents, Downloads, Pictures, Movies, Music, Public) are
  skipped unless one is the folder named.
- **One deadline** covers the walk, the hints and reading each repo's history (the walk leaves a fifth of it for any
  ticked hints); the scan yields to the event loop as it
  goes. Repos it runs out of time for are still listed ("not looked at: out of time"), with `timedOut`.
- **Recency without git:** the last line of `.git/logs/HEAD` (time and kind: commit, checkout, pull, merge), the
  remote-tracking reflogs ("update by push"), and `FETCH_HEAD`'s mtime; `HEAD`'s mtime when there's no reflog. Only
  the tail of each file is read. A worktree or submodule (`.git` is a file) isn't followed to its gitdir, which may be
  outside the folder.
- **Hints** (RECOMMENDATIONS §7): VS Code-style editors' `storage.json` (not `state.vscdb`: that's SQLite, a new
  dependency for one key), JetBrains' `recentProjects.xml`, Claude Code's `projects/` (the `cwd` in each project's
  newest session's first 16 KB; at most 200 projects and 50 sessions each; nothing else). Each is read only when
  ticked; suggestions only check that the files exist. A hint naming a subfolder of a repo counts as that repo (the
  nearest `.git`, up to 4 levels up, never home). Shell history and `~/.gitconfig` aren't read in v0.1.
- **Ticked to start with:** repos found in the named folder with activity in the last 30 days (the prototype's
  behaviour; the folder was your choice). Hint results start unticked. Nothing is saved until **Add**, which checks
  each path again (`readLocalRepo`) and stores only those. "New project" always makes one; an existing project is
  picked by id.
- **Considered:** `fdir` (RECOMMENDATIONS §7; a dependency for a 60-line walk, and its symlink handling resolves
  outside the root); running `git log --author` for the top candidates (a subprocess per repo, and git may be absent).

### D61 — Example data: shipped, deterministic, marked, and removed by moving exactly what's marked

- **The dataset** is `fixtures/example/example.json` (the design prototype's Alex Marlowe: 2 companies, 5 projects,
  7 repos, 32 achievements) plus evidence files made by `scripts/gen-example.ts` (resvg with the bundled fonts, so the
  same bytes everywhere; a test checks the committed files match). It ships in the npm package and the Docker image.
- **Dates move by whole weeks** so the newest entry falls in the last seven days (`asOf` overrides "today", for the
  docs' captures). Everything else is the same every time.
- **Invented GitHub owners:** `altimetry-example/…` and `quillfeather-example/…`. The prototype's `altimetry` and
  `quillfeather` are real GitHub accounts, and PR slabs link to github.com. Links elsewhere use `.example` domains.
  Example repos are `tracked: false`, so GitHub's "where to look" (D57) never fills in a made-up repo.
- **Marked:** every company, project, repo and achievement it adds has `example: true` (the schema field PR3 added);
  achievements also have `externalKey: example:<key>`, so adding twice adds nothing. A repo whose remote you already
  have is reused, not duplicated (and isn't removed with the example data).
- **Removed:** every entry with `example: true`, through the services: achievements are moved to `backups/removed/`;
  projects, repos and companies with D45's detach, so your own entries tagged with one lose the tag rather than
  dangle. A file BragDoc can't change (broken by hand) is left and reported. Evidence files stay in `evidence/`
  (content-addressed; nothing is unlinked).
- **Considered:** importing it as a hosted export (PR12's importer: `legacyId`s and an "Imported" badge on every card);
  random sample data (not repeatable for captures and tests).

### D62 — v0.2 is built on its own integration branch, `v0.2`, with D-numbers reserved per PR

- v0.2 (opt-in AI, #434) is built as PRs into a long-lived `v0.2` branch, cut from `next` at the v0.1 release candidate
  (95338b9) with one commit that adds it to CI's branch lists. `next` stays exactly the v0.1 that was QA'd, so 0.1.0
  can be published from it at any time; Changesets' `baseBranch` stays `next`. A v0.1 fix lands on `next` and is
  merged forward into `v0.2` (a merge, never a rebase). When the release candidate (PR30) is green and approved,
  `v0.2` merges into `next` and 0.2.0 is released from there.
- **Decision numbers are reserved per PR** (#434's plan: PR21 D62–D66, PR22 D67–D68, PR23 D69–D71, PR24 D72–D74,
  PR25 D75–D77, PR26 D78–D79, PR27 D80–D81, PR28 D82, PR29 D83, PR30 D84). A PR uses only its own and never renumbers,
  so this file's order may not be numeric. A decision made on `next` while v0.2 is open takes D100 and up.
- **Considered:** building on `next` (0.1.0 would need a release branch cut from an older commit); waiting for 0.1.0
  first (ties the AI work to release chores); v0.1's renumber-at-rebase rule (it cost several renumberings and one
  missed cross-reference, #428).

### D63 — Ollama through its native `/api/chat`, behind a thin adapter

- Ollama is a language model of its own (`server/ai/ollama.ts`), not `@ai-sdk/openai-compatible` over its `/v1`. Every
  call sends `options.num_ctx` (the connection's `contextTokens`, 8192 unless set), `think: false`, and the JSON schema
  as `format` (grammar-constrained output): the Found spike's settings (`eval-judge.js`). Streaming reads its NDJSON.
- **Why not `/v1`:** it can't set the context size per request, and it can't turn thinking off. Measured on the dev
  box's Ollama 0.40.5 with `qwen3.5:4b` and one ~5,900-token synthetic prompt (a codename on its first line, a city on
  its last, a question about both):
  - native `/api/chat` with `num_ctx` 8192: all 5,875 prompt tokens read, the answer "BLUEHERON / Lisbon", 154 s;
  - `/v1/chat/completions` (JSON mode): the runner loaded the model at its default 4,096 context, read only 2,050 prompt
    tokens (the rest cut without a word), spent the other 2,046 thinking, and returned an empty answer, after 337 s.

  The judge would see only part of a screenshot's text, and a folio draft only part of its clippings.
- Thinking is turned off only where we know how to (Ollama's `think`). Other OpenAI-compatible runners and the cloud
  get their provider's default: an unknown `reasoning_effort` is an error at some providers.
- **Considered:** `/v1` with `OLLAMA_CONTEXT_LENGTH` set by the user (a setting outside BragDoc that it can't see or
  check); a community Ollama provider package (another dependency that can fetch, for a 200-line adapter).

### D64 — AI settings: their own API, and consent decided by host, per connection, per version

- AI settings live in `config.yaml`'s `ai:` section (SPEC R17), written only through `ctx.config.update()` (D53), but
  they're served by `GET /api/ai` rather than `SettingsResponse` (AGENTS.md's convention for settings). AI carries
  more than settings: each connection's class, consent and key state, each feature's readiness and why not, and the
  hosts it has added to the allow-list. One `AiStatus` answers every AI write, and an `ai` event refreshes it.
- **Local or cloud is decided by the connection's host, never its kind** (`shared/ai/hosts.ts`): loopback is *this
  computer*; RFC 1918, ULA, link-local, `.local` and `host.docker.internal` are *your network*; everything else is the
  *internet*, including a hosted "OpenAI-compatible" server and a public name that resolves to a private address (the
  host as written is all we can vouch for). Plain http only to the first two. `*.localhost` and `*.local` are trusted
  by name, without a DNS lookup (BragDoc never resolves a host itself); a resolver that answered them with public
  addresses would defeat that, and that's the one edge left.
- **Consent is stored as `{ at, version, host }`.** It counts while the statement's version is no newer and the
  connection still points at that host (a consent that names no host, written by hand, covers none): changing the
  address to another host withdraws it, and so does a statement that grows. **A key goes with it:** pointing a
  connection at another host (or a Jev at another OpenRouter connection) forgets its key, so a key entered for one
  provider is never sent to another.
- `fetchFor` allows only the connection's own origin (scheme, host and port), and a cross-host redirect into this
  computer or your network is refused for every egress request, now that AI can put a LAN host on the allow-list. Egress checks *the connection*, not just the host, on every request, so revoking one of two connections
  on the same host (an OpenRouter one and a Jev one) stops that one even mid-run.
- `connections` is a map keyed by id, so two tabs editing different connections both keep their edit.
- Keys go in `secrets.yaml` under `ai.<id>.apiKey`. The API returns `hasKey` and `keyHint` (the last four characters,
  or just `…` for a key under 16 characters). Removing a connection forgets its key.
- **Considered:** consent by kind (a custom URL would slip through as "local" or need its own rule); consent per host
  only (revoking Jev would need revoking OpenRouter too).

### D65 — The AI runtime: one lazy loader, one fetch, one queue, a fixed set of errors

- **The SDK is loaded once, on the first model call**, by `import()` in `server/ai/sdk.ts`, the only file that names it
  outside `providers.ts` and (from PR28) `decide.ts`; the guard confines each package to those files. On load it sets
  `AI_SDK_DEFAULT_PROVIDER` to a provider that throws (a model given as a string can't reach the hosted gateway) and
  `AI_SDK_LOG_WARNINGS` to false (one `Object.assign`, so the guard counts one use of `globalThis`). Telemetry is
  never registered. `test/ai-lazy.test.ts` and `smoke:pack` prove an AI-off session (source and packed) never
  resolves `ai`.
- **The only fetch a provider gets is `egress.fetchFor()`.** Providers are built per call with it; the SDK's own
  downloader (it fetches URLs in prompts, outside egress, with undici) is replaced by one that refuses, and prompts are
  text only. Keys and base URLs are always passed as strings, so the providers never read `*_API_KEY` or `*_BASE_URL`
  from the environment.
- **No hidden retries:** the SDK's `maxRetries` is 0. The one retry is ours: when an answer doesn't validate, the model
  is shown its answer and the problem once. A server that refuses a schema is asked again in JSON mode (the schema in
  the instructions, then our own Zod check), and that model is remembered as schemaless for the process. json_schema
  is sent non-strict: strict mode refuses optional fields at some providers, and our check is the strict one.
- **OpenAI goes through Chat Completions** (`.chat()`), the API every OpenAI-compatible server shares, so one fake
  covers it; the Responses API adds nothing a text-only, tool-less call needs.
- **The queue** is per connection: one call at a time on this computer or your network, two to the internet; `now`
  before `background`; timeouts count from the start (180 s local, 60 s cloud by default). A job re-checks its gates
  when it starts and once a second while it runs, so AI switched off (in the app or by hand) or consent revoked stops
  it. `PUT /api/ai { enabled: false }` also cancels everything at once.
- **Errors** are a fixed set (`server/ai/errors.ts`), each with a sentence: the brief's ten, plus `cancelled` (the
  caller went away: a closed tab, Cancel) and `busy` (200 calls already waiting on one connection). An error's words
  never quote the model's answer, and a key a provider echoes back (`Invalid API key: sk-…`) is scrubbed.
- **Considered:** loading the SDK at start when AI is on (a hand edit can turn AI on at any moment, and loading on
  first use costs about 0.3 s once); the SDK's own retries (a 429 would quietly become three requests).

### D66 — The fake model server: three APIs, scenarios by path, answers by rule

- `test/fixtures/fake-llm/` answers Ollama's, an OpenAI-compatible server's and Anthropic's APIs on 127.0.0.1, so tests,
  e2e, the docs' captures and box QA never call a real model (SPEC R28). Like the fake `gh`, its scenario comes from
  `FAKE_LLM_SCENARIO` or `$HOME/.fake-llm/scenario` (re-read on every request, so QA can switch it live), and also
  from a `/s/<scenario>/` prefix on the path, so one server can be many connections, each misbehaving its own way
  (`http://127.0.0.1:<port>/s/bad-json/v1`).
- Scenarios: the brief's nine, plus `bad-json-once` (wrong until it's shown its mistake: the repair retry's happy path),
  `quota` and `no-models`.
- Answers come from a rule table (`answers.ts`), first match wins, keyed on the schema's name or properties and the
  prompt; a structured request nothing matches gets a valid answer made from its schema. Feature PRs add their rows.
  In JSON mode it reads the schema from the instructions, as a model would.
- Cloud hosts can't be pointed at it (and no release build gets a way to redirect one), so cloud paths are tested with
  an injected egress `fetchImpl` (`test/ai-fixture.ts`).

### D69 — Settings → AI: off means nothing that could reach a runner; local models are listed on sight, cloud ones on a click

- With AI off the tab shows the master switch, what being off means, and the connections you've saved, and nothing
  that could contact a runner. Looking for one, listing models, testing and downloading all wait until AI is on, and the
  server refuses them too (`ai_off`, 409): "nothing is contacted" (SPEC principle 3) holds for the setup screens, not
  only the features. Adding, editing and allowing a connection send nothing, so the API still accepts them with AI off
  (PR21); the tab just doesn't offer them until it's on.
- A connection on this computer or your network is asked which models it has when its card appears (one logged GET).
  One on the internet is asked only when you click: opening a settings page must never send a request to a provider.
  Model lists are cached per connection *and address*, so pointing a connection elsewhere asks again.
- After a connection on the internet is added, the consent dialog opens at once; "Not now" leaves it saved and blocked.
  The dialog is made from `shared/ai/consent.ts`, so the page and the docs' provider pages can't disagree.
- Feature cards are a registry, `FEATURE_CARDS` in `src/settings/ai/index.ts`: each feature PR replaces its `Card: null`
  with its component, one line, like a route. Until then the tab lists each feature as off with what it will do.
- AI activity is PR22's log (`GET /api/ai/activity`) as a receipt like Network activity's: one line per run, never content.
- The header chip appears only while AI is on: "AI · this computer" / "AI · your network" for a local text model, the
  provider's name (or a typed-in server's host) for one on the internet, "AI · no model yet" before one is chosen.

### D70 — Looking for a runner: a fixed loopback probe through egress, and a look at PATH that runs nothing

- `egress.probe()` is the only way to reach an address that isn't a configured connection (`fetchFor` only reaches a
  connection's own origin). It allows only loopback names and `host.docker.internal`, only a GET with no body, no
  query string and no credentials, never follows a redirect, refuses while AI is off, and logs each probe as
  `feature: detect` with where it went. The probes are the presets' addresses (Ollama 11434, LM Studio 1234, llama.cpp
  8080) and, when `BRAGDOC_IN_DOCKER=1` (the image sets it), the host's Ollama through `host.docker.internal:11434`.
- Whether `ollama` is installed is `proc.onPath()`: a stat of PATH's absolute entries. Ollama is not in `ALLOWED_BINS`
  and never will be: BragDoc doesn't run it, start it or install it. When it's on PATH but nothing answered, the page
  says to start it; otherwise it says BragDoc doesn't install model runners and links to ollama.com.
- The last result is kept in `cache/ai/detect.json` (derived, deletable); which runner is already a connection is worked
  out when it's read, against the connections as they are then.
- A runner on another port (this project's own dev box runs one on 11500) isn't found, by design: probing a range of
  ports would be a port scan. Adding it by hand is the path, and the "none found" panel says so.

### D71 — Asking Ollama to download: recommended models only, a server-side confirm, a warning not a wall for disk

- `POST /api/ai/connections/:id/pull` takes only `{ confirm: true, model }` (400 `confirm_needed` otherwise) and only a
  model from the recommended table whose size is known (`gemma4:e4b`, `qwen3.5:4b`): the confirm has to state the size
  (SPEC principle 2), and the "better" tier's varies. Anything else is `ollama pull` in a terminal; the command is
  always shown, with Copy.
- The confirm restates the download, the free space in your home folder and the RAM it wants against what this machine
  has. Too little free space or RAM is a red warning and the button becomes "Download anyway", not a block: free space
  is the home folder's, and Ollama may keep its models on another disk (`OLLAMA_MODELS`), which BragDoc can't see.
- The answer is Ollama's progress as NDJSON lines, then one `{ done }` line. Cancel closes the request, which closes
  Ollama's stream (Ollama may keep the part it fetched, to resume; the dialog says so). Turning AI off or revoking the
  connection stops a download in progress too (`ctx.localAi.cancelAll`, and a once-a-second check for a hand edit of
  config.yaml), the same as ctx.ai's calls. The pull is logged twice: the
  loopback request (`this computer`) and "registry (via Ollama)" (`internet`, outcome and error), because the download
  leaves through Ollama, outside BragDoc's process (D9's honesty, as for gh).
- The network log also totals the request bytes sent to AI providers on the internet (`toAiInternet` on
  `GET /api/network-log`), for the receipt's "To AI providers on the internet" line beside "To BragDoc's makers: 0 B".
  Refused requests and local ones don't count; content is never logged.
### D67 — Instructions files: a store kind, written whole, capped, never overwritten unseen

- `ai/what-counts.md` (the judge's) and `ai/style.md` (tidy's and draft's) are user data, so they're a store file kind,
  `instructions` (D5), named by those two names only. Markdown, with front-matter only when the file starts with a
  `---` line; a model is given the markdown after it (`services.instructions.forPrompt(name)`). Front-matter has no
  keys of its own beyond `schemaVersion`; anything else in it is kept, unread.
- **Written whole** (`Store.writeText`, `PUT /api/ai/instructions/:name { text }`): an editor shows the file and saves
  the file, rather than patching YAML as the other kinds are. What's saved is checked exactly as a hand edit is read,
  and refused (400) if it would be a Problem.
- **A broken file is a Problem and keeps its last good copy** for prompts, as every store file does. It's replaced only
  by a PUT carrying its current ETag (`If-Match`, and not `*`): proof that whoever is writing has seen what's there.
  Without one, 409. "Last good copy" is this process's: a server started with the file already broken has none, so
  `forPrompt` is null and a feature should look at the file's `problems` and say so. That's D5's "never overwritten" kept for the case where the user is the one fixing it in the editor.
- **Capped at 20,000 characters** (`INSTRUCTIONS_MAX_CHARS`): the file goes with every call of its feature, and a
  local model's context is 8192 tokens by default. Longer is a Problem ("shorten it"), not a silent truncation.
- **Reset** (`POST …/reset`, `services.instructions.reset`) puts back a starter that the feature registers
  (`setStarter(name, () => text)`; PR24 makes the judge's from your profile). Your file, if it's different, is moved to
  `backups/removed/` first, broken or not: nothing is deleted. The starter is checked before anything moves, and if
  the write still fails your file is put back. `ensure(name, starter)` writes the starter only if
  there's no file, for a feature's first switch-on. The brief listed only GET and PUT; reset is here so the three
  features share one, instead of each adding its own.
- `ai/` is in backups' `EDITABLE` and the boot scan, the watcher already sees it (it isn't in `IGNORED_TOP`), and it is
  **not** in `GITIGNORED`: your instructions belong in your data home's repo. A misspelt `.md` in `ai/` is a stray
  Problem; `what-counts.txt` is told to be renamed; anything else there is left alone.
- **What a 0.1 build does with `ai/`:** nothing at all. Checked on the `next` store: it isn't scanned (no Problem, no
  stray notice), isn't in a snapshot, and isn't gitignored. So a data home used by 0.2 and then opened by 0.1 keeps
  the files untouched, just unread and unbacked-up.
- **The instructions routes aren't gated on AI.** They read and write your own files and make no model call: with AI
  off, nothing is sent and the SDK isn't loaded (the test checks both).

### D68 — The AI activity log, and live evals with recordings

- **`logs/ai-runs.jsonl`** (`server/ai/activity.ts`, `ctx.aiActivity`): one line per run, for Settings → AI's receipt.
  It hears every finished `ctx.ai` call (`Ai.onCall`). A feature that makes many calls opens a run
  (`ctx.aiActivity.start({ feature, trigger })`), passes its `id` as each call's `runId`, counts its own outcomes
  (`run.count('win')`) and ends it in a `finally`; that's one line. Any other call is a line of its own, with the
  `trigger` it was given (default `now`; `bragdoc dev ai` says `cli`).
  - Fields: id, feature, trigger (`now` · `arrival` · `schedule` · `eval` · `cli`), start, end, ms, connection, model,
    where, items, calls by outcome, the feature's counts, tokens in and out (summed, when reported), the run's outcome
    and an error **code**. Never a message: a message can quote what was sent. A count or an error that isn't a code
    is dropped (`failed`).
  - **A run that made no calls writes nothing.** It's the log of what asked a model; a judge run with nothing to judge
    didn't, and "Nothing has asked a model anything" stays true with AI on and idle.
  - Rotated at 1 MB to `ai-runs.1.jsonl`, like the network log (its own one-line rotate, with a guard-fs entry, rather
    than reshaping `egress.ts`, which PR21 owns). Nothing is created until a line is written. `{ type: 'ai-activity' }`
    follows each line this server writes; lines another process wrote (`dev ai`, an eval) appear on the next read.
  - A run left open for 6 hours is written as `abandoned` the next time the log is touched, so a feature's bug can't
    hold it forever. A run still open when the process stops isn't written.
  - Two processes on one data home (the server and an eval) can, rarely, both rotate at the same moment and lose a
    line or the older half. Accepted: it's a bounded record of recent activity, like the network log, not an audit
    trail.
- **Live evals** (`scripts/eval/lib.ts`; `npm run eval:<name>`): a feature supplies a spec (its synthetic cases, how to
  ask, how to score); the harness refuses without `BRAGDOC_LIVE_AI=1` and whenever `CI` is set, and runs every call
  through `ctx.ai` (gates, queue, egress).
  - `--connection <id>` uses a data home's connection, key and consent, with its **master switch read live** (turning
    AI off mid-eval stops it, and the run is logged as cancelled). The feature's own switch is taken as on: running an
    eval is the opt-in. `--connection kind@url` makes one up for the run, **this computer or your network only**: a
    cloud connection needs consent, given in Settings.
  - Run-level failures (unreachable, model missing, AI off, a refused key…) stop it with the reason, exit 1, and no
    recording; an item's own failure (an answer that's still invalid after the repair, a timeout) is its row.
  - **Recordings** (`--record`, every case: not with `--limit`, which would shrink what replay covers):
    `test/fixtures/ai-recordings/<eval>/<model>.json`, each answer keyed by a sha256 of exactly what was asked (system
    prompt and prompt), with a second hash of the call's shape (the schema, its name, the output options). A case
    that failed when recorded keeps its error code and is skipped on replay (`unanswered`). They hold the model's name, where it ran and the answers;
    `writeRecording` refuses one containing the connection's host or hostname, its key, or any address that isn't on
    the internet.
  - **Replay** (`test/ai-replay.ts`): the fake model server answers each recorded request with the recorded answer
    (its new `rules` option, also `--recording <file>` on the command line), so CI runs a feature's whole pipeline on a
    real model's answers. A request whose hash isn't in the recording (the prompt changed) gets the fake's own answer
    and its case is reported **stale** (as is one whose shape changed): re-record it on a machine with the model. That's deliberate: a replay that
    silently passed on yesterday's prompt would measure nothing.
  - `npm run eval:smoke` is the harness's own check (a date and a percentage from each of eight synthetic sentences,
    feature `test`), with a committed real-model recording that CI replays.

### D78 — Tidy this up: a suggestion beside your fields, and what you wrote is kept

- **The server gathers the text** (`POST /api/ai/tidy { text?, evidenceShas?, achievementId?, today? }`): pasted text,
  the OCR sidecar of named board pictures (waiting up to 8 s for a read in progress, then `409 not_read_yet`), and an
  achievement's title, summary, notes and the words of its quotes and read pictures. Each part goes to the model under
  a label saying what it is, inside one delimited block that the prompt calls material, not instructions. The browser
  can't put words in a picture's mouth, and the preview (`GET /api/ai/tidy/preview`) is built by the same function.
  The edit drawer tidies the achievement **as last saved** (it says so when you have unsaved edits).
- **10,000 characters** of material at most (`400 too_long`, with the count, in the error), so a tidy fits the default
  8,192-token local context with room for the answer.
- **A lenient answer schema, strict checks after** (`finishTidy`): small local models get lengths and nulls wrong often
  enough (PR22 saw the string `"null"`) that refusing over them costs a repair round-trip of 20 s on a CPU. So the
  schema asks for the shape, and BragDoc clips the title (90), summary (280) and body (1,500) at a word, turns
  `"null"`/`"none"` into null, clamps impact to 1–10, maps project **names** to your ids (an unknown one is dropped
  and said), and flags every number, amount, date or capitalised name in a text field that isn't in the material
  (`shared/ai/grounding.ts`; your name, role and project names count as yours).
- **Nothing is written by a tidy.** In the composer, whose text is "first line title, the rest notes": using a title
  the first time moves everything you wrote down into the notes under it (later titles replace the first line), and a
  suggested body goes under the title, above your words. So **your original text survives Use all**, and Pin it saves
  it as the achievement's notes. The composer gains a Summary and an Until field, shown only once a suggestion has set
  them, so with AI off it's v0.1's composer exactly. In the drawer, a suggested body goes above your notes the same
  way; title and summary replace theirs (they're on screen, and Cancel throws it all away). An accepted impact is
  yours (`impactSource: user`), as any impact you set.
- **Shown only while AI and Tidy are on** (SPEC R26): the board reads `GET /api/ai` (the same query key as Settings →
  AI). On but not ready (no model, no consent) → the button is disabled with the reason and a link to Settings → AI.
  A suggestion open when AI is switched off stays readable and goes inert, with the reason.
- `notAnAchievement` shows its reason and offers nothing to use.

### D79 — A date is kept only if the material states it or a relative date in it resolves to it

R23 allows a date "only when stated, or resolvable from a relative date against the day it was pasted". A model that
makes one up is the commonest invention (it reaches for today, or a plausible past date), and a wrong date files the
achievement in the wrong week, where nobody re-reads it. So `allowedDates(material, today)` lists the dates the text
supports, generously: ISO dates; "March 4" / "4 March" (this year, or last year if that's still to come); "October
2025" and "Q3 2026" as ranges; either reading of 10/11; "today", "yesterday", "N days/weeks ago" (with slack); a
weekday as any such day in the last two weeks; "last week" as the last fortnight; "last month" from the start of the
previous month. A `happenedAt` or `endedAt` outside all of them is **dropped and said** ("The date 2019-03-14 isn't in
your text, so it was left out"), and an end not after the start goes too. `today` is the browser's day (its time
zone), accepted within two days of the server's, else the server's (the profile's time zone). The model gets the same
rule in its prompt; this is the check, not the instruction.

### D80 — Draft with AI: the folio's state in, a streamed draft out, and a check on every line

PR27 (SPEC R24). The page sends the folio's **state** (`AiDraftFolio`: the window, filters and unticked ids), never its
text, and the server rebuilds the clippings with `folioData()` (shared with `GET /api/folio`, now in `server/folio.ts`)
and `matching()`, so a draft is made from exactly what the page shows (D55's cut-down clippings: no ids, paths or local
URLs), and a client can't slip anything else into a prompt.

- **Numbered, best first, and cited.** The clippings go in impact order as `[1]`, `[2]`…; the prompt asks for every
  bullet to end with the numbers it comes from. The `start` line maps each number to its achievement for the page's
  links; ids never reach the model.
- **The check** (`checkDraft`, shared/ai/draft.ts, pure) is line by line, and stricter than "somewhere in the folio":
  a line's numbers, dates and capitalised names must be in **the clippings that line cites**: their content, not the
  scaffolding the prompt adds (a clipping's own `[n]` and impact score ground nothing), or the context the prompt
  states about the person, the window (and its quarter or year) and the note. Project and company names are not
  context: each is in its own clippings, so "for Atlas [3]" has to be Atlas's clipping. A line citing nothing (the
  opening) is checked against all of it; prose under a heading must cite like a bullet. Bullets with no citation, citations to a number that wasn't sent,
  and a short list of filler phrases (only those the user's own clippings don't use) are flagged too. Headings are
  checked for numbers only (a theme is the model's word). A run like "Shipped Preflight" at the start of a line is
  grounded if the name after the verb is; "410ms" is "410 ms". `POST /api/ai/draft/check` runs the same check on an
  edited draft, against the draft's **own numbering** (the `cited` ids from its `start` line, rebuilt from the store
  and kept only if the folio still picks them), so a new achievement or a smaller model since can't renumber it. It
  makes no model call, so it's ungated. Sources are indexed once per check (`groundingIndex()`), and at most 2,000
  lines are read: it runs after every pause in typing, on a single-threaded server.
- **Only the sent clippings' projects and companies are named** in the prompt, never the rest of the catalog: a folio
  filtered to one company doesn't tell a cloud model about the last one. Clipping text can't forge the markers (NFKC,
  zero-width characters stripped) or a citation (`[7]` in a title becomes `(7)`).
- **Streamed as NDJSON, not text/plain** (a deviation from the plan's brief). A plain-text stream has no way to say
  "the runner died", "timed out" or "AI was switched off" after the first byte, and a draft can fail minutes in.
  `start` / `text` / `done` lines, like PR23's pull, carry the model and where, what was sent and left out, the error
  in words, and the check. Refusals before anything is sent stay plain JSON errors (409 gates, 400 `empty`).
- **One activity run per draft** (`sent` and `omitted` counts), so a cancelled or closed tab is a `cancelled` line.
  15 minutes local, 3 to the internet (SPEC R20); `maxOutputTokens` is the budget's answer room; temperature 0.2.
- **Considered:** sending the page's markdown (simpler, but the server would have to trust it, and a hand-crafted
  request could send anything to a cloud host under Draft's consent); checking only "anywhere in the folio" (misses a
  real number pinned on the wrong achievement); a check in the browser alone (the server owns the clippings as sent).

### D81 — Draft's budget, and the Draft panel

PR27 (SPEC R24, R26).

- **Budget** (`server/ai/draft/budget.ts`): a quarter of the connection's `contextTokens` (1,024–4,096) is kept for
  the answer and sent as its cap; the rest holds the instructions and the clippings, estimated at 3.5 characters a
  token for ASCII and one token for every other character (deliberately high: no tokenizer is bundled, and a prompt
  Ollama silently truncates is worse than one that leaves an item out). "How I write" may take a fifth of the input
  at most; past that it's cut ("cut short to fit"), and the panel says so. Clippings are added best first until the next doesn't fit; the rest (always the lowest-impact
  tail) are counted, told to the model ("don't say it covers everything"), and shown: "N lower-impact items weren't
  sent". One clipping is capped at 900 characters ("cut short") so a long note can't crowd the rest out. With the
  default 8,192 that's about 5k tokens of clippings; with a cloud connection's 30k, about 25k.
- **The panel is a third view beside Printout and Markdown** (a "Draft" chip), not a third column: the clippings stay
  on the left so `[n]` can scroll to and light up its clipping, and the plain export stays one click away and the
  default. On a phone it's the same chip, i.e. a tab. Draft with AI and the "What's this for?" note sit with Copy,
  Print and Export.
- **Shown only while AI and Draft are on** (SPEC R26, Ed's default 6). On but not ready: the button is disabled with
  the reason and a link to Settings → AI. **A draft already written is the user's text**: if AI is switched off
  mid-draft it stops with the reason, and what arrived stays editable, copyable and exportable until they leave the
  page (Draft again is gone). Losing it would punish the user for turning AI off.
- **Nothing is saved** (D55): the draft lives in the page. Leaving Folio (or reloading) with a draft not yet copied or
  exported asks first; changing the folio's own filters or view (URL changes on the same page) never asks, and the
  draft keeps meaning what it was made from ("the folio has changed since this draft"). Draft again over an edited
  draft asks too.

### D72 — What the judge reads: the screenshot re-read and marked, a PR's start, fenced as material

- **A screenshot** (`server/ai/judge/input.ts`, pure): the picture is read again through `ctx.ocr`, **only if the file
  is still the picture that passed** (its sha256 is the candidate's `screenshot:` key); its text is held in memory and
  never written (R7). It's split into messages at author lines by the rules' own splitter
  (`compileMessages`, exported from `shared/rules/screenshot.ts` without changing a rule: `eval:screenshots` gives
  identical numbers). Unlike the rules, `notMe` names are kept and **marked**: an author who is you is "(the user)", one
  of `notMe` is "(not the user)", and a `notMe` name inside a message gets the same mark.
  - **The message to judge** is the one holding the rules' quote (`isVerbatim`), else the one sharing most of its
    words. The rest is context, labelled as such, **nearest first** until the budget runs out (`truncated` says so).
    Text with no author lines is one block: then the rules' quote is "the part to judge" and the block is context.
  - **The budget** is the connection's `contextTokens`, less the system prompt and room for the answer, at 2.5
    characters a token (OCR text, names and emoji tokenise worse than prose), because Ollama cuts an over-long prompt
    silently from the front, fence and all: `inputBudget()`. Instructions so long they leave no room fail the item with
    `context_too_long` before anything is sent.
  - **`from`** is kept only if it's the judged message's own author (as shown, or the rules' `from`).
  - **A picture that's gone** (or replaced since) is judged from the stored quote alone. **Known gap (v0.1's):** the
    rules blank `notMe` names out before taking their quote, so a stored quote has lost "Alex P" and can't be marked;
    and a `notMe` author line isn't a header to the rules (it's blanked) but is to the judge's split. Both only matter
    when the picture is gone; changing the rules' quote is out of this PR (no rule changes).
- **A merged PR**: repo, title, merge date and the first 2,000 characters of its description, HTML comments removed.
  The question is different: notable or routine, plus an impact on BragDoc's 1–10 scale.
- **The prompts** (`server/ai/prompts/judge-screenshot.ts`, `judge-github.ts`) are pure functions of `{ profile,
  projects, instructions, input }`, written fresh (D2) after the spike's. The input goes between `<material>` markers
  and the prompt says it's material to judge, never instructions; the markers (and `<instructions>`) are taken out of
  the input so it can't close the fence. Projects are names (code maps them back). With no instructions (no file, or an
  empty one) a short built-in guidance stands in. The screenshot prompt also says the user took the screenshot, so
  "you" in someone else's message usually means them: the spike told the model a DM was "between the user and X", a
  fact OCR can't recover.
- **Rejected:** sending the whole OCR text unmarked (the spike's biggest prompt fix was "(the user)"); a separate
  splitter for the judge (two definitions of "a message" would drift); storing the OCR text to skip the re-read (R7).

### D73 — Judge runs: what's waiting, one at a time, what's checked before it's written

- **What's judged** (`eligible`): pending candidates of the ticked kinds (screenshots; merged PRs only with
  `judge.github`; never MCP), **without a verdict**, newest first, at most `maxPerRun`. "Judge again" names ids, and
  then an existing verdict doesn't matter; decided candidates and unticked kinds still do. A candidate decided, or its
  kind unticked, while a run is under way is skipped when its turn comes (`skipped`).
- **One run at a time** (409 `running`), started in the background (`POST /api/ai/judge/run` → 202 `{ runId,
  queued }`; the id is the activity log's). Judge now runs at `now` priority, everything else at `background`. Each item
  is one call; the run is one line in the AI activity log, counted `win` · `probably-not` · `failed` · `skipped`.
  - **Run-level failures stop it** (the same set as the eval harness: a gate, unreachable, a missing model, a refused
    key, quota, rate limit, busy, cancelled); turning AI off mid-run is `cancelled` with `ai_off`. **An item's own
    failure** (an answer still wrong after the repair, a timeout, a file that can't be written) is counted and the run
    goes on. A run in which every item failed reports the last item's code, as the activity log does.
  - `GET /api/ai/judge/status` keeps the run in progress and the last one **in memory only**; the activity log is the
    record. An `ai-judge` event refreshes open tabs.
- **Checks before writing** (`checkAnswer`): a `quote` is kept only if it's verbatim in **the message judged** (not the
  context) and the verdict is a keep; `from` only if it's the judged message's author; project names map to the active and paused
  projects' ids, others dropped; `why` is cut to 160 characters; `confidence` is clamped to 0–1 (a whole number up to
  100 is read as a percentage); a PR's `impact` is rounded and clamped to 1–10. `by` is "<model> on <this computer ·
  your network · host>"; `inputHash` is the sha256 of the kind, the input and the instructions, so the preview's hash
  equals the verdict's when nothing changed.
- **The starter `ai/what-counts.md`** is written from the profile when the judge is first on (AI and the judge both),
  however it was switched on (the `config` event), and again at a run's start if it's missing; never over a file that
  exists, even an empty one. `bragdoc_get_context` returns the same file as `winInstructions`.
- **Rejected:** "current verdict" meaning "same inputHash" for what's waiting (it means re-reading every picture to
  find out); a judge that writes anything but `verdict` (SPEC R21).

### D74 — The judge's eval, and reasoning off for OpenRouter

- **`npm run eval:judge`** (`scripts/eval/judge.ts`): the spike's 218 labelled messages, drawn as screenshots, read by
  the real OCR (or `--perfect-text`), then the rules, then the judge; plus 20 synthetic merged PRs on
  `altimetry-example/*`. It reports the pipeline's precision and recall, the judge's on what the rules passed, sarcasm
  kept, valid answers, verbatim quotes, p50/p90 per call and PR accuracy. `--judge-all` judges every message (the judge
  alone, as the spike's hosted table measured it).
  - **Recordings are made with `--perfect-text`** (and only then): the replay tests run in CI, which has no OCR to
    spare, and perfect text is the same on every machine.
  - **Deviation from the brief:** it asked for "≥ 100 of the prefiltered messages" per local model. The screenshot
    rules pass **70** of the 218 (the spike's Slack prefilter passed 108, from metadata a picture doesn't have: DMs,
    threads, mentions), so a local run judges 70 messages and 20 PRs. The rules' own recall (83% on perfect text) caps
    the pipeline's, so the comparison with the spike is the judge's numbers **on what the rules passed**.
- **OpenRouter calls ask for no reasoning** (`reasoning: { effort: 'none', exclude: true }`, SPEC R20's "thinking off
  where the runner allows it"), and a model that answers "reasoning is mandatory" is asked once more with `low`, which
  is remembered per connection and model (not the repair retry). Found by this eval: Claude Haiku through OpenRouter
  spent the judge's 400-token answer budget on reasoning and returned nothing for a long OCR text. Structured calls
  (`ctx.ai.object`) only; streaming (Draft) is unchanged.

### D75 — When the judge runs by itself: the second choice, the conditions, one run, the backoff

- **Turning the judge on gives Judge now and nothing else** (SPEC R22, Ed's default). The card then asks one question,
  "Also judge new candidates as they arrive?", with what it costs here (the last run's seconds per candidate, else
  about 20 s of CPU per screenshot for a small local model; for a cloud model, where the text goes). "Every N hours" is
  a second background trigger. **With a cloud model, background runs need one more tick** (`backgroundCloud`); without
  it the schedule holds (`cloud`) and only Judge now sends.
- **As they arrive** (`server/ai/judge/schedule.ts`): a found change for a candidate new to Found (not one an Undo
  brought back, not one our own verdict write touched, not a kind the judge doesn't take) starts a run 30 s after the
  last of a burst, at most 5 minutes after the first. A run takes what's waiting, newest first, up to `maxPerRun`; an
  arrival run that hit that cap goes on with the rest next, and one that couldn't reach its model is tried again when
  the backoff ends. **"Every N hours" takes at most `maxPerRun` per slot**: the rest wait for the next slot, so a big
  backlog never goes to a cloud model all at once. **Nothing is gathered while AI or the judge is off, and a slot that
  fell due meanwhile waits a whole period**, so switching them back on starts nothing (found on the box and in review).
- **Conditions**, for background runs only: "only between" two local times (from = to is all day; across midnight is
  fine) and "only on power" (on by default). The schedule looks every 30 s; arrivals and a due "every N hours" slot
  held back by a condition run when it lifts. **Judge now ignores every condition and the backoff.**
- **Stopping:** a background run asks before each item whether its conditions still hold (`RunOptions.until`, a hook
  on PR24's engine, which already stops when a gate closes): unplugged, the window closed, background judging or the
  judge or AI switched off. It stops after the item in progress, logged as `cancelled` with the reason's code
  (`battery`, `window`, `off`, `cloud`), and what's left is put back to run when the condition lifts. While a
  background run goes, the power is read every 5 s (the 30 s tick alone missed a short run: found on the box). The
  engine also re-checks the gates after a model answers and before writing, so AI switched off mid-call writes
  nothing more. This replaces a generation counter (D57, D58): the run asks the live conditions, which is the same
  guarantee without a counter to keep in step.
- **Backoff:** a run that ended with an error that would fail every item (`unreachable`, `timeout`, `model_missing`,
  `key_refused`, `quota`, `rate_limited`, …) holds background runs 15 minutes, doubling to 6 hours (D57's numbers);
  any run that judged something clears it. A failed Judge now counts too (the runner is down either way), but Judge now
  itself is never held by it. State, including the last run of any kind, is `cache/ai/judge.json`
  (derived, deletable; written only once the judge has run).
- **Power** (`server/platform/power.ts`): `pmset -g batt` on macOS (`pmset` joins proc's allow-list), the mains / USB
  supplies and the battery's status under `/sys/class/power_supply` on Linux (a `scope: Device` battery is a
  peripheral's), else `unknown`, which counts as plugged in; the card says it can't tell. It's read only while it
  decides something (AI and the judge on, "only on power" ticked, and a background trigger set or the card open), one
  read at a time: with AI off (the default) `pmset` never runs. `BRAGDOC_POWER_SUPPLY_DIR`
  (internal) points the Linux reading at a fixture, for the tests and box QA.
- **Rejected:** judging only the new arrivals in an arrival run (the newest are first anyway, and a second list of
  "arrived" ids would have to survive restarts); retrying failed items on every tick (a broken answer would spin).

### D76 — Found once there are verdicts: three groups, Dismiss these N, Judge again

- **Without a verdict Found is v0.1's list**, unchanged (AI never on is the default, and the AI-off control). Once any
  candidate has one: **Looks like a win** (surest first), **Not judged yet** (newest first), **Probably not**
  (collapsed, with its count). Verdicts are data: they keep their groups while AI is off, marked "judged earlier",
  with Judge again, the judge line and Judge now hidden (SPEC R26).
- **Dismiss these N** is one request (`POST /api/found/dismiss { ids }`) and its Undo another (`POST /api/found/undo
  { ids }`), at most 500 (D56's undo memory), each id as the one-at-a-time route does it: one decided meanwhile is
  skipped and said, never an error for the rest. **The judge never dismisses**: nothing empties Probably not but you.
- **The card:** the stamp in the header, the why ("Why the judge picked it" / "passed on it"), the model's quote only
  when it isn't the rules' (highlighted), "judged by …", Judge again and What's sent (`GET /api/ai/judge/preview`, the
  same prompt function). A verdict with no why (a probability-only judge, PR28) says so. Nothing on the card depends on
  which judge wrote the verdict. **Keep files it under the rules' and the judge's projects together** (the server's
  default for a keep without `projects`), shown on the card first; the judge's ones are marked.
- **A broken `ai/what-counts.md`** is a Problem, and the editor says what the judge uses meanwhile: the last good copy,
  or, if BragDoc started with it broken, the starter written from the profile (never nothing at all).

### D77 — "You agreed with the judge on N of M"

- Counted when you keep, merge or dismiss a candidate that has a verdict: keep or merge agrees with a win, dismiss with
  probably not. `FoundService.onDecided()` is the one hook (HTTP and any later caller alike); undecided, unjudged
  candidates never count. An Undo while BragDoc runs takes its count back (which way each decision went is held in
  memory for the newest 500, like D56's undo).
- **Counts only**, in `cache/ai/judge-stats.json`: never which candidate, never its text. Served as
  `AiJudgeStatus.agreement`.

### D82 — Jev as the judge's model, through the AI SDK's experimental_decide

- **Jev is a decision model, not a chat model.** TypeSafe's Jev answers typed questions about a state (yes or no as a
  probability, a choice) and never writes a reason. It's reached at OpenRouter's `POST /api/v1/systemone` with
  `typesafe/jev-1.14`; OpenRouter's `typesafe/jev-router` is a chat model, not Jev, and the server refuses it as Jev's
  model.
- **Through the SDK, with a small adapter.** `ai@7`'s `experimental_decide` is the interface, and it ships no Jev
  provider, so `server/ai/decide.ts` is a `DecisionModelV4` over egress's `fetchFor`: the SDK's `boolean` question is
  Jev's `noul` on the wire (the endpoint refuses `boolean`), `choice` is `choice`. HTTP failures are `APICallError`s
  (classified like any provider's), and answers that aren't one per question are the SDK's `InvalidResponseDataError`
  (`bad_output`). A choice's distribution isn't passed on (nothing reads it, and a sloppy one would fail the SDK's
  checks and lose the yes/no with it), and a project answer outside the options becomes "(none of these)": a project
  dropped, never one invented, and never a lost verdict. `decide.ts` is loaded by `sdk.ts` with the rest of the SDK, so nothing of it loads with AI off, and
  `AI_SDK_DEFAULT_PROVIDER` now refuses `decisionModel` too (a model named by string would go to a hosted gateway).
- **`ctx.ai.decide({ feature, purpose, state, questions, … })`** runs it in the connection's line, with the same gates,
  timeouts, egress and activity record as `object()`. There's no repair retry: a decision model's answer is valid or
  it isn't. `test()` asks a Jev connection one yes/no question about nothing of yours; `models()` returns Jev's one
  model without a request.
- **What the judge sends** (`server/ai/prompts/judge-jev.ts`, a pure function): a state of plain text fields (who the user
  is, `ai/what-counts.md` verbatim or the default guidance, and the same normalised input the chat judge gets), a
  `keep` yes/no with fixed criteria, and a `project` choice among your projects plus "(none of these)". **Deviation
  from the brief:** it asked for criteria "written from the instructions". Writing criteria from free text would take
  a model, so the instructions go into the state verbatim and the criteria are fixed definitions of a win. The
  preview renders exactly this.
- **The verdict:** `keep` at P(win) ≥ 0.5. **Deviation from the brief:** it said `confidence` = p. PR24's `confidence` is
  "how sure, either way", and the card shows "Probably not · N%", so a raw p of 0.07 would read "Probably not · 7%".
  Jev's `confidence` is therefore `max(p, 1 − p)`. A Jev verdict has no `why`, `quote` or `from`, and none is made up;
  `probabilityOnly(verdict)` (`shared/judge.ts`) tells the card so. No `impact` for PRs: Jev isn't asked for one.
- **Where Jev may be used:** as the judge's model only (`decisionOnly(kind)`, `shared/ai/connections.ts`). The server
  refuses it as the text slot or as Tidy's or Draft's model (400). A Jev that reaches a text feature some other way
  (a hand edit of config.yaml) is the `no_model` gate, with the reason, before anything is sent.
- **Consent:** Jev's own, separate from the OpenRouter connection's (revoking either one stops only that one). Its
  statement is version 2: it now lists everything the judge sends (a PR's details and your names too) and says that
  OpenRouter passes it on to TypeSafe AI and that Jev gives no reason. Deleting the OpenRouter connection a Jev goes
  through clears the Jev's consent, so a new OpenRouter connection under the same id asks again; so do pointing the Jev
  at another OpenRouter connection and replacing that connection's key (each may be another account). A Jev with
  nothing to go through has no host, and no consent can be given to it (409). Its own `baseUrl` or `contextTokens`
  are refused: it has none.
- **Tests and evals:** CI uses a response recorded from the real endpoint (`test/fixtures/jev/`), the fake model
  server's `/systemone` (`answers.ts` row `jev`, its scenarios), and the judge eval's Jev recording
  (`eval:judge -- --jev`), replayed through a Jev connection. A recorded decision is hashed with `noul` read as
  `boolean` (`scripts/eval/decision.ts`), so the SDK's request and Jev's wire request match.
- **The header chip** names the cloud when any switched-on feature's model is there (a judge on Jev with a local text
  slot reads "AI · OpenRouter"), not only the text slot.
- **Rejected:** a Jev chat path through `jev-router` (it's not Jev, and costs 30× more); `confidence` = p (it misreads
  on the card); a repair retry for decisions (a second paid request for a provider bug).

### D83 — The AI docs: tables made from the code, captures from the fake, and "Coming in 0.2.0"

PR29 (SPEC R27).

- **What can drift is generated.** `scripts/ai-reference.ts` writes three kinds of block into the docs pages, between
  `ai-reference:<block>:start/end` markers (an HTML comment in `.md`, `{/* … */}` in `.mdx`), whenever
  `npm run sync:reference` runs, and `test/docs.test.ts` fails while one is stale:
  - `models`: the recommended models and the RAM bands, from `shared/ai/models.ts` (what Settings → AI recommends from);
  - `measured`: what the judge scored, from **`scripts/eval/measured.ts`**, a new one-table module. The replay test
    (`test/ai-judge-replay.test.ts`) now asserts each recorded model's scores from that table rather than its own
    copy, so the number on the page is the number CI checks. Cloud rows that were one live run (Haiku, Gemini
    flash-lite, PR24) are in the table too, marked as not replayed;
  - `consent-<kind>`: each provider's consent statement, word for word, from `shared/ai/consent.ts`. The dialog's
    per-feature titles and its "never sent" line moved there from `ConsentDialog.tsx` (`CONSENT_FEATURE_WORDS`,
    `CONSENT_NEVER_SENT`; no visible change), so the page and the dialog share every word.
- **Captures of AI answers come from the fake model server, and say so.** The rig gains an AI world (`data: 'ai'` in
  `tools/docs-media/shots.ts`): the example world, plus the fake model server on **Ollama's preset address,
  127.0.0.1:11434** (the rig refuses to start if anything already listens there, so a real Ollama can never answer a
  docs shot), AI on, the judge, Tidy and Draft on, synthetic-dataset screenshots (three wins, one sarcastic), one
  Judge now, and an Anthropic connection with no key or consent for the consent dialog. Every caption with an AI
  answer says it was staged with the test model server. The leak scan now also allows the runner presets' ports
  (11434, 1234, 8080: everyone's defaults, not this machine's), and its port lookahead no longer needs a word
  boundary (`127.0.0.1:11434THIS COMPUTER` is how a stamp reads as text). The docs test allows the same ports on pages.
- **The example world's own seed was broken** since 95338b9: its screenshot was one of the example data's pictures,
  which the screenshots source now skips as "already on your board", so the seed timed out. It's now a picture drawn
  from the synthetic dataset (`m036`), and every docs and landing shot was re-taken in one run.
- **"Coming in 0.2.0".** The AI pages carry `:::note[Coming in 0.2.0]`, not a `Not …` note: the release script strips
  `:::note[Not …]` at 0.1.0, and `next` may publish 0.1.0 while `v0.2` is still unreleased. `docs.test.ts` fails while
  a `Coming in X` note once package.json is X or later, and **the release script takes them out by itself**
  (`releaseDocsPage` in `scripts/whats-new-release.mjs` now drops a `:::note[Coming in X]` from X on, as it drops
  `:::note[Not …]` from 0.1.0), since the bot's version PR can't be hand-edited. **This needs v0.2's release to be
  0.2.0**: every v0.2 changeset is `patch`, so PR30's `minor` changeset is what makes it so (otherwise a release from
  `v0.2` after 0.1.0 would be 0.1.1, and the notes would keep saying 0.2.0). What's new has one "Coming in 0.2.0: opt-in AI" section above a plain
  "0.1: the first local release" one (`whats-new.test.ts` allows one "Coming in"). If 0.1.0 is published from `next`
  first, the merge forward takes `next`'s "## 0.1.0" heading for the second section.
- **Not documented as fact:** anything not measured. The page says under 8 GB there's no recommendation, gives the
  spike's Apple-silicon speed as published figures, and says plainly that a runner's own traffic (Ollama's included)
  is outside BragDoc's log.
- **The consent statements were corrected, at their versions** (found by fact-checking the provider pages against the
  prompts): the judge also sends your role and your paused projects' names; Tidy, run from an achievement's edit
  drawer, sends its title, summary, notes, quotes and pictures' text; Draft sends evidence word for word (quotes with
  who and where, PR numbers and titles, link sites and titles), not "by name", and the folio's dates. The rule is to
  bump `version` when `sends` grows, but this isn't growth, it's the statement catching up with what the prompts
  already send, and **v0.2 is unreleased, so nobody has consented to the old words**: no bump. After 0.2.0, any
  change like this bumps.
- **A Jev's consent now also goes when its OpenRouter connection's key is forgotten, or set where there was none**
  (it went only on replacing a key), as Jev's statement already said: Forget, then another account's key, kept the
  old consent (`server/routes/ai.ts`, `forgetJevConsent`; `test/ai-jev.test.ts`).

### D84 — 0.2.0 comes after 0.1.0: the release order, and v0.2's merge into next

PR30, the v0.2 release candidate (SPEC open question 9).

- **v0.2 is released as 0.2.0, after 0.1.0, and only in that order.** `package.json` says 0.0.0 on both branches, and
  Changesets releases the largest pending bump once. `v0.2` carries `next`'s pending changesets (`v0-1-release.md`, a
  `minor`, and v0.1's patches) plus its own patches and `v0-2-release.md` (the `minor` D83 asked for). So:
  1. **0.1.0 is published from `next` first** (RELEASING.md, unchanged). Its version PR consumes v0.1's changesets and
     sets 0.1.0, and What's new gets `## 0.1.0`.
  2. **`next` is merged forward into `v0.2`** (a merge, as for any v0.1 fix): v0.1's changesets go, the version
     becomes 0.1.0. What's new conflicts, and the merge-forward PR (an ordinary PR) resolves it by hand: keep v0.2's
     "Coming in 0.2.0" section on top, and replace its "## 0.1: the first local release" heading and its "Not on npm
     yet" note with `next`'s "## 0.1.0: the first local release" (D83).
  3. **`v0.2` merges into `next`** with a merge commit, once Ed approves. Its changesets (v0.2's patches plus one
     `minor`) make the next version PR **0.2.0**, which turns "Coming in 0.2.0" into `## 0.2.0: opt-in AI` and takes
     the AI pages' `:::note[Coming in 0.2.0]` out (D83).

  PR30 simulated both orders in a scratch worktree (never pushed). In this order: 0.1.0's version step on `next`, the
  merge forward resolved as above, then the version step again gives 0.2.0, "## 0.2.0: opt-in AI" above "## 0.1.0",
  no "Coming in" note left on any page, and `docs`, `whats-new` and `release` tests 32/32. Merged into `next` *before* 0.1.0 is published, the same changesets would make
  **0.1.0, with AI in it**, under a "## 0.1.0: opt-in AI" heading above "0.1: the first local release". That's wrong,
  so don't merge `v0.2` into `next` until 0.1.0 is out. If Ed would rather skip a separate 0.1.0, the clean way is to
  delete `v0-1-release.md` in the merge, fold its text into `v0-2-release.md` and accept that the first release is
  0.1.0 with AI, with What's new rewritten by hand to match. Not recommended: Q9's answer was 0.1.0 first.
- **No reserved number went unused:** D62–D83 are all taken, and this is D84.
- **The macOS instructions-watch test starts its watcher until it's live** (`test/ai-instructions.test.ts`). On macOS
  CI under the full suite, FSEvents could drop a new stream's first events, and once a stream delivered nothing at
  all after chokidar's `ready`; PR30 reproduced the failure in 4 of 12 full runs of the old test. The test now writes
  by hand until the store sees an edit (restarting a watcher that stays silent for 5 s, at most 3 times), then asserts
  a later edit with no retry. A watcher that's already running isn't affected, so the app isn't changed.
