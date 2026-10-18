---
title: Found and sources
description: "Sources you switch on spot things worth keeping and leave them in Found, where you keep, merge or dismiss each one."
---

**Found** is an inbox. **Sources** fill it. Every source is **off** until you switch it on, and nothing a source
spots reaches your board until you say so. The one exception is your own coding agent: by default, what it writes
over MCP goes straight onto the board, labelled as its own (see [below](#your-coding-agent)).

## Keep, merge or dismiss

Each candidate in Found shows where it came from, what it is (a pull request, a screenshot with the matching words
highlighted, or what your agent wrote), **which rules it passed**, and the projects it probably belongs to. Then:

- **Keep** makes it an achievement, with its evidence attached.
- **Merge into…** attaches its evidence to an achievement you already have.
- **Dismiss** sets it aside. The same pull request or screenshot never comes back. BragDoc keeps nothing of a
  dismissed candidate but a hash of its key (`github_pr:owner/repo#123`), which is enough to recognise it again.

Each of these can be undone from the message that appears. Undoing a dismissal works until BragDoc restarts: after
that, nothing is left to bring back. There's no "confidence score": v0.1 has no AI, so candidates are chosen by plain
rules you can read, and each card lists the ones it passed ("You opened it", "Merged", "In a repo you track").

## The sources

### GitHub

Finds the pull requests you opened that were merged. Connect it in **Settings → Sources**:

- **Through the [GitHub CLI](https://cli.github.com/)** (`gh`), if you have it and are logged in (`gh auth login`).
  BragDoc stores no token: it runs `gh auth status` when you connect, then `gh search prs --author=@me --merged`.
- **With a token**, if you'd rather not use `gh`: a fine-grained personal access token with read-only access to
  "Pull requests". It's stored in `secrets.yaml` (readable only by you, never backed up), checked with GitHub when you
  paste it, and not kept if GitHub refuses it. Disconnecting can delete it too.

When you connect, you choose how far back the first check looks (90 days by default) and, if you like, **where to
look**: owners (`acme`) or repositories (`acme/app`). It starts with the GitHub repositories you track in Projects;
empty means everywhere you merged. A repository BragDoc doesn't know yet is added to your repos, untracked.

It checks when you connect and when you press **Check now**. It checks by itself every hour while BragDoc runs only
if you turn that on. Each check looks from where the last one stopped. Each merged pull request becomes one candidate,
so running it again finds nothing new. One already on your board (pasted by hand, say) isn't added.

If something goes wrong, the GitHub card says what, in plain words: `gh` isn't installed, `gh` is logged out, the
token was refused or can't read pull requests, you're offline, or GitHub asked BragDoc to slow down. In that last case
it waits until GitHub says it may ask again.

GitHub is the one service v0.1 can talk to, and only once you connect it. Every request appears in
[Network activity](/guarantees/network-activity/).

### A screenshots folder

:::note[Coming in v0.1]
The screenshots folder is being built. This section describes the design.
:::

You pick a folder (a dedicated one is best). BragDoc watches it for **new** images, reads the text in each one on
your machine, and checks it against rules: does it mention your name, your handle or one of your nicknames (and not
someone you've said isn't you); does it use words of praise; does it look like a chat app. Screenshots that pass
become candidates. The rest are skipped and only counted ("40 looked at · 3 sent to Found"); their text isn't kept.

A screenshot is copied into your data folder only when you keep it. Text recognition uses Apple's built-in Vision
framework on macOS where it can, and a bundled copy of Tesseract otherwise. Nothing is downloaded and nothing leaves
your computer.

### Your coding agent

An agent connected over [MCP](/agents/mcp/) can send candidates to Found. By default, an agent's own writes go
straight to the board, labelled as written by it; you can send them all to Found instead with `mcp.writeTo: found`
in [config.yaml](/reference/config-yaml/).

## When it's empty

If you've reviewed everything, Found says you're all caught up and what it is still watching (when GitHub last
checked, and what it found). If no source is on, it says so, and links to Settings → Sources.
