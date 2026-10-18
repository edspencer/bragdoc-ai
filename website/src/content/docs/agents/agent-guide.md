---
title: The agent guide
description: "The agent guide tells coding agents how to work with BragDoc: the MCP tools, the file format, the impact scale and the house style."
---

The agent guide is a document written for coding agents rather than people. It covers:

- when to call `bragdoc_get_context`, and why to search for related achievements before writing a new one;
- the file format, for agents that edit files directly;
- the 1–10 impact scale, so agents rate things the way you would;
- house style: short titles that say what changed, with the evidence attached;
- a paragraph to paste into your agent's instruction file (`CLAUDE.md`, `AGENTS.md`): `bragdoc guide --snippet`.

You can get it three ways:

- `bragdoc guide` prints it in your terminal (it's `AGENT-GUIDE.md` in the package);
- a running BragDoc serves it at `http://localhost:2724/agent-guide.md`;
- and at `http://localhost:2724/llms.txt` (and `/llms-full.txt`), the [llms.txt](https://llmstxt.org) convention for
  telling agents where things are.

This documentation site has its own [`/llms.txt`](/llms.txt) and [`/llms-full.txt`](/llms-full.txt), and every page
is available as Markdown at its URL with `.md` instead of the trailing slash.
