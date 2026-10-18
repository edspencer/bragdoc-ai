---
title: Moving from the hosted app
description: "Bring your data from the hosted BragDoc app into BragDoc on your own computer with bragdoc import, safely and repeatably."
---

If you used the hosted BragDoc web app, you can bring your data with you. Export it from the hosted app (**Account →
Export Data**), which downloads a JSON file named like `bragdoc-export-2026-01-15.json` (its export format, version
1.0). Then import that file into BragDoc on your computer.

Importing is entirely local: the file is read from your disk and nothing is sent anywhere.

## Import it

Look before you leap: a dry run says what would be added, what's already here, what can't be imported, and which
fields are left behind and why. It changes nothing.

```sh
bragdoc import ~/Downloads/bragdoc-export.json --dry-run
```

```text
Dry run of importing ~/Downloads/bragdoc-export.json (exported 2026-01-15).

                       would add  already here  not imported
  companies                    2             0             0
  projects                     4             0             0
  repos                        2             0             0
  achievements               412             0             1
  documents                    2             0             0
  performance reviews          0             0             0

Left behind (BragDoc has no place for these):
  userId (421 items): your account id in the hosted app: it means nothing on your computer.
  companies[].domain (2 items): BragDoc's companies have no website field.
  documents[].shareToken (1 item): a public share link on the hosted app: nothing is shared from your computer.
  …

Problems: 1 not imported, 1 to be imported with a change.
  error    "Q3 launch" (id 3f2a9c1d…): not imported: createdAt: not a date and time
  warning  "Atlas search" (id 5b10e2f7…): its colour "blue" isn't one BragDoc can use (#rrggbb); it gets #3b6cf6 instead

Documents and reviews would go to imports/2026-10-17T09-00-00Z/ in your data folder, as read-only markdown.
Nothing has been written. Run it again without --dry-run to import.
Data folder: ~/.bragdoc
```

(Only the first 20 problems are listed, then how many more there are.)

Then import it for real:

```sh
bragdoc import ~/Downloads/bragdoc-export.json
```

If BragDoc is running, the import goes through it; if not, the command writes to your data folder itself. Either way,
BragDoc takes a snapshot of your data folder first (in `backups/`), so you can always get back to how things were.
Use `--data-dir <dir>` to import into a data folder other than `~/.bragdoc`.

You can do the same in the app: **Settings → Data** has an importer that shows the same dry run before anything is
written. The first step of Welcome points you there too.

## What comes across

| In the hosted app | In BragDoc |
| --- | --- |
| Companies | [Companies](/concepts/projects/), with your role and dates |
| Projects | Projects, with their dates, colour and status (*completed* becomes *done*); a project's repository URL becomes a linked [repo](/concepts/projects/), one per repository however its URL is written |
| Achievements | Achievements marked as imported, each tagged with its project. The event start date (or, without one, the day it was added) becomes its date, and the event end its end date. Its details become its body; its impact, summary and archived state come along. Its original source and event duration are kept in its file, under `meta.legacy` |
| Documents and performance reviews | Read-only Markdown files under `imports/<timestamp>/` in your data folder, for you and your agents to read |

An impact you set yourself stays marked as yours (`impactSource: user`). One the hosted app suggested is marked as
carried over (`impactSource: import`).

Some things are left behind because they don't apply on your own machine: your account id, share links, links to
chat messages the export doesn't include, and the hosted app's AI search data. The dry run lists each one, with how
many items had it.

## When something doesn't fit

A file that isn't a version 1.0 export (not JSON, cut off part-way through a download, or a different version) is
refused with a message saying why, and nothing is imported.

Within a good file, each item is checked on its own. An item that can't be imported (an achievement with no date, say)
is listed as an error, and everything else still comes across. Items that need a small change are imported and listed
as warnings: a project colour BragDoc can't use gets one of its own; an achievement whose project or company isn't in
the export is imported without it, with the original id kept under `meta.legacy`; an achievement with no title takes
the first line of its summary (or, without one, of its details).

## Safe to repeat

Everything imported remembers its id from the hosted app (`legacyId`), so importing the same export again creates
nothing new. Import a newer export later and only what's new comes across. One thing to know: if you delete something
you imported, importing the same export again brings it back, because it's in the export and no longer here.

If an import stops part-way (the disk filled up, say), run it again: what came across is skipped, and the rest comes
in. Something whose project couldn't be imported isn't imported either, so a second run brings both, linked.

Dates come across as the day you picked in the hosted app, in your time zone (the one in your profile, or else your
computer's).

## The old CLI

If you used the old `@bragdoc/cli` package, it kept its files in `~/.bragdoc` too. BragDoc moves them aside into
`~/.bragdoc/legacy-cli/` the first time it runs, deleting nothing. See
[Installation](/getting-started/installation/#used-the-old-bragdoc-cli).
