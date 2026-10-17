# BragDoc Local — Specification

> A local-first, open-source tracker for the things you've done at work.

**Status:** v0.1 is being built on `next`. The full specification, implementation plan and test plan for v0.1 are on
the epic, [#411](https://github.com/edspencer/bragdoc-ai/issues/411), whose SPEC comment is the contract. This file
is the hub: what BragDoc is, the principles it keeps, and where everything else is written down.

## 1. What it is

BragDoc is a small app you run on your own machine (`npx @bragdoc/local`, a global npm install, or Docker on your
laptop). It keeps a pinboard of your achievements, each backed by evidence: screenshots, PDFs, links, GitHub PRs,
quotes. It can spot candidates on its own, from your merged PRs and from praise in screenshots you take, and puts them
in **Found** for you to keep, merge or dismiss. When review season comes, **Folio** turns a date window into a markdown
document. Your coding agent can read and write it over MCP. All of it is plain files in `~/.bragdoc`.

## 2. Product principles

1. **AI is off by default, and every AI feature is an explicit opt-in** (D8). v0.1 has none.
2. **No telemetry, no update check.** All outbound traffic goes through one egress module, and every request is shown
   in Settings → Network activity (D9).
3. **Localhost security, single user, no login** (D10).
4. **Your data is just files**, readable and editable by hand or by an agent (D5).
5. **Nothing reaches the board without you**; MCP writes from your own agent are the configurable exception (D11).

## 3. Where things are written down

| What | Where |
|---|---|
| The v0.1 contract (requirements R1–R16), plan (19 PRs in waves) and test plan | [#411](https://github.com/edspencer/bragdoc-ai/issues/411) and its comments |
| Decisions, with reasons and what was rejected | [docs/decisions.md](docs/decisions.md) |
| The data home's file format | [docs/data-format.md](docs/data-format.md) |
| How to work on the code | [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md) |
| What BragDoc guarantees, and how to report a vulnerability | [SECURITY.md](SECURITY.md) |
| How releases work | [RELEASING.md](RELEASING.md) |

## 4. Glossary

- **Achievement**: a thing you did or got credit for. One file each.
- **Evidence**: what backs an achievement up: an image, PDF, file, link, GitHub PR, or quote.
- **Board**: the feed of achievements, grouped by week.
- **Found**: the inbox of candidates that sources spotted.
- **Source**: something that collects candidates: GitHub, a screenshots folder, or MCP agents.
- **Folio**: a date window of achievements, filtered and exported as markdown.
- **Project**: a named piece of work with dates and a colour, optionally under a **Company**, linked to **Repos**.
