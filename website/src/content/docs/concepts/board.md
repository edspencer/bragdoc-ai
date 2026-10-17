---
title: The board
description: "The board is your feed of achievements, grouped by week, with the evidence for each one pinned to its card."
---

:::note[Coming in v0.1]
The board is being built. This page describes the design.
:::

The board is where your achievements live: one card each, grouped by week, newest first, in one, two or three columns
depending on the width of your window.

## Adding something

At the top is a box that says **Drop it here.** You can:

- **type** a line or a few: the first line is the title, the rest is the body;
- **paste** (⌘V or Ctrl+V) a screenshot or any image, a link, or a GitHub pull request URL;
- **drag and drop** images, PDFs or any other file;
- **pick files** from a dialog.

A pasted pull request URL becomes a pull request card. If you've [connected GitHub](/concepts/found-and-sources/),
BragDoc fetches its title; otherwise it shows as `owner/repo#123`. Any other URL becomes a link. Pasted and dropped
images are read on your machine (OCR) in the background, so the words in a screenshot become searchable, and if they
look like praise for you the box offers to pin the quote as a sticky note.

Each achievement has a date (today, unless you change it), an optional end date for something that took a while, an
optional **impact** from 1 to 10, and any number of [projects](/concepts/projects/) and repos. Press ⌘+Enter
(Ctrl+Enter) to save.

## The cards

A card shows its title, date, summary and evidence: screenshots as photo prints (click for a larger view), PDFs and
files as chips, pull requests as dark slabs, quotes as sticky notes. The tape across the top is in the project's
colour. A badge says how it got there when you didn't add it by hand: written by your coding agent, from GitHub,
spotted in your screenshots folder, or imported.

You can edit everything on a card, archive it (hidden but kept), or delete it. Deleting moves the file into
`backups/removed/` rather than erasing it, and you can undo.

## Search and live updates

The search box searches titles, summaries, bodies, evidence titles, quotes and the text read from screenshots. The
board updates live when its files change on disk, whether the change came from your editor, a `git pull`, or an agent.

When sources have spotted things, a strip at the top says how many are waiting in [Found](/concepts/found-and-sources/).
