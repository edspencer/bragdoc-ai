---
"@bragdoc/local": minor
---

`bragdoc service` follows the shared CLI contract that Ed's other local tools use too.

- **Changed exit codes, which scripts may depend on.** `bragdoc service status` now exits 0 when BragDoc is answering,
  3 when it's installed but not running, and 4 when it isn't installed. It used to exit 0 for all three. `start`,
  `stop`, `restart` and `logs` exit 4 when it isn't installed, where they exited 1.
- **`bragdoc service status --json`** prints the same report as one JSON document: whether it's installed, running and
  answering, the installed and running versions, the port, pid, unit file, data folder and log.
- **On Linux, the service's log is now a file**, `~/.bragdoc/service/bragdoc.log`, as it already was on macOS, rather
  than the systemd journal. Run `bragdoc service install` once to switch an existing service over. BragDoc rotates the
  file itself at 10 MB.
- **`bragdoc service logs` prints the last 50 lines and exits.** `-f` follows the log, and `-n <lines>` sets how many
  lines. It used to always follow.
