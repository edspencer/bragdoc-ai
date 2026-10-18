---
title: config.yaml
description: "BragDoc's settings file: allowed hosts, where MCP writes go, and which sources are on. Every key is optional."
---

:::note[Tracking `next`]
This is the settings format as it stands in review for v0.1. Sources other than GitHub (the screenshots folder) add
their keys as they are built.
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

welcome:
  skipped: false   # true once you skip the welcome steps (they show while there's no profile.yaml)
```

## Keys

| Key | Default | Meaning |
| --- | --- | --- |
| `schemaVersion` | `1` | The file format version. Leave it alone. A `config.yaml` from a newer BragDoc refuses to start, rather than lose the settings this version doesn't understand. |
| `allowedHosts` | `[]` | Hostnames BragDoc answers to besides `localhost`, `127.0.0.1` and `[::1]`, e.g. `[bragdoc.example.com]`. Also settable with `BRAGDOC_ALLOWED_HOSTS`. See [Localhost security](/guarantees/localhost-security/). |
| `mcp.writeTo` | `board` | Where achievements from your MCP agents go: `board` or `found`. See [MCP](/agents/mcp/). |
| `sources.github.enabled` | `false` | Whether the [GitHub source](/concepts/found-and-sources/#github) is on. |
| `sources.github.auth` | `gh` | `gh` uses the GitHub CLI's own login; `token` uses a personal access token from `secrets.yaml`. Only `token` adds `api.github.com` to BragDoc's [network allow-list](/guarantees/network-activity/). |
| `sources.github.lookBackDays` | `90` | How far back the first check looks, in days (1 to 3650). Changing it makes the next check look back the whole window again; nothing already found comes back. |
| `sources.github.repos` | `[]` | Where to look: owners (`acme`) and repositories (`acme/app`). Empty: every repository you merged into. |
| `sources.github.hourly` | `false` | Check GitHub by itself every hour while BragDoc runs. Off: it checks only when you connect it or press **Check now**. |
| `welcome.skipped` | `false` | `true` once you skip [Welcome](/getting-started/quickstart/). The board opens Welcome while there's no `profile.yaml` and this is `false`. |

Settings → Sources writes these for you. The GitHub source's own state (where the next check starts, the last check,
how long GitHub asked it to wait) is in `cache/sources/github.json`: delete it and the next check simply looks back the
whole window again.

## If it's wrong

If an edit doesn't validate, BragDoc keeps the last good settings, tells you what's wrong, and doesn't crash. Fix the
file and save again.
