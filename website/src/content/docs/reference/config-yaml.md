---
title: config.yaml
description: "BragDoc's settings file: allowed hosts, where MCP writes go, and which sources are on. Every key is optional."
---

:::note[Tracking `next`]
This is the settings format of v0.1, as built on the [`next` branch](https://github.com/edspencer/bragdoc-ai/tree/next),
plus the `ai:` section 0.2.0 adds (built on the [`v0.2` branch](https://github.com/edspencer/bragdoc-ai/tree/v0.2)).
:::

`config.yaml` sits at the top of your [data folder](/reference/data-folder/). BragDoc writes a starter copy the first
time it runs, with every value at its default, and after that the file is yours: edit it by hand and BragDoc picks the
change up when you save, no restart needed. **Secrets never go here**: a GitHub token lives in `secrets.yaml`, which
only you can read.

```yaml
schemaVersion: 1

# Hostnames BragDoc answers to besides localhost, for Docker or a reverse proxy.
allowedHosts: []

mcp:
  writeTo: board   # board (straight on, marked as your agent's) or found (to review first)

sources:
  github:
    enabled: false
    auth: gh         # gh (the GitHub CLI's login) or token (a personal access token in secrets.yaml)
    lookBackDays: 90 # how far back the first check looks
    repos: []        # owners or owner/repo to look in, e.g. [acme, my-org/my-app]; empty: everywhere you merged
    hourly: false    # check by itself every hour while BragDoc runs (off: only when you press Check now)
  screenshots:
    enabled: false
    folder: null     # the folder to watch for new screenshots, e.g. ~/Screenshots
    onlyScreenshots: true # only files named like screenshots; false: every picture in the folder

welcome:
  skipped: false   # true once you skip the welcome steps (they show while there's no profile.yaml)

# AI is off, and every AI feature is off, until you switch it on. Nothing is sent to any model while it's off.
ai:
  enabled: false   # the master switch; turning it on turns no feature on
  connections:     # where models run, by id, e.g. ollama: { kind: ollama } (at its usual address)
  text: null       # the model features use: { connection: <id>, model: <name> }
  vision: null     # reserved; unused
  features:
    judge:
      enabled: false
      screenshots: true
      github: false
      model: null
      when: { onArrival: false, everyHours: null, onlyBetween: null, onlyOnAC: true }
      backgroundCloud: false
      maxPerRun: 50
    tidy: { enabled: false, model: null }
    draft: { enabled: false, model: null }
```

## Keys

| Key | Default | Meaning |
| --- | --- | --- |
| `schemaVersion` | `1` | The file format version. Leave it alone. A `config.yaml` from a newer BragDoc refuses to start, rather than lose the settings this version doesn't understand. |
| `allowedHosts` | `[]` | Hostnames BragDoc answers to besides `localhost`, `127.0.0.1` and `[::1]`, e.g. `[bragdoc.example.com]`. `BRAGDOC_ALLOWED_HOSTS` adds to them. Matched in lower case, without a port. See [Localhost security](/guarantees/localhost-security/). |
| `mcp.writeTo` | `board` | Where achievements from your MCP agents go: `board` or `found`. See [MCP](/agents/mcp/). |
| `sources.github.enabled` | `false` | Whether the [GitHub source](/concepts/found-and-sources/#github) is on. |
| `sources.github.auth` | `gh` | `gh` uses the GitHub CLI's own login; `token` uses a personal access token from `secrets.yaml`. Only `token` adds `api.github.com` to BragDoc's [network allow-list](/guarantees/network-activity/). |
| `sources.github.lookBackDays` | `90` | How far back the first check looks, in days (1 to 3650). Changing it makes the next check look back the whole window again; nothing already found comes back. |
| `sources.github.repos` | `[]` | Where to look: owners (`acme`) and repositories (`acme/app`); anything else is an error. Empty: every repository you merged into. |
| `sources.github.hourly` | `false` | Check GitHub by itself every hour while BragDoc runs. Off: it checks only when you connect it or press **Check now**. |
| `sources.screenshots.enabled` | `false` | Whether the [screenshots folder](/concepts/found-and-sources/#a-screenshots-folder) is watched. |
| `sources.screenshots.folder` | `null` | The folder to watch: a full path, or one starting `~/`. Not BragDoc's data folder, and not a hidden folder. |
| `sources.screenshots.onlyScreenshots` | `true` | Read only files named like screenshots. `false`: every picture that lands in the folder. |
| `welcome.skipped` | `false` | `true` once you skip [Welcome](/getting-started/quickstart/). The board opens Welcome while there's no `profile.yaml` and this is `false`. |
| `ai.enabled` | `false` | *From 0.2.0* (see [AI](/ai/overview/)). The master switch for AI. Off: no model is asked anything, and BragDoc doesn't even load the AI library it talks to models with. On: still no feature is on until you switch it on. |
| `ai.connections` | `{}` | Where models run, by id: `kind` (`ollama`, `lmstudio`, `llamacpp`, `openai-compatible`, `anthropic`, `openai`, `openrouter`, `jev`), and optionally `name`, `baseUrl` (default: the kind's usual address), `contextTokens` (the context size prompts are fitted to: 8192 unless set, or 30,000 for a cloud connection), `via` (for `jev`: an OpenRouter connection) and `consent`. A connection whose host isn't this computer or your network is on the internet, whatever its kind, and sends nothing until you consent: `consent` records what you accepted (`at`, `version`, `host`). Keys are in `secrets.yaml`, never here. |
| `ai.text` | `null` | The model features use: `{ connection: <id>, model: <name> }`. Never a `jev` connection: Jev only answers yes-or-no decisions, so it can be the judge's `model` and nothing else. |
| `ai.vision` | `null` | Reserved for reading pictures; unused. |
| `ai.features.judge` | off | The Found judge: `enabled`, `screenshots` (judge screenshot candidates), `github` (also merged PRs), `model` (its own, else `ai.text`), `when` (`onArrival`, `everyHours` of 1, 3, 6, 12 or 24, `onlyBetween` `{ from: "19:00", to: "08:00" }`, `onlyOnAC`), `backgroundCloud` (a cloud model may run in the background), `maxPerRun` (1 to 500). Background runs are off until you choose them. "Only on power" reads `pmset` on a Mac and `/sys/class/power_supply` on Linux; where BragDoc can't tell (a desktop, Docker), it counts as plugged in. Judge now ignores `when`. |
| `ai.features.tidy`, `ai.features.draft` | off | `enabled` and `model` (its own, else `ai.text`). |

A section left empty falls back to its defaults. Settings → Sources writes these for you (and keeps your comments). The GitHub source's own state (where the next check starts, the last check,
how long GitHub asked it to wait) is in `cache/sources/github.json`: delete it and the next check simply looks back the
whole window again. The screenshots folder's counts ("40 looked at · 3 sent to Found") are in
`cache/sources/screenshots.json`: names and numbers, never a screenshot's text.

## If it's wrong

If an edit doesn't validate, BragDoc keeps the last good settings, tells you what's wrong, and doesn't crash. Fix the
file and save again.
