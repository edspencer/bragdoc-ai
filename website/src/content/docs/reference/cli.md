---
title: CLI
description: "Every bragdoc command and option: serve, service, guide, mcp, import and dev, with exit codes."
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

Prints the [agent guide](/agents/agent-guide/), the document that tells coding agents how to work with BragDoc.

## `bragdoc mcp`

*Coming in v0.1.* The [MCP](/agents/mcp/) stdio shim: forwards an MCP client's requests to the running BragDoc. If
BragDoc isn't running, it says so.

| Command | What it does |
| --- | --- |
| `bragdoc mcp install claude` | Registers BragDoc's MCP server with Claude Code (`claude mcp add`, user scope), with its token. |
| `bragdoc mcp install claude --stdio` | Registers `bragdoc mcp` instead of the HTTP endpoint. |
| `bragdoc mcp install claude --print` | Prints configuration for other clients and writes nothing. |

## `bragdoc import <export.json>`

*Coming in v0.1.* Imports an export from the hosted BragDoc app. See
[Moving from the hosted app](/moving-from-the-hosted-app/).

| Option | Meaning |
| --- | --- |
| `--dry-run` | Count what would be imported and list any problems, and change nothing. |

## `bragdoc dev`

Tools for checking BragDoc's own machinery. They read and change nothing, and aren't listed in `--help`.

`bragdoc dev ocr <image>…` reads the text in each screenshot, on your machine, the way the
[screenshots source](/concepts/found-and-sources/#a-screenshots-folder) will. It shows which engine read it (Apple
Vision on macOS where it works, otherwise the bundled Tesseract), the text, and what the screenshot rules made of
it: which rules matched, the quote, and why anything was set aside. The rules use the name and nicknames in your
profile, or the options below.

| Option | Meaning |
| --- | --- |
| `--engine <name>` | `auto` (the default), `tesseract` or `vision`. |
| `--name <name>` | Check the rules for this name instead of your profile's. |
| `--aliases <a,b>` | With `--name`: nicknames, handles and initials, comma-separated. |
| `--not-me <a,b>` | With `--name`: names that look like yours but aren't you. |
| `--data-dir <dir>` | The data folder whose profile to use. |
| `--json` | Print the results as JSON. |

## Everywhere

| Option | Meaning |
| --- | --- |
| `--version`, `-v` | Print the version. |
| `--help`, `-h` | Print the help. |

**Exit codes:** 0 success, 1 error, 2 usage error (with the usage printed). The startup banner is only printed when
the output is a terminal.
