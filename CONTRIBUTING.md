# Contributing to BragDoc

Thanks for working on BragDoc. This is the short guide for people: how to get it running, what CI checks, and the
few rules that aren't up for negotiation. Coding agents working on this repo should read [AGENTS.md](AGENTS.md), the
agent-facing version of the same conventions (it's what `CLAUDE.md` loads).

BragDoc Local **v0.1 is being built** on the `next` branch, tracked in
[#411](https://github.com/edspencer/bragdoc-ai/issues/411). [spec.md](spec.md) says what it is and where the full
specification lives; decisions and their reasons are in [docs/decisions.md](docs/decisions.md).

## Setup

You need Node.js 22.12 or later (`.nvmrc` says 22) and git, on macOS or Linux.

```sh
git clone -b next https://github.com/edspencer/bragdoc-ai.git
cd bragdoc-ai
npm ci
```

Then, depending on what you're doing:

```sh
npm run dev           # Vite with hot reload on :2724, proxying /api to the server (tsx watch) on :2725
npm start             # build what's stale, then run the compiled CLI (`npm start -- --port 5050`, …)
npm run bragdoc -- <args>   # any `bragdoc` command, from source
```

**Keep your real data out of it.** Point a development instance at a throwaway data home, e.g.
`BRAGDOC_HOME=$(mktemp -d) npm start -- --port 5050`. `PORT` moves `npm run dev`'s ports, so it can run next to an
installed BragDoc.

If your shell exports `NODE_ENV=production`, `npm ci` skips the dev dependencies (TypeScript, Vite, tsx): unset it
(`env -u NODE_ENV npm ci`).

**Dependencies:** `package-lock.json` is written by npm 11. If you add or upgrade a dependency on Node 22 (which ships
npm 10), use npm 11 for it, e.g. `npx npm@11 install -D some-package`, so the lockfile doesn't churn.

## Checks

CI runs these on Node 22.12, 22 and 24, on Linux and macOS, plus a Playwright smoke test. Run them before you open a
PR:

```sh
npm run check:nul     # no raw NUL bytes in JS/TS sources (they hide files from grep)
npm run typecheck     # server + web app
npm test              # node:test, from source via tsx
npm run build         # dist/web (Vite) + dist/server, dist/shared (tsc)
npm run test:e2e      # Playwright against the built server (`npx playwright install chromium-headless-shell` once)
```

## The rules

These are what make BragDoc safe to run on your machine with your career in it. A PR that weakens one won't be
merged, however useful the rest of it is.

- **Localhost only.** The server binds 127.0.0.1 and rejects requests whose `Host` or `Origin` isn't
  local. Binding anything else needs `BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1`.
- **No telemetry.** Nothing phones home. All outbound network traffic goes through one module (`server/egress.ts`)
  and is logged, and processes are only spawned through `server/proc.ts`. CI fails if anything else does
  either.
- **AI is off unless the user turns it on.** No AI dependency is ever installed, and no model downloaded, without the
  user's explicit say-so.
- **Your data is just files.** Every write goes through the store (`server/store/`, from PR3); hand edits are
  first-class and never silently overwritten.
- **Keep it generic.** Examples, fixtures and docs never assume a particular employer, machine, username or network.
  Use `example.com`, `~/Code/my-app` and a made-up person.

## Pull requests

- Branch off `next` and open the PR against it. Keep it focused; a stack of small PRs beats one big one.
- Say what changed and how you checked it. CI has to be green.
- **UI changes need screenshots:** before and after, plus a nearby view that *shouldn't* have changed, in light and
  dark, so a reviewer can tell a fix from something that just disappeared.
- **Design decisions go in the decisions log** (`docs/decisions.md`, append only).

## Changesets

Versions and the changelog come from [changesets](https://github.com/changesets/changesets). A PR that changes
something a user would notice adds one: run `npm run changeset`, pick the bump (`patch` for everything before 1.0; the one exception is the `minor` that made the first release 0.1.0,
RELEASING.md),
and write a sentence or two for users, not reviewers: what they can now do, or what no longer goes wrong. Commit the
`.changeset/*.md` file it writes with the PR. Internal changes (tests, CI, refactors, docs for contributors) don't
need one.

You never bump `version` or edit `CHANGELOG.md` yourself: the release does ([RELEASING.md](RELEASING.md)).

## Security

Please don't open a public issue for a vulnerability; see [SECURITY.md](SECURITY.md).
