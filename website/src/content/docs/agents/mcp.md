---
title: MCP server
description: "BragDoc's MCP server lets coding agents read your context and write achievements, over HTTP at /mcp or through a stdio shim."
---

BragDoc serves the [Model Context Protocol](https://modelcontextprotocol.io) at `http://127.0.0.1:2724/mcp`
(stateless Streamable HTTP). Every request needs the per-install bearer token from `runtime.json` in your data
folder; Host and Origin are checked as for the rest of BragDoc, so a web page can't reach it. For clients that only
speak stdio, `bragdoc mcp` is a small bridge that forwards to the running server, reading the address and token from
`runtime.json` itself; if BragDoc isn't running, it says so and exits.

## Setting it up

For Claude Code:

```sh
bragdoc mcp install claude            # registers http://127.0.0.1:2724/mcp with the token
bragdoc mcp install claude --stdio    # or registers `bragdoc mcp` instead
bragdoc mcp install claude --print    # prints config for Claude Desktop, Cursor and others; changes nothing
```

Running it again replaces the registration: do that after rotating the token. `--stdio` never needs re-running,
because the bridge reads the current token each time it starts.

## Tools

| Tool | What it does |
| --- | --- |
| `bragdoc_get_context` | Call this first: your profile, active projects, tracked repos, the last 20 achievements, the impact scale and house style. |
| `bragdoc_search_achievements` | Full-text search over your achievements, with filters (project, repo, dates, source). |
| `bragdoc_get_achievement` | One achievement in full, with its `etag`. |
| `bragdoc_add_achievement` | Adds an achievement, with evidence (links, pull requests, quotes, files). Adding the same `externalKey` (or the same pull request) twice is a no-op. |
| `bragdoc_update_achievement` | Changes an achievement. |
| `bragdoc_attach_evidence` | Attaches a URL, a pull request, a quote, or a local file (a regular file of at most 25 MB: an image, PDF, document, text file or video). |
| `bragdoc_list_projects` | Lists projects. |
| `bragdoc_upsert_project` | Creates or updates a project. |
| `bragdoc_list_repos` | Lists repos. |
| `bragdoc_link_repo` | Adds a repo, or links one to a project. |
| `bragdoc_add_found` | Sends a candidate to [Found](/concepts/found-and-sources/) for you to review. |

There is also a resource, `bragdoc://context`, and two prompts, `log-this` and `weekly-recap`.

## Provenance

Every write from MCP is recorded with `source: mcp` and the name of the agent that wrote it (from the
`X-BragDoc-Client` header that `mcp install` sets, or the client's own name), which the board shows as a badge. Writes go to the board by default, or to Found with `mcp.writeTo: found`.
