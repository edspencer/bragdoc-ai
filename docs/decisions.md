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
