---
"@bragdoc/local": minor
---

`bragdoc service install` from a git checkout now refuses unless you add `--from-checkout`: a service that runs a
checkout runs whatever it last built, and breaks when the checkout is cleaned or rebuilt. Install BragDoc with
`npm i -g @bragdoc/local` instead, or add the flag if you mean it. A service installed that way is refreshed and
restarted from the checkout without the flag again.

`bragdoc service install`, `uninstall`, `start`, `stop` and `restart` take `--json`: one JSON document on stdout
(`ok`, `action`, `error` when it failed, then the same fields as `service status --json`), and the messages on
stderr.

**For scripts:** a `service install` from a checkout that used to succeed now exits 1 without `--from-checkout`. The
exit codes with `--json` are the same as without it, and `service logs --json` is a usage error (exit 2).
