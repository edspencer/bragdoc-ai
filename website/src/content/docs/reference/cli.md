---
title: CLI
description: "Every bragdoc command and option: serve, service, update, doctor, busy, guide, mcp, import and dev, with exit codes."
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
prints `BragDoc 0.4.0: http://localhost:2724` (its version, then its address) once it's listening.

| Option | Meaning |
| --- | --- |
| `--port <n>` | The port. Default 2724, or `$PORT`. Never changed for you: if it's taken, BragDoc says so (and what might be holding it) and exits. |
| `--host <addr>` | The address to listen on. Default `127.0.0.1`. Anything but a loopback address is refused unless `BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1`. |
| `--data-dir <dir>` | The data folder. Default `$BRAGDOC_HOME`, else `~/.bragdoc`. |
| `--open` | Open it in your browser once it's listening. |
| `--quiet`, `-q` | Print only the first line, `BragDoc <version>: <url>`. |

## `bragdoc service`

Runs BragDoc in the background as a login service: a LaunchAgent on macOS, a systemd user unit on Linux. It starts
when you log in (not when the computer boots), runs as you, and is restarted if it exits. It needs an installed
`bragdoc` (`npm install -g @bragdoc/local`), not `npx`. Not supported on Windows yet.

| Command | What it does |
| --- | --- |
| `bragdoc service install` | Install and start it. Takes `--port`, `--data-dir`, and `--dry-run` (print the service definition and write nothing). Over a running service, it replaces it. *From 0.5.0,* `--refresh` re-writes the installed service for this BragDoc, keeping the port and data folder it records (what [`bragdoc update`](#bragdoc-update) runs); with none installed it exits 4. |
| `bragdoc service status` | Whether it's installed, running and answering; the version installed and the version running; the port, the data folder and the log. `--json` prints the same as one JSON document. |
| `bragdoc service start` | Start it, and wait until it answers. |
| `bragdoc service stop` | Stop it until the next login. It stays installed and enabled, as `systemctl --user stop` and `launchctl bootout` leave it; to keep it off for good, uninstall it. Refused while BragDoc is [busy](#bragdoc-busy), unless `--force`. |
| `bragdoc service restart` | Restart it. Refused while BragDoc is [busy](#bragdoc-busy), unless `--force`. *From 0.5.0,* if the Node or the BragDoc the service runs has gone (or it's an older format), it re-writes the service for this BragDoc first. |
| `bragdoc service logs` | Print the last 50 lines of its log. `-f` (`--follow`) keeps printing what it writes; `-n <lines>` (`--lines`) prints another number of lines. |
| `bragdoc service uninstall` | Stop it and remove the service. Your data and its log stay. |

**Its log** is one file, `<data folder>/service/bragdoc.log`, on macOS and Linux alike: the service's output is
appended to it, not sent to the systemd journal. BragDoc rotates it itself: past 10 MB it's copied to `bragdoc.1.log`
(replacing the older copy) and emptied. A Linux service installed by BragDoc 0.2 or earlier still logs to the journal,
and `bragdoc service logs` reads it from there, until you run `bragdoc service install` again.

**Exit codes:** `service status` exits 0 when BragDoc is answering, 3 when it's installed but not running or not
answering, and 4 when it isn't installed, with or without `--json`. `start`, `stop`, `restart` and `logs` exit 4 when
it isn't installed. These are the same codes `systemctl status` uses, so a script can tell the cases apart.

**Busy:** *from 0.4.0,* `stop` and `restart` first ask the running BragDoc whether it's in the middle of something a
restart would cut short, the same question as [`bragdoc busy`](#bragdoc-busy). If it is, they say what, change
nothing, and exit 75: `BragDoc is busy: 1 judge run is running. Try again once it has finished, or use --force.` With
`--force` they print the same sentence, starting `Overriding:`, and go ahead. `uninstall` doesn't ask.

## `bragdoc update`

*From 0.5.0.* Updates BragDoc to the latest version from npm: checks it's safe, stops the service, installs, starts
it again, waits until the new version answers, and puts the old version back if it doesn't. It asks npm only when you
run it. The whole story, exit codes included, is [Updating](/getting-started/updating/). `upgrade` works too.

| Option | Meaning |
| --- | --- |
| `--check` | Say whether there's a newer version, and change nothing. Exits 0 either way. |
| `--to <version\|tag>` | Go to this version, or this dist-tag (`next`). The only way to go to an older version. |
| `--yes` | Don't ask first. Needed without a terminal (a script): without it, `update` exits 2. |
| `--force` | Go ahead while BragDoc is [busy](#bragdoc-busy). The health check and the putting back still happen. |
| `--json` | One JSON document on stdout; everything else on stderr. |

**Exit codes:** 0 updated or up to date, 1 failed before changing anything, 2 `--yes` needed, 3 a BragDoc in a
terminal is running (stop it first), 5 this install can't update itself (the command that would is printed), 6 the
new version didn't start and the old one is running again, 7 it didn't start and the old one couldn't be put back
(what to run is printed), 75 busy.

## `bragdoc doctor`

*From 0.5.0.* Checks this install, with a `fix:` for each problem: the Node, how it was installed, the service (its
Node and BragDoc still there, and the BragDoc you're running), that the running version is the installed one, the
port, lingering (Linux), that the data folder is writable, `config.yaml`, `git` (and `gh`, if the GitHub source uses
it), and whether there's a newer version. Each line starts `✓`, `!` (a warning) or `✗` (a problem). Exits 1 if
there's a problem; warnings don't change that.

| Option | Meaning |
| --- | --- |
| `--offline` | Don't ask npm about a newer version: nothing leaves this computer. |
| `--json` | The checks as one JSON document on stdout (`ok`, `version`, and each check's `id`, `status`, `message` and `fix`). |

## `bragdoc busy`

*From 0.4.0.* Asks the running BragDoc whether it's busy: importing, running the [judge](/ai/the-judge/), or with AI
requests running or waiting. It's for scripts, and for a Docker update hook (`docker exec <container> bragdoc busy`),
where there's no `service` to ask. It finds BragDoc through `runtime.json` in the data folder.

| Option | Meaning |
| --- | --- |
| `--json` | Print the answer as one JSON document: `running`, `busy`, `url`, `version` and `counts` (`import`, `judge`, `ai`). |
| `--data-dir <dir>` | The data folder to find it by (default `$BRAGDOC_HOME`, else `~/.bragdoc`). |
| `--port <n>` | Ask the BragDoc on this port instead. |

**Exit codes:** 0 when it isn't busy, 75 when it is, 3 when nothing is running, and 1 when something answered that
isn't BragDoc's busy check (an older BragDoc, say).

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

`bragdoc dev ai --connection <id> --model <name> "<prompt>"` (*from 0.2.0*) asks one model one question,
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

**Exit codes:** 0 success, 1 error, 2 usage error (with the usage printed): an unknown option, or one the command
doesn't take. `bragdoc service` adds 3 (not running) and 4 (not installed), `update` adds 5, 6 and 7, and `busy`,
`update`, `service stop` and `service restart` add 75 (busy), above.

**What `serve` prints:** the first line is always `BragDoc <version>: <url>` (`BragDoc 0.4.0: http://localhost:2724`),
then `Data home: <folder>`. In a terminal (or with `FORCE_COLOR` set) a banner and a hint follow, and, when it's
running from npx's cache, how to keep it running with an installed copy. With `--quiet`, only the first line. Warnings
go to stderr, never stdout, so a script can wait for that first line. *Before 0.4.0 it was `BragDoc on <url>`, with a
`Version:` line after the data folder.*
