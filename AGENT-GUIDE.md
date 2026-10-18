# BragDoc: a guide for coding agents

<!-- live facts -->

**This is for agents working for a BragDoc user** (in their code, their terminal, their chat) who are asked to note
something in BragDoc: "log that I shipped the new importer", "put this review in my BragDoc". It isn't about
developing BragDoc itself. `bragdoc guide` prints this guide; a running BragDoc serves it, with its live facts, at
http://localhost:2724/agent-guide.md and http://localhost:2724/llms.txt.

## What BragDoc is

BragDoc is a small app the user runs on their own computer (http://localhost:2724 by default) to keep a record of what
they've achieved at work: a pinboard of **achievements**, each backed by **evidence** (pull requests, links, quotes,
screenshots, PDFs), grouped into **projects** (with dates and a colour, optionally under a **company**) and linked to
code **repos**. When review season comes, it turns a date range into a document. Nothing leaves the computer.

Everything is plain files in a **data home**, `~/.bragdoc` by default (or `$BRAGDOC_HOME`): one markdown file per
achievement, one YAML file per project, company and repo. The app watches the folder, so a change made by hand, by
`git pull` or by you shows up on the board within a second.

There are two ways for you to write to it:

1. **MCP**, when your client has BragDoc's tools (`bragdoc_get_context` and friends). Typed, validated, and it marks
   what you write as yours. Prefer it whenever BragDoc is running: it validates what you write, keeps the files'
   comments, and never overwrites an edit made meanwhile.
2. **The files**, directly, when you have no MCP tools or BragDoc isn't running. That's allowed: it picks your edits
   up at once if it's running, or when it next starts.

## The rules

- **Call `bragdoc_get_context` first** (without MCP: read `profile.yaml`, `projects/` and the newest `achievements/`): who the user is, their active
  projects and repos, their last 20 achievements, the impact scale and the house style below.
- **Search before adding.** Look for the same work: the same PR, the same project, the same words
  (`bragdoc_search_achievements`). If it's already there, update it or attach evidence to it instead of adding a
  duplicate.
- **Investigate contradictions.** If what you're about to write disagrees with what's recorded (a date, a number, who
  did it), check the code, the PR or the git log, and tell the user before writing.
- **Never invent** a result, a metric or a quote. Write what the user did, in their words where you have them.
- **Give an `externalKey`** when the work has a stable identity (`github_pr:owner/repo#123`, `commit:<sha>`, a ticket
  id): adding the same key again does nothing, so retrying is safe.
- **When in doubt, suggest rather than write:** `bragdoc_add_found` puts it in Found, BragDoc's inbox, for the user to
  keep or dismiss.
- **Don't delete anything.** BragDoc's own removals move files to `backups/removed/`; archive an achievement
  (`archived: true`) rather than removing it.

## House style

- **Title:** one line, past tense, the outcome first: "Cut checkout latency by 40%", not "Worked on performance". No
  "I".
- **Summary:** a sentence or two on why it mattered and who it helped. Numbers beat adjectives; say where a number
  came from.
- **Body** (markdown, optional): the context, what was done, what changed. Link the PR, the doc, the thread.
- **Date:** `happenedAt` is the day it shipped or happened, not the day you write it down. `endedAt` only for
  something that took weeks.
- **One achievement per outcome:** several PRs that delivered one thing are one achievement, with each PR as
  evidence.
- **Impact** (optional, 1–10) is how much it mattered to other people. Leave it out if you'd be guessing:

| Impact | Meaning |
|--------|---------|
| 1 Routine | Everyday work done well: worth remembering, not worth a headline. |
| 2 Helpful | Made someone's day easier: a quick fix, a good answer, an unblocked colleague. |
| 3 Solid | A piece of work finished properly that your team relied on. |
| 4 Noticed | Your team noticed: it saved real time, removed a recurring pain or set a better habit. |
| 5 Significant | Moved a team goal forward, or something people outside your team now use. |
| 6 Major | Shipped a feature or change that customers or several teams feel. |
| 7 Standout | Changed how a group works, or delivered a result leadership points to. |
| 8 Exceptional | Shaped a product line, a big launch or a hard migration: hard to imagine it without you. |
| 9 Defining | A result the whole organisation knows about and will cite for years. |
| 10 Career-defining | Once-in-a-career: it changed the company's direction or its fortunes. |

