---
title: Network activity
description: "BragDoc sends nothing off your machine on its own. The only outbound requests are to services you connect, and every one is logged where you can see it."
---

:::note[Coming in v0.1]
The egress module, its CI guard and the request log are built, on the
[`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next). The Network activity screen, the GitHub source (the only thing that will use the network) and text recognition
are being built.
:::

**BragDoc sends nothing off your machine on its own.** No telemetry, no analytics, no crash reports, no update check.
There is no BragDoc server to send anything to.

The only outbound requests BragDoc makes are to services **you connect yourself**. In v0.1 that is one service:
GitHub, if you connect the [GitHub source](/concepts/found-and-sources/#github).

## How that's enforced

- **One door out.** Exactly one module in BragDoc (`server/egress.ts`) is allowed to make network requests. Before
  every request it rebuilds its allow-list from your settings (`api.github.com` only if you connected GitHub with a
  token) and refuses anything else.
- **A test that fails the build.** BragDoc's CI scans the server code for any other way of making a network request
  or starting a process, and fails if it finds one.
- **The pages can't phone home either.** The app's Content Security Policy only lets its pages talk to BragDoc
  itself, and a browser test checks the app makes no requests anywhere else.
- **Libraries won't either.** When text recognition arrives, its data will be bundled with BragDoc and loaded from
  disk, never from the library's default download site, with a test that runs it with the network switched off.

## Seeing it for yourself

**Settings → Network activity** lists every outbound request, allowed or refused, with when, why, where and how
much. It is kept in `logs/network.jsonl` in your data folder. It also shows the current allow-list, and a line that
reads "To BragDoc's makers: 0 B".

There's one honest exception to "every request". If you connect GitHub through the `gh` CLI, it is `gh` that talks
to GitHub, not BragDoc. BragDoc logs each time it runs `gh` ("via gh CLI"), but it can't see inside `gh`'s own
traffic. If you'd rather everything went through BragDoc's own logged path, use a personal access token instead.

## This site, too

This documentation site follows the same rule: no analytics, and it loads nothing (fonts, scripts, images) from
anywhere but itself.
