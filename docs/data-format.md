# The data home and its files

Everything BragDoc knows is a plain file in its **data home**: `--data-dir`, else `$BRAGDOC_HOME`, else `~/.bragdoc`
(D7). You can read and edit any of it by hand, or have your coding agent do it, and BragDoc picks the change up live.
This document is the format reference; the tables at the end are generated from the schemas in `shared/schema/`, so
they're always what the code checks.

## Layout

```
config.yaml                     # schemaVersion, sources, mcp, allowedHosts; secrets never inlined
profile.yaml                    # about you: name, role, githubLogin, aliases, notMe, emails, timezone
companies/<id>.yaml             # a company you worked at
projects/<id>.yaml              # a project: name, colour, dates, status, company, linked repos
repos/<id>.yaml                 # a code repository: local path and/or remote
achievements/YYYY/MM/<id>.md    # one achievement: YAML front-matter, then a markdown body
evidence/<aa>/<sha256>.<ext>    # a stored file (screenshot, PDF, …), named by its content
evidence/<aa>/<sha256>.yaml     # its sidecar: type, original name, size, dimensions, OCR text
found/<id>.yaml                 # a candidate in Found: pending, kept or dismissed
imports/<timestamp>/            # documents carried over from a hosted-app export (read-only)
secrets.yaml                    # mode 0600: a GitHub token, if you use one
runtime.json                    # mode 0600: the running server's pid, port, url, version, MCP token
logs/network.jsonl              # every outbound request
backups/<timestamp>/            # automatic snapshots
backups/removed/                # "deleted" files, moved here, never unlinked
.gitignore                      # keeps machine-written files out of git
cache/                          # derived and deletable
legacy-cli/                     # the old BragDoc CLI's files, moved aside on first run
```

## Ids and references

- Every id is a [ULID](https://github.com/ulid/spec): 26 characters, upper case, like `01JAB3K9Q2X7Z4M8N6P0R5T1VW`.
  The first ten encode when it was made, so ids sort by creation time.
- A file's id is its name (`projects/01JAB….yaml`). The `id:` key inside must match; a hand-written file may leave it
  out.
- Files refer to each other by id (`projects: [01JAB…]`), never by name, so renaming a project rewrites one file.
- An achievement lives under the year and month **its id was made in** (UTC), not its `happenedAt`, so changing its
  date never moves it. To add one by hand, make a ULID for now and put the file in this month's folder.
- A reference to something that doesn't exist (a project you removed, a typo) is tolerated: everything still loads,
  and Settings → Data lists it as a Problem.

## Achievement files

```markdown
---
schemaVersion: 1
id: 01JAB3K9Q2X7Z4M8N6P0R5T1VW
title: Cut CI time from 20 minutes to 8
happenedAt: 2026-10-14
impact: 5
projects: [01JAB2…]
evidence:
  - id: 01JAB3K9Q3…
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

The body is everything after the closing `---` line. When BragDoc changes the front-matter (a new impact, a project
added), the body is left exactly as it was, byte for byte.

## Evidence

Evidence lives in an achievement's `evidence:` list (and in Found candidates). Links, PRs and quotes are written inline.
Files are stored once in `evidence/`, named by their sha256 and typed by their content (magic bytes), whatever their
name said; the item refers to them with `blob: <sha256>`. Adding the same file twice stores it once. Each stored file
has a sidecar next to it; OCR text recorded there is searchable.

## Found

`found/<id>.yaml` is a candidate a source spotted: a merged PR, a screenshot that passed the rules, or something an
agent sent. Keeping it makes an achievement; merging attaches its evidence to an existing one; dismissing it marks it
`dismissed`. Decided candidates stay on disk, so a dismissed `externalKey` (`github_pr:owner/repo#123`) never comes
back, and each decision can be undone. A screenshot candidate points at the original file (`files:`); it's copied into
`evidence/` only when you keep or merge it.

## Imports

`bragdoc import` brings an export from the hosted BragDoc app across (D47). Companies, projects,
repos and achievements become ordinary files like the ones above, each with its hosted id as `legacyId` (so importing
the same export again adds nothing), and achievements with `source: import` and anything without a field of its own
under `meta.legacy`. Documents and performance reviews have no place in the board, so they're written once, read-only
(mode 0444), as markdown under `imports/<timestamp>/documents/` and `imports/<timestamp>/reviews/`, each with its
`legacyId` in the front-matter, plus a `README.md` saying where they came from. BragDoc never reads them back except
to find those `legacyId`s, and never changes them. `cache/import.lock` exists while an import runs.

## Hand edits, Problems and versions

- **Comments, key order and unknown keys survive.** BragDoc edits YAML as a document, changing only the keys it means
  to. A key it doesn't know is yours: it's kept.
- **A file that doesn't parse or validate is a Problem**, listed in Settings → Data with the file, line and message.
  BragDoc keeps using its last good version (if it had one) and **never writes to it** until you fix it.
- **Misnamed files** (`projects/apollo.yaml`, `.yml`) are listed as Problems and ignored.
- **`schemaVersion`** is an integer per file type (absent means 1). A file from a newer BragDoc is read-only here:
  shown if it still validates, listed as a Problem, never rewritten. A `config.yaml` from a newer BragDoc refuses to
  start.
- **Writes are atomic**: a temp file (its name contains `.tmp`) renamed into place, so nothing ever reads a half-written
  file. Nothing is deleted: removing something moves its file into `backups/removed/<timestamp>/`, from where it can be
  restored.
- **Backups**: a snapshot of everything above (not secrets, logs or cache) goes into `backups/<timestamp>/` when the
  server starts and hourly while it runs, if anything changed. Stored files are hard-linked, not copied. The newest 50
  are kept, plus the first of each day for 30 days.

## Reference

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
| `verdict` | mapping or empty | default `null` | An AI judge's opinion, when you have the judge on (v0.2). It never keeps or dismisses anything. |
| `decision` | mapping or empty | default `null` | What you decided, once you have. |
| `foundAt` | date-time | yes | When it was spotted. |
| `meta` | mapping |  | Extra data kept by an importer or a source. |

<!-- reference:end -->
