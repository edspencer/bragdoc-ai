# Security policy

## Supported versions

Fixes go into the latest minor release only (0.1.x for now).

## Reporting a vulnerability

Please report it privately through GitHub's private vulnerability reporting:
**https://github.com/edspencer/bragdoc-ai/security/advisories/new**. Don't open a public issue or pull request for
it.

Say what you found, which version or commit, and how to reproduce it. You'll get an acknowledgement, and we'll agree on
a fix and a disclosure date with you before anything is published. BragDoc is maintained by one person, so allow a few
days for a first response.

## What BragDoc protects

BragDoc runs on your machine as your user and keeps your achievements, and the evidence for them, as files in
`~/.bragdoc`. What it's built to guarantee, and so what counts as a vulnerability if broken; each guarantee names the
file that enforces it.

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

- **Agents need the token.** `/mcp` answers only a request carrying the per-install bearer token from `runtime.json`
  (compared in constant time), refuses another site's `Origin` like every other route, and a new token from Settings
  stops the old one at once (`server/routes/mcp.ts`, `server/runtime.ts`).
- **Your entries are never lost or clobbered.** Achievements, projects, companies, repos, evidence and your profile are
  written only through the store, atomically; removing one moves its file to `backups/removed/` rather than deleting
  it, a file you broke by hand is shown as a Problem and never overwritten, and an edit made against a stale copy is
  refused (`server/store/`, `server/store/safefs.ts`). BragDoc's own files (config.yaml, secrets.yaml, runtime.json) are
  written atomically too (`server/atomic.ts`); the only things it deletes are old backup snapshots, by the retention
  rule, and a rotated network log. `test/guard-fs.test.ts` fails CI if any other code deletes, renames or writes there.
- **No telemetry.** There's no update check, and screenshots are read on your computer (`server/ocr/`).
- **AI is off unless you turn it on, and then it reaches only what you allowed.** With AI off, no model is contacted
  and the AI SDK isn't even loaded (`test/ai-lazy.test.ts` runs an AI-off session under a loader hook). Every model
  call goes through `server/ai/run.ts` and `egress.fetchFor()` (`server/egress.ts`), which re-checks that connection on
  every request: where a call goes is decided by its host (`shared/ai/hosts.ts`), plain http only to this computer or
  your network, and an internet host only after you've accepted its statement of what's sent there
  (`shared/ai/consent.ts`, `server/ai/policy.ts`). Revoking one connection refuses its next request before anything
  is sent, even when another allowed connection shares the host. Keys live in `secrets.yaml` (mode 0600), are never
  returned by the API or written to a log or backup, and are sent only to their own host (`server/secrets.ts`). No
  runner is installed, and a model is downloaded only through Ollama after a confirm the server checks too
  (`server/ai/local.ts`). `test/guard-egress.test.ts` confines the AI SDK to `server/ai/`.
- **A model can't act on your data.** What it reads (a screenshot's text, a PR, your paste) is fenced as material,
  never instructions. What it answers is shown as text and checked against what it was given: the judge only writes a
  pending candidate's verdict and never keeps, merges or dismisses anything; Tidy and Draft write nothing until you
  use a suggestion and save it (`server/ai/judge/`, `server/ai/tidy.ts`, `shared/ai/draft.ts`).

Out of scope: anything that needs an attacker who can already run code as you, or write to your `~/.bragdoc`.
`BRAGDOC_DANGEROUSLY_ALLOW_OPEN` deliberately relaxes the first guarantee (Docker uses it, publishing on 127.0.0.1
only); setting it is not a vulnerability.
