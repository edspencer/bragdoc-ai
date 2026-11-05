---
title: Running as a service
description: "Keep BragDoc running in the background, started when you log in: a LaunchAgent on macOS, a systemd user service on Linux."
---

`bragdoc service install` sets BragDoc up to start when you log in and to restart if it stops: a LaunchAgent on
macOS, a systemd user service on Linux. **Windows isn't supported yet**: there, `bragdoc service` says so and does
nothing. Run `bragdoc` in a terminal instead.

```sh
npm install -g @bragdoc/local
bragdoc service install
```

```text
$ bragdoc service install
Installing BragDoc as a systemd user unit (~/.config/systemd/user/bragdoc.service)…
Waiting for http://localhost:2724 to answer…

BragDoc 0.6.0 is running at http://localhost:2724
Data home: ~/.bragdoc
Logs:      bragdoc service logs (~/.bragdoc/service/bragdoc.log)

It starts when you log in (not when the computer boots), and is restarted if it exits.
```

It starts at **login**, not at boot (except a Linux service with lingering on, below), and runs as the user who
installed it, so install it as yourself, not with `sudo`.

## Installing

```sh
bragdoc service install [--port <n>] [--data-dir <dir>] [--dry-run] [--from-checkout] [--refresh] [--json]
```

- **`--port <n>`** picks the port (default 2724). **`--data-dir <dir>`** picks the data folder; without it, the
  service uses `$BRAGDOC_HOME` if it's set when you install, and otherwise `~/.bragdoc`, the same folder a `bragdoc`
  in a terminal uses.
