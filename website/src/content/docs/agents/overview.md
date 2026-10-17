---
title: Working with agents
description: "Your coding agent can log achievements as you work, over MCP or simply by editing BragDoc's files."
---

:::note[Coming in v0.1]
The MCP server and the agent guide are being built. This page describes the design.
:::

Your coding agent was there when you shipped the thing. It knows which pull request it was, what it fixed and why it
mattered, so it is well placed to write it down. BragDoc gives it three ways in.

## 1. MCP

BragDoc's [MCP server](/agents/mcp/) lets Claude Code, or any client that speaks the Model Context Protocol, read your
projects and recent achievements and add new ones. One command sets it up for Claude Code:

```sh
bragdoc mcp install claude
```

Achievements an agent writes are labelled on the board ("Written by Claude Code"). By default they go straight to the
board; set `mcp.writeTo: found` in [config.yaml](/reference/config-yaml/) to review each one in Found first.

## 2. The files

Everything BragDoc knows is a [plain file](/concepts/your-data-is-files/), so an agent that can edit files can add an
achievement by writing one, and BragDoc picks it up live. No plugin or API key needed. The format is in
[The data folder](/reference/data-folder/).

## 3. The agent guide

`bragdoc guide` prints a guide written for agents: how to call the tools, the file format, the impact scale and the
house style. A running BragDoc also serves it at `/agent-guide.md` and `/llms.txt`. See
[The agent guide](/agents/agent-guide/).

## What an agent can't do

The MCP server writes through the same path as the app, with the same checks. It can attach a local file as evidence
only if it's a regular file of an accepted type and size, and never one from inside the data folder itself or from a
hidden directory. MCP requests need a per-install token that only you and the agents you set up have.
