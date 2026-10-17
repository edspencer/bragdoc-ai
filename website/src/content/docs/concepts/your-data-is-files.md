---
title: Your data is files
description: "Everything BragDoc knows is a plain Markdown or YAML file in a folder you own, readable and editable by you and your tools."
---

:::note[Coming in v0.1]
The file store is built (on the [`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next)); the app around
it isn't released yet.
:::

There is no database. Everything BragDoc knows is a file in its data folder, `~/.bragdoc` by default:

- one **Markdown file per achievement**, with YAML front-matter for its title, date, impact, projects and evidence,
  and your words as the body;
- **YAML files** for projects, companies, repos, your profile and settings;
- stored **evidence files** (screenshots, PDFs) named by their content.

```markdown
---
schemaVersion: 1
id: 01JAB3K9Q2X7Z4M8N6P0R5T1VW
title: Cut CI time from 20 minutes to 8
happenedAt: 2026-10-14
impact: 5
projects: [01JAB2…]
source: manual
archived: false
createdAt: 2026-10-14T16:02:11.000Z
updatedAt: 2026-10-14T16:02:11.000Z
---
Split the test suite across four runners and cached the dependency install.
```

## What that means for you

- **Read and edit them by hand**, in any editor, or let a coding agent do it. The app picks up changes live.
- **Back them up** however you back up files. Put the folder in git if you like; BragDoc writes a `.gitignore` that
  keeps its machine-written files (the running server's details, logs, caches, secrets) out.
- **Nothing is locked in.** If you stop using BragDoc, your data is still a folder of Markdown.
- **Nobody else can see it.** There is no BragDoc server. The files are on your disk, and the app only listens on
  your own computer (see [Localhost security](/guarantees/localhost-security/)).

## Safe by design

- **Edits are careful.** Every write goes to a temporary file first and is then renamed into place, so a crash can't
  leave half a file. When BragDoc changes a YAML file, your comments and key order survive.
- **Mistakes don't crash it.** If a hand edit breaks a file, BragDoc keeps going, lists the file under
  **Problems** in Settings → Data with what's wrong and where, and never overwrites it until you fix it.
- **Nothing is erased.** Deleting something moves its file into `backups/removed/`. BragDoc also snapshots the folder
  when it starts and every hour while things change.
- **Newer files are respected.** A file written by a newer version of BragDoc is opened read-only rather than
  rewritten in an older format.

The full layout and every field are in [The data folder](/reference/data-folder/).
