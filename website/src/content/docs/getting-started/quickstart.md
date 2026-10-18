---
title: Quickstart
description: "Start BragDoc, tell it a little about yourself, and pin your first achievement to the board."
---

## 1. Start it

```sh
npx @bragdoc/local
```

Open `http://localhost:2724` in your browser.

## 2. Say who you are (or skip it)

The first time, the board sends you to **Welcome**: three steps on paper tabs, visited in any order. **Skip for now**
leaves at any point and lands you on your (empty) board; BragDoc remembers that you skipped, and doesn't ask again.
You can run any step again later from **Settings → Data → Welcome steps**.

1. **About you:** your name, what you do, where (a company, optional) and since when, and **what people call you at
   work**: nicknames, chat handles, initials. BragDoc uses these to tell when a screenshot or a message is about you.
   If someone at work has a name like yours, say so too, and BragDoc won't mistake them for you. This becomes
   `profile.yaml` in your data folder.
2. **Where wins come from:** each source, **off until you switch it on**, with a line on what it does. You can connect
   [GitHub](/concepts/found-and-sources/#github) here (through the `gh` CLI if you have it, or a token), or later.
   You can also switch on the [screenshots folder](/concepts/found-and-sources/#a-screenshots-folder): pick the folder your screenshots
   land in, and the ones that mention you turn up in Found. Your coding agent needs nothing switched on: the step
   shows the one command that [connects Claude Code](/agents/mcp/).
3. **Your code:** name the folder you keep your code in. BragDoc suggests the usual ones that exist (`~/Code`,
   `~/src`, `~/dev`, `~/projects`, `~/work`, …) but only checks which of those exist until you press **Look for repos**.
   Then it looks inside that folder only:
   - at most **4 levels down**, for at most **5 seconds** (if it runs out of time, it says so and shows what it found
     so far: name a folder further in to look deeper);
   - it stops at each repository (a folder with a `.git`), and never goes into hidden folders, `node_modules` or
     `Library` (nor, when you name your home folder on a Mac, `Desktop`, `Documents`, `Downloads` and the other
     folders macOS asks permission for);
   - a symlinked folder is followed only if it points inside the folder you named, and never twice, so a symlink loop
     can't trap it.

   Each repository is listed with **why**, from its own `.git`: "you pushed 3 days ago", "you committed yesterday",
   "fetched 3 days ago; your last commit was 6 weeks ago". The ones you worked in during the last 30 days start
   ticked. Tick or untick, give any of them a project if you like, and press **Add**: only the repositories you add
   are saved (as `repos/<id>.yaml`); nothing else from the scan is kept.

   **Also look at** lists places that already know your recent projects: VS Code-style editors (Cursor, Windsurf),
   JetBrains IDEs and Claude Code. Each is read **only if you tick it**: the editors' own list of recent folders, or
   the first lines of each Claude Code project's newest session (where it ran, not what was said). Only the paths that
   are git repositories come back, and the same five seconds cover these too. Your shell history is never read.

Nothing in Welcome sends anything anywhere, except connecting GitHub if you choose to, which shows up in
[Network activity](/guarantees/network-activity/).

## 3. Add an achievement

The board opens with a box that says **Drop it here.** Type a line about something you did this week. The first line
becomes the title; anything after it is the body. Then:

- paste a screenshot (⌘V or Ctrl+V), or drag in a PDF or any file;
- paste a GitHub pull request URL, which becomes a pull request card;
- pick a date (today by default), an impact from 1 to 10 if you like, and a project.

Press ⌘+Enter (Ctrl+Enter) to save. The card appears under **This week**.

### Example data

If the board feels empty and you'd like to see what it's for, press **Fill it with example data** on the empty board
(or in Settings → Data). It adds a few months in the working life of Alex Marlowe, a made-up engineer at two made-up
companies: projects, pull requests, quotes, screenshots and documents, all invented. Every entry is marked
`example: true` in its file and shows an **example** tag on its card, and a strip on the board says so.

**Remove example data** (on that strip, or in Settings → Data) takes away exactly those entries, into
`backups/removed/`. Anything you added yourself stays, even if you tagged it with one of the example projects (the tag
is taken off). Adding the example data twice adds nothing new.

## 4. Look at the file

Open `~/.bragdoc/achievements/` in your editor. The achievement you just added is a Markdown file there. Edit its
title and save: the board updates by itself. That's the whole data model; see
[Your data is files](/concepts/your-data-is-files/).

## Next

- Switch on a source and watch [Found](/concepts/found-and-sources/) fill up.
- Connect [your coding agent](/agents/overview/).
- Keep BragDoc running in the background with [`bragdoc service install`](/getting-started/installation/#keep-it-running).
