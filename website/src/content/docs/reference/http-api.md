---
title: HTTP API
description: "The local HTTP API the BragDoc web app uses, the rules every request must follow, and the endpoints that exist so far."
---

:::note[Tracking `next`]
This page lists every endpoint on the [`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next) (the root
test suite checks it against the server's routes). The API is the web app's own, and may change between versions
before 1.0. For agents, prefer [MCP](/agents/mcp/) or [the files](/reference/data-folder/): those are the stable
interfaces. The request and response types are in `shared/api.ts` in the repository.
:::

BragDoc's web app talks to its own server over a JSON API under `/api/`, on the same address
(`http://localhost:2724`). It is a local API for the app, not a public web service: there are no API keys and no
versioning promises before 1.0.

## Rules for every request

These are enforced for every request (see [Localhost security](/guarantees/localhost-security/)):

- The `Host` header must be `localhost`, `127.0.0.1` or `[::1]`, or a host in `allowedHosts`
  ([config.yaml](/reference/config-yaml/)) or `BRAGDOC_ALLOWED_HOSTS`. Otherwise: **403**.
- If the request has an `Origin` header, it must be BragDoc's own (the same host and port as the request), on every
  request. `/api/*` and `/mcp` also refuse `Sec-Fetch-Site: cross-site` and `same-site`. Otherwise: **403**.
- Its body must be `application/json`, or, where an endpoint takes a file (only `POST /api/evidence`), the file's own
  type, never `text/plain`, `application/x-www-form-urlencoded` or `multipart/form-data`. Otherwise: **415**. JSON
  bodies are capped at 1 MB (50 MB for a hosted-app export sent to `/api/import/*`), uploads at 25 MB; more is a
  **413**.
- Request bodies for creating and changing things are checked strictly: an unknown key is a **400**.
- Errors are JSON: `{ "error": { "code": "…", "message": "…" } }`. An unknown `/api/…` path is a JSON **404**
  (`not_found`).
- Entries you can edit come with an `etag`. Send it back as `If-Match` on a change (`PATCH`, `DELETE`, remove), and a
  change made against a stale copy is a **409** (`conflict`) rather than a silent overwrite. A store error maps to
  **404** (not found), **400** (invalid; for achievements, with the keys at fault in `issues`) or **409** (conflict, or a file that's read-only
  because it's broken or from a newer BragDoc).


## The app and its server

| Method and path | What it does |
| --- | --- |
| `GET /api/health` | `{ "ok": true, "version": "…" }`. Used by the service's readiness check and Docker's health check. |
| `GET /api/events` | A Server-Sent Events stream: a `change` event (`{ "type": "achievement" }`, `"found"`, `"config"`, …) whenever something changes, on disk or through the app, so pages refresh themselves. |
| `GET /api/meta` | What this server is: its version and build (commit, time, and whether it's an official release build), its data folder, MCP address, allowed hosts, the current outbound allow-list, and any notices. |
| `GET /api/network-log` | Recent outbound requests, newest first, for [Network activity](/guarantees/network-activity/): `{ entries, total, toAiInternet }` (`toAiInternet`: the request bytes sent to AI providers on the internet, over the whole log). `?limit=` (default 100, at most 500) and `&offset=`. |
| `POST /api/network-log/guard-check` | **Test the guard**: asks the egress module to send a request to a host that isn't allowed. It's refused and logged, and nothing is sent. |
| `GET /api/problems` | The files in your data folder that BragDoc can't use as they are (broken YAML, a missing reference, a misnamed file), errors first, with what's wrong and where. |
| `GET /api/backups` | The snapshots in `backups/`, newest first, and how many are kept. |
| `GET /api/settings` | The settings Settings shows: where MCP writes go, and whether GitHub is on and how. |
| `PUT /api/settings/mcp` | `{ "writeTo": "board" }` or `"found"`: where achievements from your MCP agents go. **409** `config_invalid` if `config.yaml` is broken (fix it first). |
| `GET /api/mcp/token` | The MCP address and token, for Settings (never cached). |
| `POST /api/mcp/token/rotate` | Make a new MCP token. The old one stops working at once. |

## Achievements and evidence

| Method and path | What it does |
| --- | --- |
| `GET /api/achievements` | The board: whole weeks (from Monday), newest first, `{ items, total, nextBefore }`. Filters: `q` (search), `projectId`, `repoId`, `companyId`, `from`, `to`, `archived` (`exclude`, `include` or `only`), `source`, `minImpact` (1–10), `weeks` (default 8), and `before` (the previous page's `nextBefore`). |
| `GET /api/achievements/:id` | One achievement, with its `etag`, the details of its stored files, and whether it's broken or read-only. |
| `POST /api/achievements` | A new achievement: `title` is required; `summary`, `body`, `happenedAt`, `endedAt`, `impact`, `projects`, `repos`, `companyId`, `evidence`, `source`, `externalKey` and the rest are optional. **201** `{ achievement, created: true }`, or **200** with `created: false` and the existing one when its `externalKey` is already on the board. |
| `PATCH /api/achievements/:id` | Change fields (with `If-Match`). An `evidence` array replaces the whole list. |
| `POST /api/achievements/:id/archive` | Archive it (hidden from the board, kept). |
| `POST /api/achievements/:id/unarchive` | Bring it back. |
| `POST /api/achievements/:id/remove` | Move its file to `backups/removed/` (`{ removedTo }`; takes `If-Match`). |
| `POST /api/achievements/:id/restore` | Bring back the newest removed copy. |
| `POST /api/evidence` | Store a file: the raw bytes as the body, its type as `Content-Type`, its name (URI-encoded) in `X-Filename`. Returns `{ evidence, file, created }`: an evidence item to put on an achievement. **400** for an empty file, **413** over 25 MB, **415** `type_mismatch` when the bytes aren't the picture or PDF they claim to be, or `damaged`. |
| `GET /api/evidence/:sha` | A stored file. PNG, JPEG, GIF, WebP, AVIF and SVG pictures are shown; anything else downloads. |
| `GET /api/evidence/:sha/thumb` | A stored picture, for the board (**404** for anything that isn't a picture). |
| `GET /api/evidence/:sha/ocr` | The text read from a picture on the board, in the background after it's added: `pending`, `done` (with `text`, and the `quote` when it's praise for you), `failed`, or `none` (not a picture). |
| `POST /api/link-preview` | `{ "url": "…" }`: what a pasted link becomes. A GitHub pull request gives `owner/repo#123`, its key, the matching repo and its projects as suggestions, whether it's already on the board, and its title if GitHub is connected. Any other link gives its domain, and is never fetched. |

## Projects, companies and repos

| Method and path | What it does |
| --- | --- |
| `GET /api/projects` | Every project, each with its `etag` and how many achievements it has. |
| `POST /api/projects` | A new project: `name` is required; `description`, `color`, `start`, `end`, `status`, `companyId` and `repoIds` are optional. **201**. |
| `GET /api/projects/:id` | One project. |
| `PATCH /api/projects/:id` | Change it (with `If-Match`). |
| `DELETE /api/projects/:id` | Move its file to `backups/removed/` and take it off its achievements: `{ removedTo, detached }`. |
| `POST /api/projects/:id/restore` | Put it back; `{ "reattach": { "achievements": […] } }` re-tags what the delete untagged (the app's Undo). |
| `POST /api/projects/:id/repos` | `{ "link": [ids], "unlink": [ids] }`: link or unlink repos, all or nothing. |
| `GET /api/projects/:id/summary` | A project's pile: the project, its company and repos, its achievements (up to 200), counts of its evidence by kind, and its first and last dates. |
| `GET /api/companies` | Every company. |
| `POST /api/companies` | `{ "name": "…", "role": "…", "start": "…", "end": "…" }` (only `name` required). **201**. |
| `GET /api/companies/:id` | One company. |
| `PATCH /api/companies/:id` | Change it (with `If-Match`). |
| `DELETE /api/companies/:id` | Remove it; its projects and achievements lose their company (`{ removedTo, detached }`). |
| `POST /api/companies/:id/restore` | Put it back. |
| `GET /api/repos` | Every repo, each with its `etag`. |
| `POST /api/repos` | `{ "localPath": "~/Code/my-app" }` and/or `{ "remoteUrl": "…" }`, plus `name` and `tracked`. A folder must be a git checkout; its remote is read from its own git config. **201**, or **200** with `created: false` if it's already there. |
| `GET /api/repos/:id` | One repo. |
| `PATCH /api/repos/:id` | Change it (with `If-Match`). |
| `DELETE /api/repos/:id` | Remove it, and unlink it from its projects and achievements. |
| `POST /api/repos/:id/restore` | Put it back. |

## Found and sources

| Method and path | What it does |
| --- | --- |
| `GET /api/found` | The candidates waiting in [Found](/concepts/found-and-sources/), newest first, and how many each source has. `?source=github` (or `screenshots`, `mcp`) shows one source's. |
| `GET /api/found/count` | `{ "pending": 5 }`, for the badge and the board's strip. |
| `POST /api/found/:id/keep` | Make the candidate an achievement, with its evidence and suggested projects. The body may change the title, summary, body, date, impact, projects or repos. |
| `POST /api/found/:id/merge` | `{ "achievementId": "…" }`: attach the candidate's evidence to an achievement you already have. |
| `POST /api/found/:id/dismiss` | Set it aside for good: its file keeps only hashes of its keys, so the same pull request never comes back. |
| `POST /api/found/:id/undo` | Undo keep, merge or dismiss (a dismissal only until BragDoc restarts). A decision on one already decided is a **409**. |
| `POST /api/found/dismiss` | `{ "ids": […], "only"?: "probably-not" }`: dismiss many at once (Found's **Dismiss these N**), at most 500. Answers `{ done, skipped }`: one that was decided meanwhile, or is gone (or, with `only`, that the judge no longer calls probably not), is skipped with the reason, and the rest are still dismissed. |
| `POST /api/found/undo` | `{ "ids": […] }`: undo many decisions at once (the Undo after **Dismiss these N**), at most 500. Answers `{ done, skipped }`. |
| `GET /api/found/:id/picture` | A screenshot candidate's picture, read from where it is; **404** `gone` if it was moved, deleted or replaced. |
| `GET /api/sources` | Each source's state: for GitHub, whether it's on and how (the gh CLI or a token), where it looks, the last check and what it found, and any error (with `retryAt` when GitHub asked it to wait); for the screenshots folder, which folder, whether it's watching (or what's wrong), and what it has looked at and sent to Found; and where MCP writes go. |
| `GET /api/sources/github/gh` | `{ "installed": true }`: whether `gh` is on your `PATH` (it isn't run). |
| `POST /api/sources/github/connect` | `{ "auth": "gh" }` or `{ "auth": "token", "token": "…" }`, plus optional `lookBackDays` and `repos`: check the login, switch GitHub on and start the first check. A token GitHub refuses isn't kept. |
| `PUT /api/sources/github` | Change `lookBackDays`, `repos` or `hourly`. |
| `POST /api/sources/github/run` | Check GitHub now, and wait for it. **429** while GitHub has asked BragDoc to wait. |
| `POST /api/sources/github/disconnect` | Switch GitHub off; `{ "forgetToken": true }` also removes the token from `secrets.yaml`. |
| `GET /api/sources/screenshots/suggestions` | Folders worth watching on this computer (where it saves screenshots), and whether each exists. |
| `PUT /api/sources/screenshots` | Any of `{ "folder": "~/Screenshots", "enabled": true, "onlyScreenshots": true }`. The folder is checked first: a missing, unreadable or hidden one is refused with what's wrong (`missing`, `denied`, `not_allowed`, …) and nothing is saved. |
| `POST /api/sources/screenshots/look-back` | `{ "days": 7 }` (1 to 30): read the folder's pictures from those days, once. **409** `busy` while one is running. |

## Folio

| Method and path | What it does |
| --- | --- |
| `GET /api/folio` | `?from=YYYY-MM-DD&to=YYYY-MM-DD`: [Folio](/concepts/folio/)'s data for a date window: its achievements (archived ones left out), newest first, cut down to what a folio may show (no ids beyond each achievement's own, no file locations, no links to this computer), plus every project and company and your profile's name. Both dates are required; a bad or backwards window is a **400**. Read-only: the export is made in the browser. |

## Welcome, your profile and example data

| Method and path | What it does |
| --- | --- |
| `GET /api/welcome` | Whether the board should open [Welcome](/getting-started/quickstart/): `firstRun` is true while there's no `profile.yaml` and Welcome wasn't skipped. Also says whether the old CLI's files were moved into `legacy-cli/`. |
| `POST /api/welcome/skip` | `{}` (or `{ "skipped": false }` to undo): remember that you skipped Welcome, as `welcome.skipped` in `config.yaml`. |
| `GET /api/profile` | Your `profile.yaml` (`null` before you've written one) and its ETag. |
| `PUT /api/profile` | Change fields (`null` clears one; the first write needs a `name`). `If-Match` is optional. |
| `GET /api/discover/suggestions` | Which usual code folders exist (`~/Code`, `~/src`, `~/dev`, `~/projects`, `~/work`, …) and which editors' recent-project lists are there to read. A look at names only: nothing is opened. |
| `POST /api/discover/scan` | `{ "root": "~/Code" }` and/or `{ "hints": ["vscode", "jetbrains", "claude"] }`: the git repos in that folder, at most 4 levels down and for at most 5 seconds (`timedOut` says if it stopped), plus those the ticked hints name, each with what its `.git` says about when you last worked in it. Nothing is stored. A folder that can't be scanned is a **400** (`no_such_folder`, `not_a_folder`, `unreadable`, `too_broad`, `not_absolute`). |
| `POST /api/discover/add` | `{ "repos": [{ "path": "~/Code/my-app", "project": { "name": "My app" } }] }`: save these repos (each checked again: it must be a git checkout), optionally each with a new or existing (`{ "id": "…" }`) project. Answers per repo. |
| `GET /api/example` | Whether there's [example data](/getting-started/quickstart/#example-data), and how much of each kind. |
| `POST /api/example` | `{}` (or `{ "asOf": "YYYY-MM-DD" }` to place its dates): add the example data that isn't there yet. Adding it twice adds nothing. |
| `POST /api/example/remove` | `{}`: remove every entry marked `example: true`, into `backups/removed/`. Your own entries stay; a project of the example data is taken off any of yours that you tagged with it. |

## Importing

| Method and path | What it does |
| --- | --- |
| `POST /api/import/plan` | A dry run of importing a [hosted-app export](/moving-from-the-hosted-app/): the export file is the JSON body (up to 50 MB). Returns what would be added, what's already here, what can't be imported, the fields left behind and why, and any problems. Writes nothing. A file that isn't a version 1.0 export is a **400** (`invalid_export`, `unsupported_version`). |
| `POST /api/import/apply` | The same, for real: it imports the export and returns the same report of what it did, plus the snapshot it took first. Importing the same export again adds nothing. **409** `import_running` while another import is running. |

## AI (v0.2, off unless you turn it on)

:::note[Being built on the v0.2 branch]
These endpoints are the start of v0.2's opt-in AI. AI is off, and every AI feature is off, until you switch it on, and
nothing here switches anything on by itself. With AI off, every model call is refused before anything is sent, and the
AI code isn't even loaded. Settings → AI, the screen for all of this, comes later in v0.2.
:::

Keys are never returned: a connection shows `hasKey` and the last four characters of its key, `keyHint` (`…abcd`). A
connection on the internet (by its host: anything that isn't this computer or your network) sends **nothing, not even
a test**, until you accept its consent statement. Plain `http://` is accepted only for this computer and your network.
Every write answers with the new status and refreshes open tabs (an `ai` event).

| Method and path | What it does |
| --- | --- |
| `GET /api/ai` | The AI settings: the master switch, the text model, each connection (its kind, address, host, `class` (`this-computer`, `your-network` or `internet`), whether it needs consent and has it, `hasKey` and `keyHint`, and what's blocking it), each feature's settings and whether it's ready (or why not), and the hosts AI has added to the outbound allow-list (none while AI is off). |
| `PUT /api/ai` | `{ "enabled": true }` (the master switch; turning it on turns no feature on) and/or `{ "text": { "connection": "ollama", "model": "qwen3.5:4b" } }` (the model features use). Switching off stops any call in progress. A `jev` connection as `text` is **400** `invalid` (Jev is the judge's model only). |
| `POST /api/ai/connections` | Add a connection: `{ "kind": "ollama" }` (also `lmstudio`, `llamacpp`, `openai-compatible`, `anthropic`, `openai`, `openrouter`, `jev`), with optional `id` (default: the kind), `name`, `baseUrl` (default: the kind's usual address; required for `openai-compatible`), `contextTokens` (default 8192 on this computer or your network, 30,000 in the cloud) and, for `jev`, `via` (an OpenRouter connection). **400** `plain_http` for `http://` to the internet, `bad_url` for an address that isn't one. |
| `PUT /api/ai/connections/:id` | Change `name`, `baseUrl` or `contextTokens` (`null` clears one), or a Jev's `via` (another OpenRouter connection; it can't be cleared). Pointing it at another host, or a Jev at another OpenRouter connection, withdraws its consent. A Jev has no `baseUrl` or `contextTokens` of its own (**400**). |
| `DELETE /api/ai/connections/:id` | Remove it, and forget its key. A model choice that used it is cleared. |
| `PUT /api/ai/connections/:id/key` | `{ "key": "…" }`: save its key in `secrets.yaml` (readable only by you). **409** `secrets_invalid` if `secrets.yaml` is broken (it's never overwritten). |
| `DELETE /api/ai/connections/:id/key` | Forget its key (removed from `secrets.yaml`). |
| `POST /api/ai/connections/:id/consent` | `{ "version": 1 }`: accept the consent statement you were shown, for a connection on the internet. Its host joins the allow-list while AI is on. **409** `stale_consent` if the statement has changed since (Jev's is version 2), `no_model` for a Jev with no OpenRouter connection to go through. Replacing an OpenRouter connection's key, or removing it, withdraws the consent of a Jev that goes through it. |
| `DELETE /api/ai/connections/:id/consent` | Revoke it: nothing more is sent, from the next request. Another connection on the same host keeps its own consent. |
| `POST /api/ai/connections/:id/test` | `{ "model": "…" }` (optional: default the model chosen for it): one tiny request that asks for a structured answer (for a Jev, one yes-or-no question, and only Jev's models). `{ "ok": true, "ms", "structured", "where" }`, or `{ "ok": false, "error": { "code", "message" } }` in plain words (`unreachable`, `model_missing`, `key_refused`, `quota`, `rate_limited`, `timeout`, `no_structured_output`, …). **409** (`ai_off`, `not_consented`, `no_key`) when it would have to send something it may not: nothing is sent. |
| `GET /api/ai/connections/:id/models` | The models the connection offers (Ollama's installed models, or an OpenAI-style list). Logged like any call; the same **409**s. |
| `GET /api/ai/hardware` | What Settings → AI recommends from: `ramBytes`, `cpu`, `cores`, `arch`, `appleSilicon`, `freeDiskBytes` (free space in your home folder), `inDocker` (the readings are the container's), `recommended` (a model, or `null` under 8 GB), `speedNote` and `modelsAsOf`. Read from this computer; nothing is sent. |
| `POST /api/ai/detect` | **Look for a model runner on this computer**: a GET to Ollama, LM Studio and llama.cpp at their usual addresses (and, in Docker, Ollama on the host through `host.docker.internal`), each logged as `detect`, plus a look for an `ollama` program on the PATH (nothing runs). `{ at, runners: [{ kind, baseUrl, where, version, models, connectionId }], ollamaOnPath, inDocker }`. **409** `ai_off` while AI is off. |
| `GET /api/ai/detect` | The last look's result (kept in `cache/ai/detect.json`), or `null`. |
| `POST /api/ai/connections/:id/pull` | `{ "confirm": true, "model": "qwen3.5:4b" }`: ask that Ollama connection to download a recommended model. Answers `application/x-ndjson`: Ollama's progress lines (`status`, `completed`, `total`), then `{ "done": true, "ok": true }` or `{ "done": true, "ok": false, "error" }`. Closing the request cancels it. **400** `confirm_needed` without the confirm, `not_recommended` for any other model, `not_ollama`; **409** `ai_off`. Logged twice: the request to Ollama, and the download itself as "registry (via Ollama)". |
| `PUT /api/ai/features/:feature` | `judge`, `tidy` or `draft`: change its settings (`enabled`, `model`, and the judge's `screenshots`, `github`, `when`, `backgroundCloud`, `maxPerRun`), as a merge patch. Unknown settings are a **400**. A `jev` connection is **400** `invalid` as Tidy's or Draft's `model`, and as the judge's with any model but Jev's (`typesafe/jev-1.14`). |

### Draft with AI (Folio)

A review draft from what a folio picks (Settings → AI → Draft with AI). The page sends the folio's **state**, never its
text: the server rebuilds the same achievements `GET /api/folio` gives the page, already cut down to what a folio may
show (no ids, no file locations, no links to your computer). Nothing is written to your data folder.

| Method and path | What it does |
| --- | --- |
| `POST /api/ai/draft` | `{ "folio": { "from", "to", "projects", "company", "minImpact", "exclude", "group" }, "purpose": "…" }` (the folio's filters as Folio's URL holds them; `purpose` is the optional "What's this for?" note, up to 300 characters). Answers `application/x-ndjson`: a `start` line (`model`, `connection`, `where`, `sent`, `omitted`, `cited`: which `[n]` is which achievement, and `ahead`: calls waiting before it), `text` lines as the draft arrives, then `{ "type": "done", "ok": true, "ms", "tokensIn", "tokensOut", "check" }`, or `{ "type": "done", "ok": false, "error": { "code", "message" } }` if the model failed or AI was switched off mid-draft. If the folio is too big for the model's context, its lowest-impact achievements are left out and counted (`omitted`, and the `X-BragDoc-Omitted` header). Closing the request cancels it. Time limits: 15 minutes on your computer or network, 3 on the internet. **400** `empty` when nothing is picked, `context_too_long` when not even one achievement fits, `invalid` for a bad body; **409** `ai_off`, `no_model`, `not_consented` or `no_key` before anything is sent. |
| `POST /api/ai/draft/check` | `{ "draft": "…", "folio": { … }, "purpose": "…" }`: check a draft (an edited one, say) against the achievements it was made from: `{ "ungrounded", "uncited", "filler", "badCitations" }`, each a list of `{ "line", "text" }`. `ungrounded`: a number, date or name in none of the achievements that line cites; `uncited`: a bullet that cites none; `filler`: a stock phrase your own achievements don't use; `badCitations`: a `[n]` with no achievement `n`. Makes no model call, so it works with AI off. |
| `GET /api/ai/draft/preview` | Exactly what a draft sends: `{ "system", "prompt", "sent", "omitted", "budget" }`. With no parameters, the template (the achievements' place marked); with a folio's URL parameters (`from`, `to`, `p`, `c`, `min`, `out`, `group`, and `purpose`), that folio's prompt. No model call. |

Every model call, local ones included, is in [Network activity](/guarantees/network-activity/) with where it went
(`this computer`, `your network` or `internet`), what it was for, the model and how many bytes were sent: never what
was sent.

### Instructions and AI activity

The instructions files are markdown you write for the models, in the data folder's [`ai/` folder](/reference/data-folder/):
`what-counts` (`ai/what-counts.md`, "What counts as a win for me", which the judge reads) and `style` (`ai/style.md`,
"How I write", for tidying and drafting). They're your files, so these work whether AI is on or off, and reading or
saving one sends nothing anywhere. A change to one, here or by hand, refreshes open tabs (an `instructions` event).

| Method and path | What it does |
| --- | --- |
| `GET /api/ai/instructions/:name` | The file: `text` (all of it, front-matter included), `body` (what a model is given: the markdown after any front-matter), `exists`, `etag` (also the `ETag` header), its `problems`, and `maxChars` (20,000). A broken file keeps its last good `body`. **404** for any other name. |
| `PUT /api/ai/instructions/:name` | `{ "text": "…" }`: the whole new file, with `If-Match` optional. **400** if it would be a Problem (too long, front-matter that isn't closed or isn't YAML), and nothing is written. **409** if it changed since your `If-Match` (or doesn't exist when you sent one), if the file on disk is broken and you didn't send `If-Match` with its current ETag (`*` doesn't count: it's never overwritten unseen), or if it's from a newer BragDoc (read-only). |
| `POST /api/ai/instructions/:name/reset` | Put the feature's starter text back. Your file, if it's different, is moved into `backups/removed/` first (`removedTo` says where); the starter is checked before anything moves. **404** until the feature that reads the file has a starter. |
| `GET /api/ai/activity` | The AI activity log, newest first: `limit` (1–500, default 50) and `offset`. One line per run (a judge pass, an eval) or per single call (a tidy, a draft, a connection test): when, the feature, what started it (`trigger`), the model and where it went, how many items and calls, the feature's own counts, tokens (when the provider reports them), and an error code. **Never any content**: no prompt, answer or message. A new line refreshes open tabs (an `ai-activity` event). |
| `POST /api/ai/judge/run` | Judge now: `{}` judges what's waiting in Found (pending screenshots, and merged PRs if you ticked them; never an agent's), newest first, up to `maxPerRun`; `{ "ids": […] }` judges those again. **202** `{ runId, queued }`: it runs in the background, one candidate at a time, and only ever fills in each candidate's `verdict`. **409** with the reason (`ai_off`, `no_model`, `not_consented`, `no_key`) when the judge can't run, and nothing is sent; **409** `running` while a run is in progress. |
| `GET /api/ai/judge/status` | Whether the judge can run now (`ready`, or the `reason`), which kinds it judges, how many candidates are `waiting`, the run in progress (`done` of `total`, and its counts: `win`, `probably-not`, `failed`, `skipped`) and the last one since BragDoc started. `schedule` says when it runs by itself: whether either background trigger is on, the power reading (`ac`, `battery`, `unknown`), what holds a background run back now (`hold.code`: `off`, `not-ready`, `cloud`, `window`, `battery`, `backoff`, `running`, `nothing`, with `until` when it's a time), the next "every N hours" run, a backoff after a failed run, and the last run of any kind (kept across restarts). `agreement` is `{ agreed, of }`: how often your keep or dismiss matched a verdict. An `ai-judge` event refreshes open tabs. |
| `GET /api/ai/judge/preview` | `?candidate=<id>`: exactly what the judge would send for one pending candidate: the `system` and `prompt` text, the model, what the input was made from (`ocr`: the picture read again; `quote`: the picture is gone; `github`), and its `inputHash`. Sends nothing. **404** for an unknown id, **409** for a decided candidate or an agent's. |

### Tidy this up

The board's "Tidy this up": a suggestion for something you pasted, a picture's text, or an achievement as you wrote it.
It **saves nothing**: the board shows the suggestion beside your fields, and only Save changes anything.

| Method and path | What it does |
| --- | --- |
| `POST /api/ai/tidy` | `{ "text", "evidenceShas", "achievementId", "today" }`, at least one of the first three. BragDoc gathers the text itself: what you typed, the text read from those board pictures (it waits a few seconds for one still being read, then **409** `not_read_yet`), and the achievement's title, summary, notes and the words of its quotes and read pictures. `today` (YYYY-MM-DD, your browser's day) is what "yesterday" is worked out from. Answers `suggestion` (`title`, `summary`, `body`, `happenedAt`, `endedAt`, `impact`, `impactWhy`, `suggestedProjects` as your project ids, `notAnAchievement` with its reason, `unclear`), `ungrounded` (per field, the numbers, amounts, dates and names that aren't in your text), `dropped` (what BragDoc took out, in words: a date that isn't in your text, a project you don't have), and the `model` and `where` it ran. **400** `empty` when there's nothing to tidy, `too_long` over 10,000 characters (the error says how many). **409** when AI or Tidy is off, no model is chosen, or a cloud connection lacks consent or a key: nothing is sent. A model's failure is its code (`unreachable`, `timeout`, `bad_output`, …); closing the request cancels the call. |
| `GET /api/ai/tidy/preview` | Exactly what a tidy sends (`system` and `prompt`), with a placeholder where your text goes: your name and role, your project names, your "How I write" notes and the impact scale. Never an id or a path. Sends nothing, AI on or off; `readiness` says whether a tidy could run now, and with which model. |

## For agents

| Method and path | What it does |
| --- | --- |
| `POST /mcp` | The [MCP server](/agents/mcp/) (stateless Streamable HTTP). Every request needs `Authorization: Bearer <token>`: without it, or with an old one, a **401** (checked first). With it, `GET /mcp` and `DELETE /mcp` are **405** (it's stateless). `GET /.well-known/oauth-*` is a **404**: it uses a token, not OAuth. |
| `GET /agent-guide.md` | The [agent guide](/agents/agent-guide/), with this BragDoc's live facts. |
| `GET /llms.txt` | The [llms.txt](https://llmstxt.org) for agents: where the guide and the MCP server are. |
| `GET /llms-full.txt` | The same, with the whole guide in it. |
