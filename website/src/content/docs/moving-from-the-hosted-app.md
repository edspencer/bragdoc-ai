---
title: Moving from the hosted app
description: "Bring your data from the hosted BragDoc app into BragDoc on your own computer with bragdoc import, safely and repeatably."
---

:::note[Coming in v0.1]
The importer is being built. This page describes how it is designed to work.
:::

If you used the hosted BragDoc web app, you can bring your data with you. Export it from the hosted app as a JSON file
(its export format, version 1.0), then import that file into BragDoc on your computer.

## Import it

Look before you leap: a dry run counts what would be imported and lists any problems, and changes nothing.

```sh
bragdoc import ~/Downloads/bragdoc-export.json --dry-run
```

Then import it for real:

```sh
bragdoc import ~/Downloads/bragdoc-export.json
```

You'll be able to do the same from **Settings → Data** in the app, and the first-run welcome offers it too.

## What comes across

| In the hosted app | In BragDoc |
| --- | --- |
| Companies | [Companies](/concepts/projects/) |
| Projects | Projects; a project's repository URL becomes a linked repo |
| Achievements | Achievements, with their dates, impact and archived state, marked as imported |
| Documents and performance reviews | Read-only Markdown files under `imports/<timestamp>/` in your data folder |

Some things are left behind because they don't apply on your own machine: search embeddings, account ids and share
links.

## Safe to repeat

Each imported achievement remembers its id from the hosted app (`legacyId`), so importing the same export again
creates nothing new. Import a newer export later and only what's new comes across.

## The old CLI

If you used the old `@bragdoc/cli` package, it kept its files in `~/.bragdoc` too. BragDoc moves them aside into
`~/.bragdoc/legacy-cli/` the first time it runs, deleting nothing. See
[Installation](/getting-started/installation/#used-the-old-bragdoc-cli).
