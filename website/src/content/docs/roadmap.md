---
title: Roadmap
description: "What's in BragDoc v0.1 and 0.2, what comes after them, and what is deliberately left out."
---

BragDoc is being rebuilt as a local-first app. The work is tracked in
[issue #411](https://github.com/edspencer/bragdoc-ai/issues/411) (v0.1) and
[issue #434](https://github.com/edspencer/bragdoc-ai/issues/434) (0.2), and happens on the
[`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next) and the
[`v0.2` branch](https://github.com/edspencer/bragdoc-ai/tree/v0.2).

## v0.1: the first release

Everything here is in v0.1, the first release.

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
- **Guarantees:** localhost-only security, one logged network path with a CI guard, and no AI (0.2 adds it, opt-in).
- **Settings:** sources, network activity, data, and "verify this build".
- **Light, dark and system themes**, and a layout that works on a phone.

## 0.2: opt-in AI

:::note[Coming in 0.2.0]
Built on the `v0.2` branch, after v0.1.
:::

Three optional AI features, each off until you switch it on, best run on a model on your own computer (BragDoc never
installs one), or a cloud provider you explicitly allow. See [AI, off unless you turn it on](/ai/overview/).

- **Settings → AI:** connections to a local runner (Ollama, LM Studio, llama.cpp, any OpenAI-compatible server) or a
  cloud provider (Anthropic, OpenAI, OpenRouter) with your key; consent before anything is sent to the internet;
  looking for a runner you already have; recommendations from this computer's RAM; a confirmed download through
  Ollama; an activity receipt.
- **[The judge](/ai/the-judge/)** in Found: is this a win for you, how sure, and why. It never keeps or dismisses
  anything. Judge now, or on a schedule you choose, with "only between" and "only when plugged in".
- **[Tidy this up](/ai/tidy/)** on the board: a suggested title, summary, date, impact and projects, used field by
  field.
- **[Draft with AI](/ai/draft/)** in Folio: a cited review draft from exactly what you picked, checked line by line.
- **[Jev](/ai/cloud/jev/)**, a hosted decision model, as an optional cloud judge.

## Later

Ideas, not promises:

- chat sources (Slack, Teams, Discord);
- duplicate and contradiction hints across your achievements;
- an MCP tool that lets your agent ask the judge;
- a second look, by the judge, at screenshots the plain rules turned down;
- the judge reading pictures directly, rather than their text;
- Windows support for the login service;
- saved Folios, and a PDF export of its own (today, Folio's **Print** can save a PDF through your browser).

## Not planned

- Accounts, a BragDoc cloud, or anything that puts your data on someone else's server. (A cloud AI provider is only
  ever one you choose, with your own key, after reading exactly what it would be sent.)
- Telemetry or analytics of any kind.
