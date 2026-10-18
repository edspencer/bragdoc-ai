---
title: HTTP API
description: "The local HTTP API the BragDoc web app uses, the rules every request must follow, and the endpoints that exist so far."
---

:::note[Tracking `next`]
The API is being built with the app, and changes between commits until v0.1 is released. This page lists what is on
the [`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next) or in review, and will be filled in as the
features land. For agents, prefer [MCP](/agents/mcp/) or [the files](/reference/data-folder/): those are the stable
interfaces.
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
- Its body must be `application/json`, or a typed upload whose type isn't `text/plain`,
  `application/x-www-form-urlencoded` or `multipart/form-data`. Otherwise: **415**. JSON bodies are capped at 1 MB
  (50 MB for a hosted-app export sent to `/api/import/*`), uploads at 25 MB.
- Errors are JSON: `{ "error": { "code": "…", "message": "…" } }`.

## Endpoints

| Method and path | What it returns |
| --- | --- |
| `GET /api/health` | `{ "ok": true, "version": "…" }`. Used by the service's readiness check and Docker's health check. |
| `GET /api/events` | A Server-Sent Events stream of changes, for live updates. |
| `GET /api/meta` | What this server is and how it's set up: version, build information (release builds only), data folder, MCP address, allowed hosts, the current outbound allow-list, and any notices. |
| `GET /api/network-log` | Recent outbound requests, for [Network activity](/guarantees/network-activity/). |
| `POST /mcp` | The [MCP server](/agents/mcp/). Needs `Authorization: Bearer <token>`; GET and DELETE are 405 (it's stateless). |
| `GET /agent-guide.md`, `/llms.txt`, `/llms-full.txt` | The [agent guide](/agents/agent-guide/), with this BragDoc's live facts. |
| `POST /api/import/plan` | A dry run of importing a [hosted-app export](/moving-from-the-hosted-app/): the export file is the JSON body (up to 50 MB). Returns what would be added, what's already here, what can't be imported, the fields left behind and why, and any problems. Writes nothing. A file that isn't a version 1.0 export is a **400** (`invalid_export`, `unsupported_version`). |
| `POST /api/import/apply` | The same, for real: it imports the export and returns the same report of what it did, plus the snapshot it took first. Importing the same export again adds nothing. **409** `import_running` while another import is running. |
| `GET /api/folio?from=YYYY-MM-DD&to=YYYY-MM-DD` | [Folio](/concepts/folio/)'s data for a date window: its achievements (archived ones left out), newest first, cut down to what a folio may show (no ids beyond each achievement's own, no file locations, no links to this computer), plus every project and company and your profile's name. Both dates are required; a bad or backwards window is a **400**. Read-only: the export is made in the browser. |
| `GET /api/found` | The candidates waiting in [Found](/concepts/found-and-sources/), newest first, and how many each source has. `?source=github` (or `screenshots`, `mcp`) shows one source's. |
| `POST /api/found/:id/keep` | Make the candidate an achievement, with its evidence and suggested projects. The body may change the title, summary, body, date, impact, projects or repos. |
| `POST /api/found/:id/merge` | `{ "achievementId": "…" }`: attach the candidate's evidence to an achievement you already have. |
| `POST /api/found/:id/dismiss` | Set it aside for good: its file keeps only a hash of its key, so the same pull request never comes back. |
| `POST /api/found/:id/undo` | Undo keep, merge or dismiss (a dismissal only until BragDoc restarts). |
| `GET /api/sources` | Each source's state: for GitHub, whether it's on and how (the gh CLI or a token), where it looks, the last check and what it found, and any error; for the screenshots folder, which folder, whether it's watching (or what's wrong), and what it has looked at and sent to Found. |
| `POST /api/sources/github/connect` | `{ "auth": "gh" }` or `{ "auth": "token", "token": "…" }`, plus optional `lookBackDays` and `repos`: check the login, switch GitHub on and start the first check. A token GitHub refuses isn't kept. |
| `PUT /api/sources/github` | Change `lookBackDays`, `repos` or `hourly`. |
| `POST /api/sources/github/run` | Check GitHub now, and wait for it. **429** while GitHub has asked BragDoc to wait. |
| `POST /api/sources/github/disconnect` | Switch GitHub off; `{ "forgetToken": true }` also removes the token from `secrets.yaml`. |
| `GET /api/sources/screenshots/suggestions` | Folders worth watching on this computer (where it saves screenshots), and whether each exists. |
| `PUT /api/sources/screenshots` | Any of `{ "folder": "~/Screenshots", "enabled": true, "onlyScreenshots": true }`. The folder is checked first: a missing, unreadable or hidden one is refused with what's wrong (`missing`, `denied`, `not_allowed`, …) and nothing is saved. |
| `POST /api/sources/screenshots/look-back` | `{ "days": 7 }` (1 to 30): read the folder's pictures from those days, once. **409** `busy` while one is running. |
| `GET /api/found/:id/picture` | A screenshot candidate's picture, read from where it is; **404** `gone` if it was moved, deleted or replaced. |
| `GET /api/evidence/:sha/ocr` | The text read from a picture on the board, in the background after it's added: `pending`, `done` (with `text`, and the `quote` when it's praise for you), `failed`, or `none` (not a picture). |
| `GET /api/welcome` | Whether the board should open [Welcome](/getting-started/quickstart/): `firstRun` is true while there's no `profile.yaml` and Welcome wasn't skipped. Also says whether the old CLI's files were moved into `legacy-cli/`. |
| `POST /api/welcome/skip` | `{}` (or `{ "skipped": false }` to undo): remember that you skipped Welcome, as `welcome.skipped` in `config.yaml`. |
| `GET /api/profile`, `PUT /api/profile` | Your `profile.yaml` (`null` before you've written one) and its ETag; `PUT` changes fields (`null` clears one; the first write needs a `name`). `If-Match` is optional. |
| `GET /api/discover/suggestions` | Which usual code folders exist (`~/Code`, `~/src`, `~/dev`, `~/projects`, `~/work`, …) and which editors' recent-project lists are there to read. A look at names only: nothing is opened. |
| `POST /api/discover/scan` | `{ "root": "~/Code" }` and/or `{ "hints": ["vscode", "jetbrains", "claude"] }`: the git repos in that folder, at most 4 levels down and for at most 5 seconds (`timedOut` says if it stopped), plus those the ticked hints name, each with what its `.git` says about when you last worked in it. Nothing is stored. A folder that can't be scanned is a **400** (`no_such_folder`, `not_a_folder`, `unreadable`, `too_broad`, `not_absolute`). |
| `POST /api/discover/add` | `{ "repos": [{ "path": "~/Code/my-app", "project": { "name": "My app" } }] }`: save these repos (each checked again: it must be a git checkout), optionally each with a new or existing (`{ "id": "…" }`) project. Answers per repo. |
| `GET /api/example` | Whether there's [example data](/getting-started/quickstart/#example-data), and how much of each kind. |
| `POST /api/example` | `{}` (or `{ "asOf": "YYYY-MM-DD" }` to place its dates): add the example data that isn't there yet. Adding it twice adds nothing. |
| `POST /api/example/remove` | `{}`: remove every entry marked `example: true`, into `backups/removed/`. Your own entries stay; a project of the example data is taken off any of yours that you tagged with it. |

Achievements, evidence, projects and settings get their endpoints as those features are built.
