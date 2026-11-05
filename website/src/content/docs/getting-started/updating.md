---
title: Updating
description: "`bragdoc update` checks it's safe, installs the new version, starts it again, and puts the old version back if it doesn't answer."
---

```sh
bragdoc update
```

That's the whole thing. It asks npm which version is the latest, asks you to confirm, stops your service, installs
the new version, starts it again, and waits until BragDoc answers as the version it just installed. If that never
happens, it reinstalls the version you were on and says so.

```
BragDoc 0.6.0 is available (you have 0.5.0).
  Run: bragdoc update
  Changes: https://github.com/edspencer/bragdoc-ai/releases/tag/v0.6.0
```

It works with or without the [login service](/getting-started/installation/#keep-it-running). Without one, it
installs the new version, and the next `bragdoc` you start is the new one; if a BragDoc is running in a terminal, it
asks you to stop it first (Ctrl+C), then run `bragdoc update` again.

## Look first

`bragdoc update --check` asks npm, says what it found, and changes nothing. It exits 0 whether or not there's a newer
version; a script reads `updateAvailable` from the JSON instead:

```sh
bragdoc update --check --json
```

`bragdoc doctor` checks the same thing, along with the rest of your install (below).

## Nothing checks by itself

BragDoc never asks for a new version on its own: not the server, not at startup, not in the background, and the app
never shows you one. Only `bragdoc update`, `bragdoc update --check` and `bragdoc doctor` ask, and only when you run
them. `bragdoc doctor --offline` skips that question.

When they do ask, it's two requests to the npm registry (the one npm itself uses: `npm config get registry`, usually
`registry.npmjs.org`), for which version is the latest and which Node that version needs. Both go through BragDoc's
one way out, and both are on the receipt in **Settings → Network activity**, marked "Checking for a new version".
While `bragdoc update` installs, it's npm that downloads the package, from its own process: BragDoc lists each time it
ran npm, marked "via npm", but can't see inside it (the same as with the `gh` CLI). See
[Network activity](/guarantees/network-activity/).

What the last check found is kept in `update-check.json` in your data folder, and `bragdoc service status` repeats it
from there without asking anything.

## While BragDoc is busy

Before it stops anything, `update` asks the running BragDoc whether it's in the middle of something a restart would
cut short: an import, a judge run, or AI requests running or waiting. If it is, it refuses, and says what's running:

```
bragdoc: BragDoc is busy: 1 judge run and 3 AI requests are running. Try again once it has finished, or use --force.
```

Wait, or use `--force`. `--force` skips only that check: the health check and the putting back still happen.
`bragdoc busy` asks the same question on its own (exit 0 not busy, 75 busy, 3 not running).

## Your data, if the new version changes its format

Each kind of file in your data folder has a format version (its `schemaVersion`). When the version you're installing
writes a newer format of any of them, `update` first copies your data (the same files as an automatic backup) into
`backups/pre-<version>/` in your data folder, before the new version starts:

```
  Backed up your data to ~/.bragdoc/backups/pre-0.6.0, before 0.6.0 starts.
```

An older BragDoc shows a file from a newer one but never writes to it, so going back keeps working; the copy is there
in case you want your files exactly as they were. It's yours: BragDoc's automatic backups never remove it.

## Going somewhere particular

```sh
bragdoc update --to 0.5.0     # a version: the only way to go back
bragdoc update --to next      # a dist-tag: the preview releases
```

`update` never goes back by accident. If npm's `latest` is older than what you have, it says so and does nothing, and
a `latest` that points at a prerelease isn't installed unless `--to` names it.

## Without a terminal

`update` asks before it does anything, and asking needs a terminal. In a script, a cron job or an Ansible task, it
exits 2 and says `--yes` is needed, rather than guessing:

```sh
bragdoc update --yes
```

## When it goes wrong

The exit code says what happened:

| Code | What happened | What to do |
| --- | --- | --- |
| 0 | Updated, or already up to date | Nothing. |
| 1 | It couldn't start: npm unreachable, another update running, a Node too old for the new version | Read the message. |
| 2 | There's no terminal to ask, so `--yes` is needed | Add `--yes`. |
| 3 | A BragDoc is running in a terminal, and there's no service to stop | Stop it (Ctrl+C), and run `update` again. |
| 5 | This install can't update itself; the command that would was printed | Run that command. |
| 6 | The new version didn't start. **The old one is running again** | Read the log lines it printed, and [report it](https://github.com/edspencer/bragdoc-ai/issues). |
| 7 | The new version didn't start, **and the old one couldn't be put back** | Run the commands it printed. |
| 75 | BragDoc is busy | Wait, or use `--force`. |

