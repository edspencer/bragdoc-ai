---
title: CLI
description: "Every bragdoc command and option: serve, service, guide, mcp and import, with exit codes."
---

:::note[Tracking `next`]
This reference follows the [`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next), where v0.1 is being
built. Commands marked *coming in v0.1* don't exist yet. `bragdoc --help` is always the last word for the version you
have.
:::

```
bragdoc [command] [options]
```

## `bragdoc serve`

The default: `bragdoc` on its own does the same. Runs BragDoc in the foreground, serving the web app and its API, and
prints `BragDoc on http://localhost:2724` once it's listening.

| Option | Meaning |
| --- | --- |
| `--port <n>` | The port. Default 2724, or `$PORT`. Never changed for you: if it's taken, BragDoc says so (and what might be holding it) and exits. |
| `--host <addr>` | The address to listen on. Default `127.0.0.1`. Anything but a loopback address is refused unless `BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1`. |
| `--data-dir <dir>` | The data folder. Default `$BRAGDOC_HOME`, else `~/.bragdoc`. |
| `--open` | Open it in your browser once it's listening. |
| `--quiet`, `-q` | Print only the `BragDoc on <url>` line. |

## `bragdoc service`

Runs BragDoc in the background as a login service: a LaunchAgent on macOS, a systemd user unit on Linux. It starts
when you log in (not when the computer boots), runs as you, and is restarted if it exits. It needs an installed
`bragdoc` (`npm install -g @bragdoc/local`), not `npx`. Not supported on Windows yet.

| Command | What it does |
| --- | --- |
| `bragdoc service install` | Install and start it. Takes `--port`, `--data-dir`, and `--dry-run` (print the service definition and write nothing). |
| `bragdoc service status` | Whether it's installed and running, and on which port. |
| `bragdoc service start` | Start it. |
| `bragdoc service stop` | Stop it until the next login. |
| `bragdoc service restart` | Restart it. |
| `bragdoc service logs` | Follow its output. |
| `bragdoc service uninstall` | Stop it and remove the service. Your data stays. |

## `bragdoc guide`

Prints the [agent guide](/agents/agent-guide/), the document that tells coding agents how to work with BragDoc. It works
without BragDoc running. `--snippet` prints just the paragraph for your agent's instruction file.

## `bragdoc mcp`

The [MCP](/agents/mcp/) stdio bridge: forwards an MCP client's requests to the running BragDoc, with the address and
token from `runtime.json`. If BragDoc isn't running, it says so and exits 1. `--data-dir <dir>` picks the data folder
to find it by.

| Command | What it does |
| --- | --- |
| `bragdoc mcp install claude` | Registers BragDoc's MCP server with Claude Code (`claude mcp add`, user scope), with its token. |
| `bragdoc mcp install claude --stdio` | Registers `bragdoc mcp` instead of the HTTP endpoint. |
| `bragdoc mcp install claude --print` | Prints configuration for Claude Desktop, Cursor and other clients, and changes nothing. |
| `--port <n>`, `--data-dir <dir>` | The port to register (default: the one BragDoc last ran on), and the data folder whose token to use. |

## `bragdoc import <export.json>`

Imports an export from the hosted BragDoc app (its version 1.0 JSON file): companies, projects and their repos,
achievements, and documents as read-only files. Importing the same file again adds nothing. If BragDoc is running,
the import goes through it (so it stays the one writer); otherwise it writes to the data folder directly. See
[Moving from the hosted app](/moving-from-the-hosted-app/).

| Option | Meaning |
| --- | --- |
| `--dry-run` | Say what would be added, what's already here and what can't be imported, list the fields left behind and why, and change nothing. |
| `--data-dir <dir>` | The data folder to import into (default `$BRAGDOC_HOME`, else `~/.bragdoc`). |

A file that isn't a version 1.0 export (not JSON, cut off part-way, or another version) is refused with exit code 1,
and nothing is imported. Problems with single items (an achievement with no date, a project whose company isn't in
the file) are listed, and everything else is imported.

## Everywhere

| Option | Meaning |
| --- | --- |
| `--version`, `-v` | Print the version. |
| `--help`, `-h` | Print the help. |

**Exit codes:** 0 success, 1 error, 2 usage error (with the usage printed). The startup banner is only printed when
the output is a terminal.
