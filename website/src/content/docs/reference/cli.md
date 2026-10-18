---
title: CLI
description: "Every bragdoc command and option: serve, service, guide, mcp, import and dev, with exit codes."
---

:::note[Tracking `next`]
This reference follows the [`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next), where v0.1 is built.
`bragdoc --help` is always the last word for the version you have.
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
| `bragdoc mcp install claude --print` | Prints configuration for Claude Code, Claude Desktop, Cursor and other clients, and changes nothing. |
| `--port <n>`, `--data-dir <dir>` | The port to register (default: the one BragDoc last ran on), and the data folder whose token to use. |

`install claude` replaces an existing `bragdoc` registration, and sets an `X-BragDoc-Client: claude-code` header so
the board can say which agent wrote what. Without `--stdio`, it needs the token, so BragDoc must have run at least
once with that data folder; otherwise it says so and exits 1.

## `bragdoc import <export.json>`

Imports an export from the hosted BragDoc app (its version 1.0 JSON file): companies, projects and their repos,
achievements, and documents as read-only files. Importing the same file again adds nothing. If BragDoc is running,
the import goes through it (so it stays the one writer); otherwise it writes to the data folder directly. See
[Moving from the hosted app](/moving-from-the-hosted-app/).

| Option | Meaning |
| --- | --- |
| `--dry-run` | Say what would be added, what's already here and what can't be imported, list the fields left behind and why, and change nothing. |
| `--data-dir <dir>` | The data folder to import into (default `$BRAGDOC_HOME`, else `~/.bragdoc`). |

When it goes through the running BragDoc it says so (on stderr), and it ends by naming the data folder. A file that
isn't a version 1.0 export (not JSON, cut off part-way, or another version) is refused with exit code 1, and nothing
is imported. Problems with single items (an achievement with no date, a project whose company isn't in
the file) are listed, and everything else is imported.

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

It exits 1 if any image can't be read. `--aliases` and `--not-me` without `--name` are a usage error.

`bragdoc dev ai --connection <id> --model <name> "<prompt>"` (*being built for v0.2*) asks one model one question,
through the same path every AI feature uses: your `config.yaml`'s AI settings and connections, the keys in
`secrets.yaml`, and the outbound allow-list. It prints the answer as it arrives, then how long it took and where it
went (this computer, your network or the internet). It's refused, with nothing sent, exactly when the app would refuse:
with AI off, for a cloud connection you haven't consented to, or without a key. The call is in Network activity like
any other.

| Option | Meaning |
| --- | --- |
| `--connection <id>` | Which connection (an id under `ai.connections`). Required. |
| `--model <name>` | Which model on it. Required. |
| `--schema <name>` | Ask for a structured answer: `ok`, `answer` or `lastLine`. It says whether the model kept to the schema, or the server could only do JSON mode. |
| `--file <file>` | Read the prompt from a file instead. |
| `--system <text>` | The instructions to give it. |
| `--data-dir <dir>` | The data folder whose settings to use. |
| `--json` | Print the answer and the details as JSON. |

It exits 1 when the call is refused or fails, with the reason (`ai_off`, `not_consented`, `unreachable`, `timeout`, …).

## Everywhere

| Option | Meaning |
| --- | --- |
| `--version`, `-v` | Print the version. |
| `--help`, `-h` | Print the help. |

**Exit codes:** 0 success, 1 error, 2 usage error (with the usage printed).

**What `serve` prints:** the first line is always `BragDoc on <url>`, then `Data home: <folder>`. In a terminal (or
with `FORCE_COLOR` set) a banner and a hint follow, and, when it's running from npx's cache, how to keep it running
with an installed copy; otherwise just a `Version:` line. With `--quiet`, only the first line.
