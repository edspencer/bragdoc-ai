---
"@bragdoc/local": minor
---

**`bragdoc update`** updates BragDoc to the latest version from npm, and the login service with it. It checks
BragDoc isn't busy (an import, a judge run, AI requests) before stopping anything, installs, starts it again, waits
until the new version answers, and puts the old version back if it doesn't. `--check` says whether there's a newer
version and changes nothing; `--to <version|tag>` goes somewhere particular (the only way back); `--yes` is needed
without a terminal; `--json` prints one document. If the new version writes a newer format of your files, your data
is first copied to `backups/pre-<version>/`. A Docker, npx or checkout install says what to run instead (exit 5).

**`bragdoc doctor`** checks your install, with a fix for each problem: Node, how it was installed, the service, the
running version, the port, lingering on Linux, the data folder, `config.yaml`, `git` and `gh`, and whether there's a
newer version (`--offline` skips that one; `--json` for scripts).

Nothing checks for a new version by itself: only `update`, `update --check` and `doctor` ask the npm registry, when
you run them, and Settings → Network activity lists those requests. `service status` repeats what the last check
found.

Also: `bragdoc service install --refresh` re-writes the installed service for this BragDoc, keeping its port and data
folder. `service install` over a running service now restarts it, even when nothing in the service changed (it used
to leave the old process serving). `service restart` re-writes a service whose Node or BragDoc has gone before
restarting it, and `start` and `restart` clear systemd's failed state first. The Docker image has `bragdoc` on its
`PATH`, so a Watchtower pre-update hook can run `bragdoc busy`.

**For scripts:** `update` adds the exit codes 5 (can't update itself), 6 (the update failed and the old version is
running again) and 7 (it failed and couldn't be undone), and `update`, `doctor` and `service install` reject an option
they can't act on with exit 2.
