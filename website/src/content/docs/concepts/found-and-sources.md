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

The zero-permission way to catch praise: no Slack app, no admin approval. Someone says something nice about your work
in a chat, you take a screenshot, and it turns up in Found.

Switch it on in **Settings → Sources** and choose a folder. BragDoc suggests where this computer saves screenshots:
on a Mac, wherever you've told it to (`defaults read com.apple.screencapture location`), else your Desktop; on Linux,
`~/Pictures/Screenshots`, where GNOME and KDE put them. A folder just for screenshots works best.

From then on, BragDoc watches that folder for **new** files only. It never reads what's already there unless you press
**Look at the last 7 days**, which reads that week's screenshots once. Each new file goes through:

1. **Its name.** Only files named like screenshots are read: macOS's "Screenshot 2026-10-17 at 9.41.03 PM.png" in any
   language macOS uses, and the names GNOME, KDE (Spectacle), Flameshot, Windows and CleanShot give them. Turn off
   **Only files named like screenshots** to read every picture in the folder.
2. **Its size and contents.** It must really be a picture (whatever its name says), bigger than an icon, and no
   bigger than 25 MB (the most BragDoc keeps as evidence). BragDoc waits until a file has finished being written.
3. **Its text,** read on your computer: Apple's Vision framework on a Mac where it works, the bundled Tesseract
   otherwise. Nothing is downloaded and nothing leaves your computer.
4. **The rules.** Does one message name you (your name, surname, handle or a nickname from `profile.yaml`, minus the
   names you've said aren't you), or your initials (not a time like "9 AM"), **and** praise you or state an impact
   (a number with a unit, customers, a promotion)? Signs of a chat app (a `#channel`, "12 replies") help a borderline
   one through.

A screenshot that passes becomes a candidate: its card shows the picture, the words that passed on a sticky note, and
the rules it passed. One that doesn't is only counted on the Screenshots card ("40 looked at · 3 sent to Found"), and
its text isn't kept anywhere. The rules can't read tone, so sarcasm that names you passes: that's what Dismiss is for.
They look for your name, so the source reads nothing until `profile.yaml` has one.

The picture stays where it is until you **keep** it, when it's copied into your data folder with its text (so search
finds it). If you've moved or deleted it by then, keeping it keeps the quote, and BragDoc says the picture had gone.

**On a Mac, the Desktop is protected.** macOS asks before any program reads your Desktop, Documents or Downloads
folder, and the permission goes to the app BragDoc runs in: Terminal (or your terminal app) when you start BragDoc
yourself, or `node` when it runs as a [background service](/reference/cli/), which then covers every program run with
node. If you said no, change it in System Settings → Privacy & Security → Files and Folders. The tidier way is a folder
of their own, which needs no permission at all:

```sh
mkdir -p ~/Screenshots && defaults write com.apple.screencapture location ~/Screenshots && killall SystemUIServer
```

If the folder goes away (deleted, renamed, on a disk that's been unplugged) or BragDoc isn't allowed to read it, the
card turns red and says so. BragDoc looks again every half minute and carries on by itself when the folder is back.
Switching the source off stops the watching at once; what it already found stays in Found.

### Your coding agent

An agent connected over [MCP](/agents/mcp/) can send candidates to Found. By default, an agent's own writes go
straight to the board, labelled as written by it; you can send them all to Found instead with `mcp.writeTo: found`
in [config.yaml](/reference/config-yaml/).

## When it's empty

If you've reviewed everything, Found says you're all caught up and what it is still watching (when GitHub last
checked and what it found, which folder is watched for screenshots). If no source is on, it says so, and links to Settings → Sources.
