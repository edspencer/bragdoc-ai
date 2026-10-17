# Security policy

## Supported versions

BragDoc Local is pre-release: v0.1 is being built and nothing has been published yet. Once it is, fixes go into the
latest minor release only.

## Reporting a vulnerability

Please report it privately through GitHub's private vulnerability reporting:
**https://github.com/edspencer/bragdoc-ai/security/advisories/new**. Don't open a public issue or pull request for
it.

Say what you found, which version or commit, and how to reproduce it. You'll get an acknowledgement, and we'll agree on
a fix and a disclosure date with you before anything is published. BragDoc is maintained by one person, so allow a few
days for a first response.

## What BragDoc protects

BragDoc runs on your machine as your user and keeps your achievements, and the evidence for them, as files in
`~/.bragdoc`. What it's built to guarantee, and so what counts as a vulnerability if broken. This list grows as v0.1
is built; each guarantee names the file that enforces it.

- **Only you can reach it.** The server binds 127.0.0.1 only, and refuses any other address unless you set
  `BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1` (`server/cli.ts` for now; `server/bind-safety.ts` from PR2). From PR2, it also
  answers only requests whose `Host` is local (the DNS-rebinding defence) and accepts writes only from a local
  `Origin` (`server/security.ts`).
- **The web app can't be served something it didn't expect.** A missing file is a 404, never the app's HTML
  (`server/index.ts`). From PR2, the app is served with a strict Content-Security-Policy with no inline scripts.

Coming with v0.1, each with its enforcing file: no outbound traffic except through `server/egress.ts`, logged and
allow-listed; no subprocess except through `server/proc.ts`; writes that are atomic and never delete
(`server/store/`); and an MCP endpoint that needs a per-install token.

Out of scope: anything that needs an attacker who can already run code as you, or write to your `~/.bragdoc`.
`BRAGDOC_DANGEROUSLY_ALLOW_OPEN` deliberately relaxes the first guarantee (Docker uses it, publishing on 127.0.0.1
only); setting it is not a vulnerability.
