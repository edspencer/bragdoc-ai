---
title: Localhost security
description: "BragDoc has no login, so it listens only on your own computer and refuses requests from other sites, other hosts and unexpected content."
---

:::note[Coming in v0.1]
Most of this is built, on the [`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next); the MCP token and
the handling of stored evidence arrive with the features that need them. `SECURITY.md` in the repository says which
file enforces each rule.
:::

BragDoc is a single-user app with no login. That is only safe if nobody but you can reach it, so it is careful about
who it answers.

## It listens only on your computer

BragDoc binds `127.0.0.1` by default, which other machines can't reach. If you ask it to listen on any other address,
it refuses, unless you also set `BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1`. The Docker image sets that flag because it has to
listen on all interfaces inside the container; that is why the docs always publish the port as
`127.0.0.1:2724:2724`, so only your own machine can reach it.

## It checks every request

- **Host allow-list.** A request must be addressed to `localhost`, `127.0.0.1` or `[::1]` (or a host you've added
  yourself, for Docker or a reverse proxy). Anything else gets a 403. This stops DNS-rebinding attacks, where a
  website you visit tries to reach your localhost through a name it controls.
- **Origin checks.** If a browser says which page a request came from (the `Origin` header), it must be BragDoc's
  own, on every request, the live-update stream included. A page on another website, or another app on another port
  of your machine, gets a 403. The API also refuses requests the browser marks as cross-site or same-site (Fetch
  Metadata), and never grants CORS.
- **No sneaky content types.** Writes must be JSON or a typed upload, never one of the content types a web page can
  send to another site without a CORS preflight (a 415 otherwise). Bodies are capped at 1 MB for JSON and 25 MB per upload.
- **A token for agents.** The MCP endpoint needs a per-install bearer token, kept in `runtime.json`, which only your
  user can read.

## It's careful with what you store

- The app's pages carry a strict Content Security Policy with no inline scripts: they load scripts, styles, images
  and fonts only from BragDoc itself, and can't be framed by another site. A missing file is a 404, never the app's
  page.
- Stored evidence is served sandboxed. Images are only ever shown as images (SVGs included, so they can't run
  scripts), and anything that isn't an image downloads instead of opening. File types are checked from their content,
  not their names.
- Markdown you write is sanitised before it is shown.
- BragDoc runs other programs only through one module, with fixed argument lists and no shell, and only these:
  `gh`, `git`, `osascript`, `launchctl`, `systemctl`, `journalctl`, `claude`, `defaults`, and `open` / `xdg-open` (for
  `bragdoc --open`).
