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

### D45 — The importer: lenient per item, strict on the envelope; `legacyId` on companies and projects; 50 MB of JSON

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
  in `meta.legacy`. Dates are the UTC day of the hosted timestamps (it stored times; which zone the user meant isn't
  in the export). An achievement's company is written only when its project doesn't already imply it.
- Every field the export carries is either mapped, kept in `meta.legacy`, or reported as left behind with a reason, so
  the dry run accounts for all of it; a key that isn't in version 1.0 at all is reported as left behind too.
- Writes go through the services (D24); documents through `Store.writeImportFile` (create-only, 0444). `apply` takes a
  snapshot first, re-checks each `legacyId` as it writes, and yields to the event loop every 200 writes, so the server
  keeps answering during a large import (5,000 achievements: about 3 s). One import at a time per data home:
  `cache/import.lock` holds the importer's pid (taken over if that process has died); releasing it is the one new
  `unlink` in test/guard-fs.test.ts.
- `bragdoc import` sends the file to the running server (`POST /api/import/{plan,apply}`, via egress, loopback) when
  runtime.json names a live process, so the server stays the one writer; otherwise it lays out the data home as `serve`
  would and writes through the store itself, under the lock. A dry run on a data home that doesn't exist creates
  nothing.
- **The 50 MB body.** SPEC R3 caps JSON at 1 MB; an export of a few thousand achievements is several MB. Rather than
  make the export a typed upload (a JSON file is still JSON), `UploadRegistry.acceptLargeJson()` lets one route take
  `application/json` up to `LARGE_JSON_LIMIT` (50 MB); every other check (Host, Origin, Fetch Metadata, content type)
  applies as usual, and every other route keeps 1 MB. The CLI refuses a file over 50 MB before reading it.
- **Considered:** importing in one transaction that rolls back on any error (the store has no transactions, and a
  partial import is safe to finish by re-running it); matching companies and projects by name (would merge two
  different "Platform" projects); writing documents as achievements (they're reviews and reports, not things you did).
