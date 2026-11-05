---
title: What's new
description: "What changed in each BragDoc release, newest first."
---

## 0.4.0: busy, and serve's first line

More of the [CLI contract](https://github.com/edspencer/cli-contract) Ed's local tools share.

- **`bragdoc busy`** says whether the running BragDoc is in the middle of something a restart would cut short: an
  import, a judge run, or AI requests. It exits 0 when it isn't, 75 when it is, and 3 when nothing is running, for
  scripts and Docker update hooks. See [the CLI reference](/reference/cli/#bragdoc-busy).
- **`bragdoc service stop` and `restart` won't cut that work short:** while BragDoc is busy they say what's running
  and exit 75. `--force` stops or restarts it all the same.
- **`serve`'s first line is now `BragDoc <version>: <url>`**, where it was `BragDoc on <url>`. A script that waits for
  the old line needs to look for the new one. The `Version:` line after the data folder has gone: the version is in
  the first line.
- **`bragdoc service restart` on macOS** waits for launchd to let the old process go before starting the new one,
  rather than retrying until it has.

## 0.3.0: the service, by the CLI contract

`bragdoc service` now follows the same [CLI contract](https://github.com/edspencer/cli-contract) as Ed's other local
tools. See [the CLI reference](/reference/cli/#bragdoc-service).

- **`bragdoc service status` has exit codes a script can use:** 0 when BragDoc is answering, 3 when it's installed but
  not running, and 4 when it isn't installed. `--json` prints the report as JSON, with the installed and running
  versions. `start`, `stop`, `restart` and `logs` exit 4 when there's no service.
- **On Linux, the service logs to a file**, `~/.bragdoc/service/bragdoc.log`, as on macOS, rotated at 10 MB. Run
  `bragdoc service install` once to switch an existing service over.
- **`bragdoc service logs` prints the last 50 lines.** `-f` follows the log, and `-n` sets how many lines.

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
