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

### D45 — Every store change reaches open tabs as a ServerEvent named after its entity

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

### D46 — `/api/evidence/:sha/thumb` serves the picture itself until there is an image library

- The board asks for `/thumb` on cards and the full file in the lightbox, so the URL contract is in place. In v0.1
  `/thumb` returns the stored picture unchanged (same blob headers, cached immutably: the bytes are content-addressed),
  and 404s for anything that isn't a picture. Cards load pictures lazily and decode them off the main thread.
- Making real thumbnails means a native image library (sharp/libvips, ~30 MB installed, per-platform binaries in the
  npm and Docker builds) or a slow pure-JS one; for pictures served over loopback that's a lot of weight for little
  gain. When that changes, `/thumb` starts writing resized copies to `cache/` (derived, deletable) and nothing else
  moves.
- **Considered:** `sharp` as an optional dependency with a fallback (two code paths, and an install that differs by
  platform); thumbnails made in the browser at upload (not derivable again, so not cache).

### D47 — Board uploads: stored as soon as they're added; the claimed type is checked against the bytes

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
