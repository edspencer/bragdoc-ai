---
title: Found and sources
description: "Sources you switch on spot things worth keeping and leave them in Found, where you keep, merge or dismiss each one."
---

:::note[Coming in v0.1]
Found and the sources are being built. This page describes the design.
:::

**Found** is an inbox. **Sources** fill it. Every source is **off** until you switch it on, and nothing a source
spots reaches your board until you say so.

## Keep, merge or dismiss

Each candidate in Found shows where it came from, what it is (a pull request, a screenshot with the matching words
highlighted, or what your agent wrote), **which rules it passed**, and the projects it probably belongs to. Then:

- **Keep** makes it an achievement, with its evidence attached.
- **Merge into…** attaches its evidence to an achievement you already have.
- **Dismiss** sets it aside. The same pull request or screenshot never comes back.

Each of these can be undone. There's no "confidence score": v0.1 has no AI, so candidates are chosen by plain rules
you can read.

## The sources

### GitHub

Finds the pull requests you merged. It prefers the [GitHub CLI](https://cli.github.com/) (`gh`), if you have it and
are logged in, so BragDoc stores no token. Otherwise you can paste a fine-grained personal access token, which is
stored in `secrets.yaml` (readable only by you). When you connect, you choose how far back to look (90 days by
default) and, optionally, which repositories. It checks hourly while BragDoc is running, and whenever you press
**Run now**. Each merged pull request becomes one candidate.

GitHub is the one service v0.1 can talk to, and only once you connect it. Every request appears in
[Network activity](/guarantees/network-activity/).

### A screenshots folder

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

If you've reviewed everything, Found says you're all caught up and what it is still watching. If no source is on, it
says so, and links to Settings → Sources.
