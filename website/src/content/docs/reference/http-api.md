---
title: HTTP API
description: "The local HTTP API the BragDoc web app uses, the rules every request must follow, and the endpoints that exist so far."
---

:::note[Tracking `next`]
The API is being built with the app, and changes between commits until v0.1 is released. This page lists what is on
the [`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next) or in review, and will be filled in as the
features land. For agents, prefer [MCP](/agents/mcp/) or [the files](/reference/data-folder/): those are the stable
interfaces.
:::

BragDoc's web app talks to its own server over a JSON API under `/api/`, on the same address
(`http://localhost:2724`). It is a local API for the app, not a public web service: there are no API keys and no
versioning promises before 1.0.

## Rules for every request

These are enforced for every request (see [Localhost security](/guarantees/localhost-security/)):

- The `Host` header must be `localhost`, `127.0.0.1` or `[::1]`, or a host in `allowedHosts`
  ([config.yaml](/reference/config-yaml/)) or `BRAGDOC_ALLOWED_HOSTS`. Otherwise: **403**.
- If the request has an `Origin` header, it must be BragDoc's own (the same host and port as the request), on every
  request. `/api/*` and `/mcp` also refuse `Sec-Fetch-Site: cross-site` and `same-site`. Otherwise: **403**.
- Its body must be `application/json`, or a typed upload whose type isn't `text/plain`,
  `application/x-www-form-urlencoded` or `multipart/form-data`. Otherwise: **415**. JSON bodies are capped at 1 MB,
  uploads at 25 MB.
- Errors are JSON: `{ "error": { "code": "…", "message": "…" } }`.

## Endpoints

| Method and path | What it returns |
| --- | --- |
| `GET /api/health` | `{ "ok": true, "version": "…" }`. Used by the service's readiness check and Docker's health check. |
| `GET /api/events` | A Server-Sent Events stream of changes, for live updates. |
| `GET /api/meta` | What this server is and how it's set up: version, build information (release builds only), data folder, MCP address, allowed hosts, the current outbound allow-list, and any notices. |
| `GET /api/network-log` | Recent outbound requests, for [Network activity](/guarantees/network-activity/). |
| `POST /mcp` | The [MCP server](/agents/mcp/). Needs `Authorization: Bearer <token>`; GET and DELETE are 405 (it's stateless). |
| `GET /agent-guide.md`, `/llms.txt`, `/llms-full.txt` | The [agent guide](/agents/agent-guide/), with this BragDoc's live facts. |

Achievements, evidence, projects, Found and settings get their endpoints as those features are built.
