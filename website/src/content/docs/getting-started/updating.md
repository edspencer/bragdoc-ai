---
title: Updating
description: "`bragdoc update` checks it's safe, installs the new version, starts it again, and puts the old version back if it doesn't answer."
---

```sh
bragdoc update
```

That's the whole thing. It **asks the registry for the latest version, checks whether BragDoc is busy, asks you to
confirm, downloads the new version first (while the old one is still running), stops the service, installs, starts the
new version and waits until it answers.** If anything from the install on fails, it puts the old version back.

```
BragDoc 0.6.0 is available (you have 0.5.0).
  Run: bragdoc update
  Changes: https://github.com/edspencer/bragdoc-ai/releases/tag/v0.6.0
```

It works with or without the [login service](/getting-started/running-as-a-service/). Without one, it
installs the new version, and the next `bragdoc` you start is the new one. If a BragDoc is answering in a terminal, it
asks you to stop it first (Ctrl+C) and exits 3; run `bragdoc update` again once it's stopped.

## Options

- **`--check`** reports and changes nothing. It exits 0 whether or not there's an update; with `--json`, read
  `updateAvailable`.
- **`--to <version|tag>`**: a version or a dist-tag (`next`). It's the only way to move to a lower version.
- **`--yes`** skips the question. Without a terminal (a script, cron), `--yes` is required, or `update` exits 2.
- **`--force`** skips the busy check, and nothing else: the health check and the rollback still run.
- **`--json`**: one JSON document on stdout; prose on stderr.

## Look first

`bragdoc update --check` asks npm, says what it found, and changes nothing. It exits 0 whether or not there's a newer
version; a script reads `updateAvailable` from the JSON instead:

```sh
bragdoc update --check --json
```

`bragdoc doctor` checks the same thing, along with the rest of your install (below).

## Nothing checks by itself

**BragDoc never checks for updates by itself. Only `update`, `update --check` and `doctor` ask the registry, and only
when you run them. `service status` repeats what the last of those found.** Not the server, not at startup, not in
the background, and the app never shows you a new version. `bragdoc doctor --offline` skips that question.

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
cut short: an import, a judge run, or AI requests running or waiting. **If BragDoc is busy, `update` refuses with exit
75 before anything is stopped**, and says what's running:

```
bragdoc: BragDoc is busy: 1 judge run and 3 AI requests are running. Try again once it has finished, or use --force.
```

Wait, or use `--force`, which skips the busy check, and nothing else: the health check and the rollback still run.
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

`update` asks before it does anything, and asking needs a terminal. **Without a terminal (a script, cron, an Ansible
task), `--yes` is required, or `update` exits 2** and says so, rather than guessing:

```sh
bragdoc update --yes
```

## If the new version doesn't start

**`update` waits up to 30 seconds for the new version to answer. If it doesn't, it prints the last 20 lines of the
log, reinstalls the old version and checks that it answers: exit 6, "0.6.0 didn't start; 0.5.0 is running again." If
the old version doesn't come back either, it exits 7 and prints the commands to run by hand.**

## When it goes wrong

The exit code says what happened:

| Code | What happened | What to do |
| --- | --- | --- |
| 0 | Updated, or already up to date | Nothing. |
| 1 | It couldn't start: npm unreachable, another update running, a Node too old for the new version | Read the message. |
| 2 | Usage: an unknown option or a bad value; or there's no terminal to ask, so `--yes` is needed | Read the message; add `--yes`. |
| 3 | A BragDoc is running in a terminal, and there's no service to stop | Stop it (Ctrl+C), and run `update` again. |
| 5 | This install can't update itself; the command that would was printed | Run that command. |
| 6 | The new version didn't start. **The old one is running again** | Read the log lines it printed, and [report it](https://github.com/edspencer/bragdoc-ai/issues). |
| 7 | The new version didn't start, **and the old one couldn't be put back** | Run the commands it printed. |
| 75 | BragDoc is busy | Wait, or use `--force`. |

The log lines `update` prints on a failure are usually enough to see why the new one didn't come up. A 7 also names
the backup from above, if it made one.

## Installs that can't update themselves (exit 5)

BragDoc works out how it was installed, and some installs aren't its to replace. Each prints the command that
would work instead:

| How it was installed | What it says to run |
| --- | --- |
| The Docker image | `docker compose pull && docker compose up -d` (and the image tag) |
| Something else manages it (`BRAGDOC_UPDATE_HINT` is set) | Whatever that variable says. |
| `npx` (or `pnpm dlx`, `bunx`) | Nothing to update: `npx @bragdoc/local@latest` already runs the latest. |
| A checkout of the repository | `git pull && npm install && npm run build` |
| A global folder you can't write to | The same command with `sudo`. |
| yarn global | `yarn global add @bragdoc/local@<version>`: update it the way you installed it. |
| A dependency of another project | Update it in that project. |

A global install with **npm**, **pnpm**, **bun** or **volta** updates in place, with the same package manager.
**BragDoc never runs `sudo` itself.**

**A managed install: if `BRAGDOC_UPDATE_HINT` is set, `update` prints it and exits 5.** Set it in the environment of
an install something else manages (an Ansible role, a NixOS module), so nobody updates it by hand:

```sh
export BRAGDOC_UPDATE_HINT="This BragDoc is managed by Ansible: run the bragdoc playbook to update it."
```

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
(`WATCHTOWER_LIFECYCLE_HOOKS=true`) and give the BragDoc container this label (`compose.yaml` has it, commented out):

```yaml
labels:
  com.centurylinklabs.watchtower.lifecycle.pre-update: "bragdoc busy"
```

Before it replaces the container, Watchtower runs `bragdoc busy` inside it. **When BragDoc is busy the hook exits 75
and Watchtower skips the update until its next run.**

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
