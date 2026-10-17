---
title: BragDoc is becoming a local-first, open-source app
description: "Why BragDoc is being rebuilt to run on your own computer, keep your data as plain files, and send nothing off your machine except to services you connect."
date: 2026-10-17
---

BragDoc is being rebuilt from scratch as an app you run on your own computer. It will be free, open source under the
MIT licence, and it will keep everything as plain files in a folder you own. This post is about why, and what that
means.

## The record that matters most is yours

A brag document is a record of the work you did: the launches, the fixes, the people you helped, the kind words
people said about it. It is useful exactly when it's hard to reconstruct from memory: in a self-review, a promotion
case, a job search.

That record is personal. It is full of your colleagues' names, your employer's projects and screenshots of your
company's chat. It shouldn't have to live on someone else's server for you to keep it, and it shouldn't be locked in
a database you can only get at through an export button.

## What changes

- **It runs on your computer.** `npx @bragdoc/local`, a global install, a login service, or Docker. It opens in your
  browser at `http://localhost:2724`.
- **Your data is just files.** One Markdown file per achievement, YAML for everything else, in `~/.bragdoc`. Edit
  them by hand, back them up, keep them in git, or let your coding agent write them.
- **Nothing leaves unless you connect it.** No account, no telemetry, no update check. The only outbound requests go
  to services you connect yourself, and the app lists every one.
- **AI is off.** The first release has no AI features at all. Screenshots are read on your machine and checked
  against plain rules you can see. If AI features come later, each one will be off until you turn it on.
- **Evidence first.** Paste a screenshot, drop a PDF, paste a pull request link. Sources you switch on (your merged
  pull requests, a screenshots folder) collect candidates in an inbox, and nothing they find reaches your board until
  you say yes. Your coding agent can write to the board directly, labelled as its own, if you connect it.

## The hosted app

If you use the hosted BragDoc app, nothing changes for you today. When the local version is released, you'll be able
to export your data from the hosted app and import it with one command; re-importing never creates duplicates. The
[migration page](/moving-from-the-hosted-app/) has the details as they firm up.

## Follow along

Version 0.1 is being built in the open on the
[`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next). The [roadmap](/roadmap/) lists what's in it, and
these docs describe it as it's built. It isn't on npm yet; this blog will say when it is.
