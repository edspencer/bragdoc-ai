---
title: Contributing
description: "How to build BragDoc from source, run its tests, work on these docs, and send a pull request."
---

BragDoc is open source under the MIT licence, and contributions are welcome. The repository is
[edspencer/bragdoc-ai](https://github.com/edspencer/bragdoc-ai); v0.1 is being built on the `next` branch, so branch
from `next` and open pull requests against it. `CONTRIBUTING.md` and `AGENTS.md` in the repository have the full
working rules.

## Build and run it

You need Node.js 22.12 or later.

```sh
git clone https://github.com/edspencer/bragdoc-ai.git
cd bragdoc-ai
git switch next
npm install
npm run dev        # the web app on http://localhost:2724, with hot reload
```

To try it without touching a real data folder, point it at a throwaway one: `BRAGDOC_HOME=/tmp/bragdoc-try npm run dev`.

## Check your work

```sh
npm run typecheck
npm test           # unit tests (node:test)
npm run test:e2e   # browser tests (Playwright)
npm run build
```

CI runs the typecheck, unit tests and build on macOS and Linux, on Node 22 and 24, and the browser tests on Linux.

## Work on these docs

This site is a separate package in `website/` (Astro and Starlight):

```sh
cd website
npm install
npm run dev                                    # live preview
npm run build && npm run check-links && npm run check-external
```

`website/CLAUDE.md` has the content rules. The short version: describe only what BragDoc really does (or say plainly
that it's coming), keep examples generic, and never add analytics or anything loaded from another site.

## Ground rules

- **No telemetry**, and every outbound request goes through the one egress module.
- **AI stays opt-in.** No AI dependency in the core, and nothing that installs a model.
- **The files are the interface.** Every write goes through the store, and a user's hand edits are never overwritten.

Security issues: please follow `SECURITY.md` rather than opening a public issue.
