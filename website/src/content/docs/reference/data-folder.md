---
title: The data folder
description: "The layout of ~/.bragdoc and the format of every file in it: achievements, evidence, projects, companies, repos and Found candidates."
---

:::note[Tracking `next`]
The file format is defined on the [`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next) (in
`shared/schema/`), and the tables at the end of this page are generated from it, so they are exactly what BragDoc
checks. It may still change before v0.1 is released.
:::

Everything BragDoc knows is a plain file in its **data folder**: `--data-dir`, else `$BRAGDOC_HOME`, else
`~/.bragdoc`. You can read and edit any of it by hand, or have your coding agent do it, and BragDoc picks the change
up live. Why it works this way is in [Your data is files](/concepts/your-data-is-files/).

## Layout

```
config.yaml                     # settings: sources, MCP, allowed hosts; secrets never inlined
profile.yaml                    # about you: name, role, GitHub login, aliases, notMe, emails, time zone
companies/<id>.yaml             # a company you worked at
projects/<id>.yaml              # a project: name, colour, dates, status, company, linked repos
repos/<id>.yaml                 # a code repository: local path and/or remote
achievements/YYYY/MM/<id>.md    # one achievement: YAML front-matter, then a Markdown body
evidence/<aa>/<sha256>.<ext>    # a stored file (screenshot, PDF, …), named by its content
evidence/<aa>/<sha256>.yaml     # its sidecar: type, original name, size, dimensions, text read from it
found/<id>.yaml                 # a candidate in Found: pending, kept or dismissed
imports/<timestamp>/            # documents carried over from a hosted-app export (read-only)
secrets.yaml                    # readable only by you: a GitHub token, if you use one
runtime.json                    # readable only by you: the running server's port, URL, version and MCP token
logs/network.jsonl              # every outbound request
backups/<timestamp>/            # automatic snapshots
backups/removed/                # "deleted" files, moved here, never erased
.gitignore                      # keeps machine-written files out of git
cache/                          # derived and safe to delete
legacy-cli/                     # the old BragDoc CLI's files, moved aside on first run
```

## Ids and references

- Every id is a [ULID](https://github.com/ulid/spec): 26 characters, upper case, like `01M4XJCNXRQ2X7Z4M8N6P0R5T1`.
  The first ten characters encode when it was made, so ids sort by creation time.
- A file's id is its name (`projects/01M2B7….yaml`). The `id:` key inside must match; a hand-written file may leave it
  out.
- Files refer to each other by id (`projects: [01M2B7…]`), never by name, so renaming a project rewrites one file.
- An achievement lives under the year and month **its id was made in** (UTC), not its `happenedAt`, so changing its
  date never moves it. To add one by hand, make a ULID for now and put the file in this month's folder.
- A reference to something that doesn't exist is tolerated: everything still loads, and Settings → Data lists it as a
  Problem.

## Achievement files

```markdown
---
schemaVersion: 1
id: 01M4XJCNXRQ2X7Z4M8N6P0R5T1
title: Cut CI time from 20 minutes to 8
happenedAt: 2026-10-14
impact: 5
projects: [01M2B7…]
evidence:
  - id: 01M4XJCNXS…
    kind: github_pr
    url: https://github.com/acme/rocket/pull/412
    externalKey: github_pr:acme/rocket#412
source: manual
archived: false
createdAt: 2026-10-14T16:02:11.000Z
updatedAt: 2026-10-14T16:02:11.000Z
---
Split the test suite across four runners and cached the dependency install.
```

The body is everything after the closing `---` line. When BragDoc changes the front-matter, the body is left exactly
as it was.

## Evidence

Evidence lives in an achievement's `evidence:` list (and in Found candidates). Links, pull requests and quotes are
written inline. Files are stored once in `evidence/`, named by their sha256 and typed by their content, whatever their
name said; the item refers to them with `blob: <sha256>`. Each stored file has a sidecar next to it, and text read
from it there is searchable.

## Hand edits, Problems and versions

- **Comments, key order and unknown keys survive.** BragDoc edits YAML as a document, changing only the keys it means
  to. A key it doesn't know is yours: it's kept.
- **A file that doesn't parse or validate is a Problem**, listed in Settings → Data with the file, line and message.
  BragDoc keeps using its last good version (if it had one) and never writes to it until you fix it.
- **`schemaVersion`** is an integer per file type (absent means 1). A file from a newer BragDoc is read-only: shown if
  it still validates, listed as a Problem, never rewritten. A `config.yaml` from a newer BragDoc refuses to start.
- **Writes are atomic**: a temporary file renamed into place. Nothing is deleted: removing something moves its file
  into `backups/removed/<timestamp>/`.
- **Backups**: a snapshot (not secrets, logs or cache) goes into `backups/<timestamp>/` when the server starts and
  hourly while it runs, if anything changed. The newest 50 are kept, plus the first of each day for 30 days.

## Reference

The tables below are generated from BragDoc's schemas (`npm run sync:reference` at the repository root); the root test
suite fails if they fall out of step.

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