On a failure, `update` prints the last 20 lines of the service's log before it puts the old version back, which is
usually enough to see why the new one didn't come up. A 7 also names the backup from above, if it made one.

## Installs that can't update themselves (exit 5)

BragDoc works out how it was installed, and some installs aren't its to replace. Each prints the command that
would work instead:

| How it was installed | What it says to run |
| --- | --- |
| The Docker image | `docker compose pull && docker compose up -d` (and the image tag) |
| Something else manages it (`BRAGDOC_UPDATE_HINT` is set) | Whatever that variable says. |
| `npx` (or `pnpm dlx`, `bunx`) | Nothing to update: `npx @bragdoc/local@latest` already runs the latest. |
| A checkout of the repository | `git pull && npm install && npm run build` |
| A dependency of another project | Update it in that project. |

A global install with **npm**, **pnpm**, **bun** or **volta** updates in place, with the same package manager. If
npm's global folder isn't yours to write to, `update` prints the command with `sudo` and exits 5. **It never runs
`sudo` itself.**

## In Docker

Nothing installs anything inside a container. The image sets `BRAGDOC_IN_DOCKER=1` and has `bragdoc` on its `PATH`,
so asking from inside prints the image to pull:

```sh
docker exec bragdoc bragdoc update --check
```

```
BragDoc 0.6.0 is available (you have 0.5.0).
  Run: docker compose pull && docker compose up -d    (image ghcr.io/edspencer/bragdoc:0.6.0)
```

### Watchtower

[Watchtower](https://containrrr.dev/watchtower/) can wait for a quiet moment. Turn on its lifecycle hooks
(`WATCHTOWER_LIFECYCLE_HOOKS=1`) and give the BragDoc container this label (`compose.yaml` has it, commented out):

```yaml
labels:
  com.centurylinklabs.watchtower.lifecycle.pre-update: "bragdoc busy"
```

Before it replaces the container, Watchtower runs `bragdoc busy` inside it. While BragDoc is busy, that exits 75, and
Watchtower skips the update until its next run.

## Checking an install: `bragdoc doctor`

```sh
bragdoc doctor
```

```
✓ Node 22.12.0 (BragDoc needs >=22.12).
✓ BragDoc is installed globally with npm (~/.npm-global/lib/node_modules/@bragdoc/local). `bragdoc update` can update it.
✓ The service (~/.config/systemd/user/bragdoc.service) runs this BragDoc, with Node /usr/bin/node.
✓ The service is running 0.5.0, the installed version.
✓ Port 2724 is BragDoc's (0.5.0).
! Lingering is off for someone: the service stops when you log out, and starts at your next login.
    fix: sudo loginctl enable-linger someone
✓ The data home (~/.bragdoc) is writable.
✓ ~/.bragdoc/config.yaml is valid.
✓ git is installed.
✓ BragDoc 0.5.0 is the latest.

No problems found, 1 warning.
```

It checks the Node, how BragDoc was installed, the service (whether its Node and BragDoc are still there, and whether
it's the BragDoc you ran `doctor` with), that the running version is the installed one, the port, lingering (Linux),
that the data folder is writable, `config.yaml`, `git` (and `gh`, if the GitHub source uses it), and whether there's a
newer version. Each problem has a `fix:` line under it. It exits 1 if anything failed; warnings don't change that.
`--json` prints the same as one JSON document, and `--offline` skips the newer-version check.

## What it does, step by step

Worth knowing if you're automating around it, or if it stops half way:

1. takes `update.lock` in your data folder, so two updates can't run at once;
2. works out how this copy was installed;
3. asks npm for the version to install and the Node it needs;
4. compares them, and stops here with `--check`;
5. checks npm's global folder is writable;
6. asks the running BragDoc whether it's busy, before anything is stopped;
7. asks you, unless `--yes`;
8. fetches both the new version and the one you have into npm's cache, while the old one is still running (so a
   network failure happens before anything stops, and going back doesn't need the network);
9. stops the service, and waits until it has;
10. installs, with the package manager it was installed with;
11. if the new version writes a newer data format, copies your data to `backups/pre-<version>/`;
12. hands over to the new version: it re-writes the service (`bragdoc service install --refresh`, which keeps its
    port and data folder) and starts it;
13. waits until BragDoc answers as the new version;
14. if anything from step 10 on fails, puts the old version back and checks it answers (exit 6), or says what to run
    (exit 7).
