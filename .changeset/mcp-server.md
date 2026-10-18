---
"@bragdoc/local": patch
---

Your coding agent can now read and write BragDoc over MCP. `bragdoc mcp install claude` registers it with Claude Code;
then "note this in my BragDoc" works: the agent reads your context first (`bragdoc_get_context`), searches for
duplicates, and what it writes goes on the board marked "Written by Claude Code" (or to Found, with
`mcp.writeTo: found`). `bragdoc mcp` is a stdio bridge for other clients, `--print` shows their config, and
`bragdoc guide` prints the guide for agents (also served at `/agent-guide.md` and `/llms.txt`).
