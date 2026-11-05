---
"@bragdoc/local": minor
---

More of the shared CLI contract: a busy check, and `serve`'s first line.

- **`serve`'s first line has changed, which scripts may depend on.** It's now `BragDoc <version>: <url>`
  (`BragDoc 0.4.0: http://localhost:2724`), where it was `BragDoc on <url>`. `Data home:` still follows it. The
  `Version:` line that came after it, outside a terminal, has gone: the version is in the first line. A script that
  waits for `BragDoc on` needs to look for the new line.
- **`bragdoc busy`** says whether the running BragDoc is in the middle of something a restart would cut short: an
  import, a judge run, or AI requests running or waiting. It exits 0 when it isn't, 75 when it is and 3 when nothing
  is running, and `--json` prints the answer as JSON. It's for scripts and Docker update hooks.
- **`bragdoc service stop` and `restart` refuse while BragDoc is busy**, say what's running, and exit 75 (a new exit
  code for them). `--force` stops or restarts it all the same, after saying what it's overriding.
- **`GET /api/busy`** answers the same question for anything else on this computer, as counts only.
- **`bragdoc service restart` on macOS** waits for launchd to let the old process go before starting it again.