## MCP

BragDoc's MCP server is on BragDoc's own port, at http://localhost:2724/mcp (Streamable HTTP), and needs the per-install
bearer token from `runtime.json` in the data home. The user sets it up once:

```sh
bragdoc mcp install claude          # registers it with Claude Code (user scope), token and all
bragdoc mcp install claude --stdio  # or as a stdio server: `bragdoc mcp`, which reads the token itself
bragdoc mcp install claude --print  # just print the config for Claude Desktop, Cursor and others
```

`bragdoc mcp` is a stdio bridge to the running BragDoc, for clients that prefer stdio; it fails with a clear message
when BragDoc isn't running.

| Tool | What it does |
|------|--------------|
| `bragdoc_get_context` | **Call it first.** The profile, active projects, tracked repos, the last 20 achievements, the impact scale, the house style and these rules. `repoPath` (your working directory) or `project` adds what's recorded for that repo or project. |
| `bragdoc_search_achievements` | Full-text search with filters (project, repo, dates, source), best match first; newest first without a query. |
| `bragdoc_get_achievement` | One achievement in full, with its `etag`. |
| `bragdoc_add_achievement` | Log an achievement, with evidence (links, PR URLs, quotes, files by absolute path). Idempotent on `externalKey`. |
| `bragdoc_update_achievement` | Change fields, retag projects and repos, or archive. Takes an optional `etag`. |
| `bragdoc_attach_evidence` | Add a link, a PR, a quote or a file to an existing achievement. |
| `bragdoc_add_found` | Suggest a candidate for the user to keep or dismiss, without touching the board. |
| `bragdoc_list_projects`, `bragdoc_upsert_project` | Projects; create or change one (by id, else by name). |
| `bragdoc_list_repos`, `bragdoc_link_repo` | Repos; add one by path or remote (an existing one is reused) and link it to a project. |

The resource `bragdoc://context` is what `bragdoc_get_context` returns, and says when it changes. The prompts
`log-this` and `weekly-recap` appear as slash commands in clients that show them (`/bragdoc:log-this` in Claude Code).

What you write over MCP is marked with where it came from (`source: mcp`) and your client's name (`sourceAgent`), so
the board shows "Written by Claude Code". It goes straight onto the board, unless the user set `mcp.writeTo: found` in
`config.yaml`, in which case it waits in Found. Files you attach are copied into BragDoc: only regular files, at most
25 MB, of a kind that makes sense as evidence (images, PDFs, office documents, text, short videos), and never from a
hidden folder or BragDoc's own data home.

## The HTTP API

On this computer only (127.0.0.1). Requests from web pages are refused, so `curl` works and a browser tab on another
site doesn't. What's there for agents today:

