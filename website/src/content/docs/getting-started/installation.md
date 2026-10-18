---
title: Installation
description: "Run BragDoc with npx, install it globally with npm, run it in Docker, or keep it running as a login service."
---

:::note[Not released yet]
`@bragdoc/local` isn't on npm yet and the Docker image isn't published, so the `npx`, `npm install -g` and
`docker run` commands below won't work until the v0.1 release. Everything else on this page is how the built app
behaves. To try it now, run it from the [`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next) (see
[Contributing](/contributing/)), or build the image yourself from a checkout with `docker compose up -d --build`.
:::

BragDoc needs **Node.js 22.12 or later** and runs on **macOS and Linux**. Windows isn't supported yet. It is one npm
package, `@bragdoc/local`, and one command, `bragdoc`.

## Try it with npx

```sh
npx @bragdoc/local
```

That downloads BragDoc, starts it, and prints the address to open, then where your data is:

```
BragDoc on http://localhost:2724
Data home: ~/.bragdoc
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

It starts at login, not at boot, and runs as the user who installed it (so install it as yourself, not with `sudo`). `bragdoc service status` says whether it's running
and on which port, and `bragdoc service uninstall` removes it; your data stays. A service needs an installed
`bragdoc`, not `npx`, because npx's copy can disappear from its cache.

## Docker

The image is built for amd64 and arm64, for the GitHub Container Registry. Bind it to your own machine only:

```sh
docker run --rm -p 127.0.0.1:2724:2724 -v ~/.bragdoc:/data ghcr.io/edspencer/bragdoc
```

Always publish the port as `127.0.0.1:2724:2724`. BragDoc has no login, so publishing it on all interfaces would let
anyone on your network read and change your data. Inside the container BragDoc listens on all interfaces (it has to,
for Docker's port forwarding to reach it), which is why the image sets `BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1`; see
[Localhost security](/guarantees/localhost-security/).

The image runs as an ordinary user (uid 1000), never root, keeps its data in `/data`, includes `git` and `gh` for the
GitHub source, and has a health check on `/api/health`. For day-to-day use, the repository's `compose.yaml` does the same with less typing:

```sh
docker compose up -d
```

It publishes the port on `127.0.0.1` only, mounts `~/.bragdoc` at `/data`, and mounts your code folder read-only at
the same path inside the container (so repository paths mean the same thing inside and out). You can tune it with:

| Variable | Default | Meaning |
| --- | --- | --- |
| `BRAGDOC_CODE_DIR` | `~/Code` | The code folder to mount read-only. |
| `BRAGDOC_UID`, `BRAGDOC_GID` | `1000` | The user the container runs as, so the files it writes in `~/.bragdoc` are yours. |
| `BRAGDOC_TAG` | `latest` | The image tag; `next` for preview releases. |
| `BRAGDOC_SCREENSHOTS_DIR` | `~/Desktop` | The screenshots folder, for the commented-out mount below. |
| `TZ` | `UTC` | The container's time zone. |

Commented-out lines in it mount a screenshots folder and your GitHub CLI login, read-only, for the screenshot and
GitHub sources (or pass a `GH_TOKEN` for `gh` to use).

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
