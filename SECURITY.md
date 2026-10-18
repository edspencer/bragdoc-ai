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
  `BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1` (`server/bind-safety.ts`).
- **Other web pages can't use it.** Every request must carry an allowed `Host` (loopback, or a name you added to
  `allowedHosts`): the DNS-rebinding defence. Any `Origin` a browser sends must be BragDoc's own, on every request
  including the live-update stream; the API refuses cross-site and same-site fetches by Fetch Metadata; writes are
  JSON or a typed upload, never a type a page can send without a CORS preflight, and no CORS is ever granted. Bodies
  are capped at 1 MB (JSON; 50 MB for a hosted-app export sent to `/api/import/*`, D47) and 25 MB (uploads). All in
  `server/security.ts`.
- **The web app can't be served something it didn't expect.** A missing file is a 404, never the app's HTML
  (`server/index.ts`). Everything is served with a strict Content-Security-Policy with no inline scripts, `nosniff`,
  `no-referrer` and same-origin resource and opener policies; evidence files get a sandboxing CSP and download unless
  they're images (`server/security.ts`).
- **Nothing leaves your machine behind your back.** Outbound requests go only through `server/egress.ts`, to an
  allow-list derived from what you connected, and every one (allowed or refused) is logged to `logs/network.jsonl`.
  Subprocesses run only through `server/proc.ts`: allow-listed binaries, no shell. `test/guard-egress.test.ts` fails CI
  if any other code reaches the network or starts a process.
- **Secrets stay private.** `runtime.json`, which holds the MCP bearer token, is written mode 0600; the data home's
  `.gitignore` keeps it, `secrets.yaml`, logs and backups out of git (`server/runtime.ts`, `server/home.ts`).

Coming with v0.1, each with its enforcing file: writes that are atomic and never delete (`server/store/`), and an MCP
endpoint that needs the per-install token (`/mcp`).

Out of scope: anything that needs an attacker who can already run code as you, or write to your `~/.bragdoc`.
`BRAGDOC_DANGEROUSLY_ALLOW_OPEN` deliberately relaxes the first guarantee (Docker uses it, publishing on 127.0.0.1
only); setting it is not a vulnerability.
