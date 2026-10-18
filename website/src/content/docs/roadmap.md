---
title: Roadmap
description: "What's in BragDoc v0.1, what comes after it, and what is deliberately left out."
---

BragDoc is being rebuilt as a local-first app. The work is tracked in
[issue #411](https://github.com/edspencer/bragdoc-ai/issues/411) and happens on the
[`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next).

## v0.1: built, not yet released

Everything here is built on `next` and goes into the first release. None of it is on npm yet.

- **Run it your way:** `npx @bragdoc/local`, a global install, a login service (macOS and Linux), or Docker.
- **Your data is files:** Markdown and YAML in `~/.bragdoc`, edited live, with backups, Problems for broken hand
  edits, and nothing ever erased.
- **The board:** paste and drop screenshots, PDFs, files, links and pull requests; cards by week; search over
  everything, including text read from screenshots.
- **Projects, companies and repos**, with a timeline.
- **Found and sources:** your merged GitHub pull requests; a screenshots folder read on your machine against plain
  rules; candidates from your coding agent. Keep, merge or dismiss.
- **Folio:** a date window exported as Markdown.
- **Agents:** an MCP server, `bragdoc mcp install claude`, and an agent guide.
- **Importing** from the hosted app.
- **Guarantees:** localhost-only security, one logged network path with a CI guard, and no AI.
- **Settings:** sources, network activity, data, and "verify this build".
- **Light, dark and system themes**, and a layout that works on a phone.

## After v0.1

Ideas, not promises:

- opt-in AI features, local first, each switched on separately (see [AI is opt-in](/guarantees/ai-is-opt-in/));
- chat sources (Slack, Teams, Discord);
- smarter duplicate detection;
- Windows support for the login service;
- saved Folios, and a PDF export of its own (today, Folio's **Print** can save a PDF through your browser).

## Not planned

- Accounts, a BragDoc cloud, or anything that puts your data on someone else's server.
- Telemetry or analytics of any kind.
