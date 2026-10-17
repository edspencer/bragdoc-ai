---
title: Installation
description: "Run BragDoc with npx, install it globally with npm, run it in Docker, or keep it running as a login service."
---

:::note[Coming in v0.1]
None of these commands work yet: `@bragdoc/local` isn't on npm, and there is no Docker image. This page describes
how v0.1 will install. To try the work in progress, build it from the
[`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next) (see [Contributing](/contributing/)).
:::

BragDoc needs **Node.js 22.12 or later** and runs on **macOS and Linux**. Windows isn't supported yet. It is one npm
package, `@bragdoc/local`, and one command, `bragdoc`.

## Try it with npx

```sh
npx @bragdoc/local
```

That downloads BragDoc, starts it, and prints the address to open:

```
BragDoc on http://localhost:2724
```

It keeps running until you press Ctrl+C. Your data is saved in `~/.bragdoc` either way, so stopping it loses nothing.

## Install it

```sh
npm install -g @bragdoc/local
bragdoc
```

The same server, with the `bragdoc` command on your path. `bragdoc --help` lists everything it can do; the
[CLI reference](/reference/cli/) has the details.

## Keep it running

To have BragDoc start whenever you log in, and restart if it ever exits, install it as a login service (a
LaunchAgent on macOS, a systemd user unit on Linux):

```sh
npm install -g @bragdoc/local
bragdoc service install
```

It starts at login, not at boot, and runs as you, never as root. `bragdoc service status` says whether it's running
and on which port, and `bragdoc service uninstall` removes it; your data stays. A service needs an installed
`bragdoc`, not `npx`, because npx's copy can disappear from its cache.

## Docker

There will be a multi-architecture image on the GitHub Container Registry. Bind it to your own machine only:

```sh
docker run --rm -p 127.0.0.1:2724:2724 -v ~/.bragdoc:/data ghcr.io/edspencer/bragdoc
```

Always publish the port as `127.0.0.1:2724:2724`. BragDoc has no login, so publishing it on all interfaces would let
anyone on your network read and change your data. Inside the container BragDoc listens on all interfaces (it has to,
for Docker's port forwarding to reach it), which is why the image sets `BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1`; see
[Localhost security](/guarantees/localhost-security/).

The release will include a `compose.yaml` that also mounts your code folder and a screenshots folder read-only, for
the GitHub and screenshot sources.

## Ports and folders

- **The port** is 2724 (it spells BRAG on a phone keypad). Change it with `--port` or `PORT`. BragDoc never picks
  another port by itself: if 2724 is taken, it says so and exits.
- **The data folder** is `~/.bragdoc`. Change it with `--data-dir` or `BRAGDOC_HOME`. See
  [The data folder](/reference/data-folder/).

## Upgrading and uninstalling

`npx @bragdoc/local@latest` always runs the newest release. For a global install, `npm install -g @bragdoc/local`
again. To uninstall, run `bragdoc service uninstall` if you installed the service, then
`npm uninstall -g @bragdoc/local`. Your data folder is never touched; delete `~/.bragdoc` yourself if you want it gone.

## Used the old BragDoc CLI?

The earlier `@bragdoc/cli` package also used `~/.bragdoc`. On first run, BragDoc moves its files (`config.yml`,
`cache/`, `logs/`) into `~/.bragdoc/legacy-cli/` without deleting anything, and tells you it did. Uninstall the old
CLI (`npm uninstall -g @bragdoc/cli`) so it doesn't recreate them.