| Method | Path | What it does |
|--------|------|--------------|
| GET | `/api/health` | Is it running, and which version |
| GET | `/api/meta` | The version, the data home, the MCP address, and what's allowed out |
| GET | `/api/events` | Server-sent events: what changed, as it changes |
| GET | `/agent-guide.md`, `/llms.txt`, `/llms-full.txt` | This guide, with live facts |
| POST | `/mcp` | MCP (needs the bearer token) |
| POST | `/api/import/plan`, `/api/import/apply` | A hosted-app export (the JSON file as the body): what importing it would do, or do it |
| GET | `/api/folio?from=YYYY-MM-DD&to=YYYY-MM-DD` | A date window's achievements as Folio shows them (safe to share: no ids, file locations or local links), with project and company names |
| GET | `/api/found` | What's waiting in Found (newest first); `POST /api/found/:id/{keep,merge,dismiss,undo}` decides |
| GET | `/api/sources` | Each source's state (GitHub: on or off, the last check, any error; the screenshots folder: which folder, watching or what's wrong, what it looked at) |
| GET | `/api/evidence/:sha/ocr` | The text read from a picture on the board (in the background, after it's added) |

To write without MCP, edit the files (below).

## Editing the files

- **Achievements** are `achievements/YYYY/MM/<id>.md`: YAML front-matter between `---` lines, then the markdown body.
  The id is a [ULID](https://github.com/ulid/spec) (26 characters, upper case) and `YYYY/MM` is the month it was made
  in, so the file never moves when its date changes. Make the id from the current time, and set `createdAt` and
  `updatedAt` to now.
- **Projects, companies and repos** are `projects/<id>.yaml`, `companies/<id>.yaml`, `repos/<id>.yaml`. Achievements
  refer to them by id, never by name.
- Keep the user's comments and key order: edit the lines you mean to change and leave the rest alone.
- Never touch `runtime.json`, `secrets.yaml`, `logs/`, `cache/` or `backups/`: they're machine-written or private.
- A file that doesn't validate isn't lost: BragDoc lists it under Problems, keeps showing its last good version, and
  never rewrites it until it's fixed. Check `/api/meta` or the app after a hand edit.

A minimal achievement:

```markdown
---
id: 01JBZ8Q3W5C2Y6N0R7T4K9M1XE
title: Shipped the CSV importer
happenedAt: 2026-10-14
projects: [01JBZ7V4E2N6P8R0T3W5Y7A9CD]
source: manual
createdAt: 2026-10-14T16:20:00Z
updatedAt: 2026-10-14T16:20:00Z
evidence:
  - id: 01JBZ8Q3W5C2Y6N0R7T4K9M1XF
    kind: github_pr
    url: https://github.com/example/my-app/pull/42
    externalKey: github_pr:example/my-app#42
---
Customers can now bring their history from a spreadsheet.
```

## For your agent instruction file

Paste this into the instruction file your agent reads (`CLAUDE.md`, `AGENTS.md`, …) so it knows BragDoc is there:

> When I ask you to note, log or remember something I did at work ("put this in my BragDoc"), use BragDoc's MCP tools:
> call `bragdoc_get_context` first (pass your working directory as `repoPath`), search for related achievements before
> adding one, and if anything contradicts what is recorded, check and ask me before writing. Never invent results or
> numbers. Run `bragdoc guide` for details.

## File-format reference

Every key each file may have, generated from the schemas BragDoc validates with.

<!-- reference:start (generated by `npm run sync:reference`; edit shared/schema/, not this) -->

### `profile.yaml`

About you. Onboarding writes it; until it exists, BragDoc shows the welcome.

| Key | Type | Required | Meaning |
|-----|------|----------|---------|
| `schemaVersion` | integer | default `1` | The file format version. BragDoc writes it; leave it alone. A file from a newer BragDoc is read-only. |
| `name` | string | yes | Your name, as colleagues write it. |
| `role` | string |  | Your role or job title. |
| `githubLogin` | string |  | Your GitHub username. |
| `aliases` | list of string | default `[]` | What people call you at work: nicknames, handles, initials. |
| `notMe` | list of string | default `[]` | Names that look like yours but aren't you (the rules skip them). |
| `emails` | list of string | default `[]` | Your work and personal email addresses. |
| `timezone` | string |  | An IANA time zone, e.g. `Europe/London`. Defaults to the machine's. |

### `companies/<id>.yaml`

A company you worked at.

| Key | Type | Required | Meaning |
|-----|------|----------|---------|
| `schemaVersion` | integer | default `1` | The file format version. BragDoc writes it; leave it alone. A file from a newer BragDoc is read-only. |
| `id` | id | yes | The id (a ULID). It must match the file name. |
| `name` | string | yes | The company's name. |
| `role` | string |  | Your role there. |
| `start` | date |  | When you started, YYYY-MM-DD. |
| `end` | date or empty | default `null` | When you left; empty while you still work there. |
| `legacyId` | string |  | Its id in the hosted BragDoc, for imported companies (re-importing skips it). |
| `example` | boolean |  | `true` on example data, which Settings can remove in one go. |

### `projects/<id>.yaml`

A project: dates, a colour, optionally a company and linked repos.

| Key | Type | Required | Meaning |
|-----|------|----------|---------|
| `schemaVersion` | integer | default `1` | The file format version. BragDoc writes it; leave it alone. A file from a newer BragDoc is read-only. |
| `id` | id | yes | The id (a ULID). It must match the file name. |
| `name` | string | yes | The project's name. |
| `description` | string |  | A line or two about it. |
| `color` | colour | yes | Its tape colour, `#rrggbb`. |
| `start` | date | yes | When it started, YYYY-MM-DD. |
| `end` | date or empty | default `null` | When it ended; empty while it's ongoing. |
| `status` | one of the values given | default `"active"` | `active`, `paused`, `done` or `archived` (hidden from pickers). |
| `companyId` | id or empty | default `null` | The company it was for (a company id), or empty. |
| `repoIds` | list of id | default `[]` | Linked repos (repo ids). |
| `legacyId` | string |  | Its id in the hosted BragDoc, for imported projects (re-importing skips it). |
| `example` | boolean |  | `true` on example data, which Settings can remove in one go. |

### `repos/<id>.yaml`

A code repository. Give `localPath`, `remoteUrl`, or both.

| Key | Type | Required | Meaning |
|-----|------|----------|---------|
| `schemaVersion` | integer | default `1` | The file format version. BragDoc writes it; leave it alone. A file from a newer BragDoc is read-only. |
| `id` | id | yes | The id (a ULID). It must match the file name. |
| `name` | string | yes | A short name, usually `owner/repo` or the folder name. |
| `localPath` | string |  | Where it is checked out on this machine (absolute, `~` allowed). |
| `remoteUrl` | string |  | Its remote, e.g. `https://github.com/owner/repo`. |
| `host` | string | default `"local"` | Where it's hosted (`github.com`), or `local` for a checkout with no known remote. |
| `tracked` | boolean | default `true` | `false` hides it from suggestions without forgetting it. |
| `example` | boolean |  | `true` on example data, which Settings can remove in one go. |

### `achievements/YYYY/MM/<id>.md`

One achievement: these keys as YAML front-matter between `---` lines, then the markdown body. `YYYY/MM` is the month the id was made in, so the file never moves when you change its date.

| Key | Type | Required | Meaning |
|-----|------|----------|---------|
| `schemaVersion` | integer | default `1` | The file format version. BragDoc writes it; leave it alone. A file from a newer BragDoc is read-only. |
| `id` | id | yes | The id (a ULID). It must match the file name. |
| `title` | string | yes | One line: what you did. |
| `summary` | string |  | A sentence or two more. |
| `happenedAt` | date | yes | When it happened (or started), YYYY-MM-DD. |
| `endedAt` | date or empty |  | When it ended, for something that took a while. |
| `impact` | integer 1–10 |  | How much it mattered, 1–10 (the scale is in the agent guide). |
| `impactSource` | one of the values given |  | Who set the impact: `user`, or `import` (carried over from the hosted app). |
| `projects` | list of id | default `[]` | Projects it belongs to (project ids). |
| `repos` | list of id | default `[]` | Repos it touched (repo ids). |
| `companyId` | id or empty |  | The company, when it isn't implied by a project. |
| `evidence` | list of mapping | default `[]` | What backs it up (see Evidence). |
| `source` | one of the values given | default `"manual"` | How it got here: `manual`, `paste`, `github-pr`, `screenshot`, `mcp` or `import`. |
| `sourceAgent` | string |  | For `mcp`: which agent wrote it, as the board names it, e.g. `Claude Code`. |
| `externalKey` | string |  | A stable key for where it came from (`github_pr:owner/repo#123`); adding the same key again is a no-op. |
| `legacyId` | string |  | Its id in the hosted BragDoc, for imported achievements (re-importing skips it). |
| `archived` | boolean | default `false` | `true` hides it from the board without deleting it. |
| `createdAt` | date-time | yes | When it was added. |
| `updatedAt` | date-time | yes | When it was last changed. |
| `example` | boolean |  | `true` on example data, which Settings can remove in one go. |
| `meta` | mapping |  | Extra data kept by an importer or a source. |

### Evidence (an item in `evidence:`)

What backs an achievement (or a Found candidate) up.

| Key | Type | Required | Meaning |
|-----|------|----------|---------|
| `id` | id | yes | The evidence's id (a ULID). |
| `kind` | one of the values given | yes | `image`, `pdf`, `file`, `url`, `github_pr` or `quote`. |
| `blob` | string |  | For image, pdf and file: the sha256 of the file in evidence/. |
| `url` | string |  | For url and github_pr: the link. |
| `externalKey` | string |  | A stable key for where it came from, e.g. `github_pr:owner/repo#123`. |
| `title` | string |  | A caption or title. |
| `quote` | mapping |  | For quote: the words, who and where. |
| `meta` | mapping |  | Extra data kept by an importer or a source. |

### `evidence/<aa>/<sha256>.yaml`

Describes the stored file next to it (`<aa>` is the first two digits of its sha256).

| Key | Type | Required | Meaning |
|-----|------|----------|---------|
| `schemaVersion` | integer | default `1` | The file format version. BragDoc writes it; leave it alone. A file from a newer BragDoc is read-only. |
| `sha256` | string | yes | The blob's sha256 (also its file name). |
| `mime` | string | yes | Its type, from its content (magic bytes), not its name. |
| `ext` | string | yes | The blob's file extension. |
| `originalName` | string |  | The name it had when it was added. |
| `bytes` | integer | yes | Its size in bytes. |
| `width` | integer |  | Images: width in pixels. |
| `height` | integer |  | Images: height in pixels. |
| `ocr` | mapping |  | Images: text read from it, which search covers. |
| `createdAt` | date-time | yes | When it was added. |

### `found/<id>.yaml`

A candidate in Found.

| Key | Type | Required | Meaning |
|-----|------|----------|---------|
| `schemaVersion` | integer | default `1` | The file format version. BragDoc writes it; leave it alone. A file from a newer BragDoc is read-only. |
| `id` | id | yes | The id (a ULID). It must match the file name. |
| `status` | one of the values given | default `"pending"` | `pending`, `kept` or `dismissed`. |
| `source` | one of the values given | yes | Which source spotted it: `github`, `screenshots` or `mcp`. |
| `sourceAgent` | string |  | For `mcp`: which agent sent it. |
| `externalKey` | string |  | A stable key (`github_pr:owner/repo#123`, `screenshot:<sha256>`): the same key is never added twice. |
| `keyHashes` | list of string |  | A dismissed candidate keeps only these: `sha256:` of each key it had, so the same thing never comes back. |
| `title` | string | yes | What the achievement would be called. |
| `summary` | string |  |  |
| `body` | string |  | Markdown, for the achievement's body. |
| `happenedAt` | date | yes | When it happened, YYYY-MM-DD. |
| `impact` | integer 1–10 |  |  |
| `evidence` | list of mapping | default `[]` | Evidence it would carry (links, PRs, quotes, stored files). |
| `files` | list of mapping | default `[]` | Files on disk it points at (a screenshot), copied into evidence/ only when you keep or merge it. |
| `matchedRules` | list of string | default `[]` | Which rules it passed, in words (shown on its card). |
| `suggestedProjects` | list of id | default `[]` | Projects it probably belongs to. |
| `suggestedRepos` | list of id | default `[]` | Repos it probably touched. |
| `verdict` | mapping or empty | default `null` | A judge's decision. Always empty in v0.1 (no AI). |
| `decision` | mapping or empty | default `null` | What you decided, once you have. |
| `foundAt` | date-time | yes | When it was spotted. |
| `meta` | mapping |  | Extra data kept by an importer or a source. |

<!-- reference:end -->