- **It waits until BragDoc answers** before it returns, for up to 20 seconds. If it doesn't answer by then, it says
  so: it may still be starting, or failing to start, and [the log](#logs) says which.
- **Running it again is safe:** it keeps the port and settings the service already has (its port and data folder),
  unless you give new ones, and restarts the running service onto them. The old process never keeps serving.
- **`--dry-run` prints the unit and writes nothing**: no file, no folder, nothing started.
- **`--refresh`** rewrites the installed service for this BragDoc from what *it* records (its port and data folder),
  not from the shell you run it in, then restarts it. `--port` and `--data-dir` still win. With nothing installed it
  exits 4. It's what [`bragdoc update`](/getting-started/updating/) runs with the new version.
- **`--json`** prints the outcome as one JSON document on stdout ([below](#for-scripts)).
- It refuses to install **from an npx cache** (the folder is temporary), **from a git checkout unless you add
  `--from-checkout`**, and **when something else holds the port** (most likely `bragdoc` running in a terminal: stop
  that first, or pick another port). Each refusal writes nothing.
- If systemd or launchd refuses a first install (no login session to load it into, say), it takes back the file it
  wrote, so `service status` doesn't say it's installed. A refused reinstall keeps the file it had.

### Linux: linger

**Without linger, the service stops when you log out**, and starts only when you log in. With it, the service runs
while you're logged out, and starts at boot. Turn it on once:

```sh
sudo loginctl enable-linger $USER
```

`install` reminds you of it, and [`bragdoc doctor`](/getting-started/updating/#checking-an-install-bragdoc-doctor)
checks, and prints `sudo loginctl enable-linger <user>` when it's off. **BragDoc never runs `sudo` itself.**

### Not from npx

npx keeps its copy of BragDoc in a cache npm can delete at any time, so a service that ran it would break at some later
login. `service install` refuses it (and pnpm dlx, bunx and yarn dlx), writes nothing, and says what to run instead:

```text
$ npx @bragdoc/local service install
bragdoc: BragDoc is running from npx's cache, which npm can delete at any time, so a service pointing there would stop working at some later login. Install it first, then run the installed one:

  npm i -g @bragdoc/local && bragdoc service install
```

### Not from a checkout, unless you mean it

From a clone of the repository, it refuses too: the service would run whatever the checkout last built, and break
when it's cleaned or rebuilt. If that's what you want (you're working on BragDoc itself), build it and add
`--from-checkout`:

```sh
npm run build
node dist/server/cli.js service install --from-checkout
```

A service installed that way is refreshed and restarted from the checkout without the flag again.

## Where things are

| | macOS | Linux |
| --- | --- | --- |
| The unit | `~/Library/LaunchAgents/ai.bragdoc.local.plist` | `~/.config/systemd/user/bragdoc.service` (under `$XDG_CONFIG_HOME` if that's set) |
| The log | `~/.bragdoc/service/bragdoc.log` | the same |

The log is in the data folder, so it's `service/bragdoc.log` under `--data-dir` (or `$BRAGDOC_HOME`) if you installed
with one. That's BragDoc's own place for it: the service's folder in your data, which is also its working directory.

The unit runs this Node and this install's `cli.js` by their real paths, never the `bragdoc` shim (Homebrew's Node by
its `opt/` link, which survives `brew upgrade`). So **if you remove that Node version (nvm, fnm, volta), `service
status` and `doctor` warn, and `service install` again fixes it.** It keeps the port and data folder, and
`service restart` does the same by itself.

The unit's `PATH` is the one you had when you installed it, minus anything that belongs to one terminal or one npm
run, with that Node's own folder first, so the GitHub source finds `git` and `gh`. Nothing else from your environment
is passed on, and nothing secret is written into the unit. It still listens on **127.0.0.1 only**
([Localhost security](/guarantees/localhost-security/)).

## The commands

| Command | |
| --- | --- |
| `bragdoc service install` | Write the unit, start it, and wait until it answers ([Installing](#installing)). |
| `bragdoc service uninstall` | **Stops it and removes the unit. Your data and logs stay.** |
| `bragdoc service start` | Start the installed service, and wait until it answers. |
| `bragdoc service stop [--force]` | **Stops it until `service start`, or the next login or boot. It doesn't disable the service. To keep it off for good, use `service uninstall`.** Refuses while BragDoc is [busy](#busy). |
| `bragdoc service restart [--force]` | Stop it and start it again, rewriting the unit first if its Node or BragDoc has gone. Refuses while BragDoc is [busy](#busy). |
| `bragdoc service status [--json]` | Installed? Running? Which version is installed, and which is answering? The port, the data folder and the log. |
| `bragdoc service logs [-f] [-n <lines>]` | **The last 50 lines; `-f` follows, `-n` sets how many.** |

`start`, `stop`, `restart` and `logs` exit 4 when there's no service installed, and say how to install one.

```text
$ bragdoc service status
Service:   ~/.config/systemd/user/bragdoc.service (a systemd user unit)
State:     running, pid 48213
URL:       http://localhost:2724: BragDoc 0.6.0 is answering
Version:   0.6.0
Data home: ~/.bragdoc
Logs:      bragdoc service logs (~/.bragdoc/service/bragdoc.log)
```

`status` warns when the Node or the BragDoc the service runs has gone, and says when the version answering isn't the
one installed (you upgraded, and the service hasn't restarted since). It also repeats what the last
[`bragdoc update --check`](/getting-started/updating/) or `doctor` found, without asking npm itself.

### For scripts

`service status --json` prints the report as one JSON document: `installed`, `running`, `answering`, `stopped`,
`installedVersion`, `runningVersion`, `port`, `url`, `pid`, `unit`, `log`, `dataDir`, `warnings`, and `update` when
there's a check to repeat.

`install`, `uninstall`, `start`, `stop` and `restart` take `--json` too: one document on stdout, its `ok` and `action`
followed by the same fields as `status --json`, and everything people read on stderr. When it fails, the document still
comes, with `"ok": false` and the reason in `error` (`"busy"` for a refused `stop` or `restart`). The exit code is the
same with or without `--json`. `logs` doesn't take it.

```sh
bragdoc service stop --json | jq .ok
```

## Busy

**`service stop` and `service restart` first ask the running BragDoc whether it's busy**: an import, a judge run, or
AI requests running or waiting. **If it is, they refuse with exit 75 and say what's running. Wait and try again, or
add `--force`, which prints the same message prefixed `Overriding:` and goes ahead.**

```text
$ bragdoc service restart
bragdoc: BragDoc is busy: 1 judge run is running. Try again once it has finished, or use --force.
```

`uninstall` doesn't ask: removing the service is a deliberate act. [`bragdoc busy`](/reference/cli/#bragdoc-busy)
asks the same question on its own (0 not busy, 75 busy, 3 nothing running).

## Logs

One file, `~/.bragdoc/service/bragdoc.log`, which stdout and stderr both append to, on both OSes (not the systemd
journal). **BragDoc rotates it itself** (by copying and truncating, at 10 MB, keeping 1: `bragdoc.1.log`), because the
service manager holds it open: when it starts, and every hour while it runs. `service logs` reads it, and `service
uninstall` leaves it.

A Linux service installed by BragDoc 0.2 or earlier still logs to the journal, and `service logs` reads it from
there, until you run `bragdoc service install` again.

## Exit codes

| Code | |
| --- | --- |
| `0` | Running and answering (`status`); done (the rest). |
| `1` | Failed: refused (npx, a checkout, the port), or the service manager refused. |
| `2` | Usage: an unknown command or option, or an option the command doesn't take. |
| `3` | **Installed but not running or not answering** (`status`). |
| `4` | **Not installed** (`status`, `start`, `stop`, `restart`, `logs`, `install --refresh`). |
| `75` | **Busy** (`stop`, `restart`): try again later, or use `--force`. |

## Updating

`bragdoc update` updates BragDoc and the service with it, and puts the old version back if the new one doesn't start.
See [Updating](/getting-started/updating/).
