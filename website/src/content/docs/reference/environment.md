---
title: Environment variables
description: "The environment variables BragDoc reads: PORT, BRAGDOC_HOME, BRAGDOC_ALLOWED_HOSTS and BRAGDOC_DANGEROUSLY_ALLOW_OPEN, plus the ones for development."
---

:::note[Tracking `next`]
This list follows the [`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next). The root test suite checks
that every `BRAGDOC_*` variable the code reads is listed here (apart from the test suite's own).
:::

A command-line option always wins over its environment variable.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `2724` | The port to serve on, if `--port` isn't given. |
| `BRAGDOC_HOME` | `~/.bragdoc` | The data folder, if `--data-dir` isn't given. |
| `BRAGDOC_ALLOWED_HOSTS` | (none) | Extra hostnames BragDoc answers to, comma separated, added to `allowedHosts` in [config.yaml](/reference/config-yaml/). For Docker or a reverse proxy. |
| `BRAGDOC_DANGEROUSLY_ALLOW_OPEN` | (unset) | Set to `1` to let BragDoc listen on an address other networks can reach. BragDoc has no login, so only do this when something else limits who can connect, such as Docker publishing the port on `127.0.0.1` only. See [Localhost security](/guarantees/localhost-security/). |

## For development

These are read by `npm run dev` and the build in a checkout of the repository (see [Contributing](/contributing/)),
not by an installed BragDoc.

| Variable | Default | Meaning |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | The address the dev servers listen on. Anything but loopback also needs `BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1`. |
| `BRAGDOC_API_PORT` | `PORT` + 1 | The port of the API server behind the Vite dev server. |
| `BRAGDOC_WEB_PORT` | `PORT` | The Vite dev server's port (set by `npm run dev`). |
| `BRAGDOC_DEV` | (set by `npm run dev`) | Tells the server that Vite serves the web app, so it serves only the API. |
| `BRAGDOC_KIT` | (unset) | `1` builds the web app with its `/dev/kit` page of UI components (the screenshot rig uses it). Never set in a release build. |
| `BRAGDOC_WEB_OUT` | `dist/web` | Where `vite build` writes the web app. |
