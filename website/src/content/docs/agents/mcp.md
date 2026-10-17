---
title: MCP server
description: "BragDoc's MCP server lets coding agents read your context and write achievements, over HTTP at /mcp or through a stdio shim."
---

:::note[Coming in v0.1]
The MCP server is being built. The tool names below are from the specification and may still change.
:::

BragDoc serves the [Model Context Protocol](https://modelcontextprotocol.io) at `http://127.0.0.1:2724/mcp`
(stateless Streamable HTTP). Every request needs the per-install bearer token from `runtime.json` in your data
folder. For clients that only speak stdio, `bragdoc mcp` is a small shim that forwards to the running server; if
BragDoc isn't running, it says so.

## Setting it up

For Claude Code:

```sh
bragdoc mcp install claude            # registers http://127.0.0.1:2724/mcp with the token
bragdoc mcp install claude --stdio    # or registers `bragdoc mcp` instead
bragdoc mcp install claude --print    # prints config snippets for other clients; writes nothing
```

## Tools

| Tool | What it does |
| --- | --- |
| `bragdoc_get_context` | Call this first: your profile, active projects, tracked repos, the last 20 achievements, the impact scale and house style. |
| `bragdoc_search_achievements` | Full-text search over your achievements. |
| `bragdoc_add_achievement` | Adds an achievement. Adding the same `external_key` twice is a no-op. |
| `bragdoc_update_achievement` | Changes an achievement. |
| `bragdoc_attach_evidence` | Attaches a URL, a pull request, or a local file. |
| `bragdoc_list_projects` | Lists projects. |
| `bragdoc_upsert_project` | Creates or updates a project. |
| `bragdoc_list_repos` | Lists repos. |
| `bragdoc_link_repo` | Adds a repo, or links one to a project. |
| `bragdoc_add_found` | Sends a candidate to [Found](/concepts/found-and-sources/) for you to review. |

There is also a resource, `bragdoc://context`, and two prompts, `log-this` and `weekly-recap`.

## Provenance

Every write from MCP is recorded with `source: mcp` and the name of the agent that wrote it, which the board shows as
a badge. Writes go to the board by default, or to Found with `mcp.writeTo: found`.
