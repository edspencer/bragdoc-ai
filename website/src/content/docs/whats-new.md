---
title: What's new
description: "What changed in each BragDoc release, newest first."
---

## 0.2.0: opt-in AI

Built on the [`v0.2` branch](https://github.com/edspencer/bragdoc-ai/tree/v0.2), on top of the first local release
below. Three optional AI features, **each off until you switch it on**; with AI off, BragDoc works exactly as before
and doesn't even load the AI library it talks to models with. See [AI, off unless you turn it on](/ai/overview/).

- **Settings → AI:** a master switch and a switch per feature. Connections to a model runner on your computer or
  network ([Ollama, LM Studio, llama.cpp](/ai/local-models/), or any OpenAI-compatible server) or to a cloud provider
  with your own key ([Anthropic](/ai/cloud/anthropic/), [OpenAI](/ai/cloud/openai/),
  [OpenRouter](/ai/cloud/openrouter/)). A cloud connection sends nothing until you've read exactly what it would send
  and pressed Allow. BragDoc looks for a runner you already have, [recommends a model](/ai/choosing-a-model/) for
  this computer's RAM, and asks Ollama to download one only after you confirm; it never installs a runner. An AI
  activity receipt, and every model call in Network activity.
- **[The judge](/ai/the-judge/)** in Found: reads what the rules let through and says whether it looks like a win for
  you, how sure it is, and why. It never keeps or dismisses anything: "Probably not" waits in its own group, with
  Dismiss these N and Undo. Judge now, or as candidates arrive or every few hours, only between set hours and only
  when plugged in, if you choose.
- **[Tidy this up](/ai/tidy/)** on the board: a suggested title, summary, date, impact and projects for what you
  pasted, used field by field, with anything not in your text flagged.
- **[Draft with AI](/ai/draft/)** in Folio: a review draft from exactly what you picked, every bullet citing its
  achievement, checked line by line. Nothing is saved; the plain export stays the default.
- **[Jev](/ai/cloud/jev/)**, TypeSafe's hosted decision model, as an optional cloud judge through OpenRouter.
- **[AI is opt-in](/guarantees/ai-is-opt-in/)**, rule by rule, with the code that enforces each.

## 0.1.0: the first local release

The first release of BragDoc as a local-first app you run on your own computer, built on the
[`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next):

- **The [board](/concepts/board/):** paste or drop screenshots, PDFs, files, links and pull requests; cards by week;
  search over everything, including the text read from your pictures, on your machine.
- **[Found](/concepts/found-and-sources/):** your merged GitHub pull requests (through `gh` or a token) and a
  screenshots folder checked against plain rules, waiting for you to keep, merge or dismiss. Every source is off until
  you switch it on.
- **[Projects, companies and repos](/concepts/projects/)** on a timeline.
- **[Folio](/concepts/folio/):** a date window, filtered, exported as Markdown, copied or printed.
- **[Agents](/agents/overview/):** an MCP server, `bragdoc mcp install claude`, and an agent guide.
- **Welcome** and made-up example data to try it with (see the [Quickstart](/getting-started/quickstart/)).
- **[Importing](/moving-from-the-hosted-app/)** an export from the hosted app.
- **Settings:** sources, [Network activity](/guarantees/network-activity/), your data and its problems, and the
  build you're running.
- **[Your data is files](/concepts/your-data-is-files/)** in `~/.bragdoc`, with snapshots, and removing something moves its file aside rather than erasing it.
- Light, dark and system themes, and a layout that works on a phone.
- No AI, no telemetry, no account. Run it with `npx`, a global install, a login service (macOS and Linux) or Docker.
