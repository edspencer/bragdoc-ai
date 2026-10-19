# BragDoc Local

**A free, open-source, local-first tracker for the things you've done at work.** Keep your achievements, and the
evidence for them (screenshots, PRs, quotes, documents), as plain files on your own machine, on a pinboard you can
throw anything at. When review season comes round, it's all there.

- **Your data is just files**: markdown and YAML in `~/.bragdoc`, readable and editable by you or your coding agent.
- **Nothing leaves your computer** except calls to services you connect yourself, and every one is logged.
- **AI is off unless you turn it on.** With it off, BragDoc doesn't even load its AI code. Turned on, it uses a model
  runner you already have, or a cloud provider with your own key once you've read exactly what it would send; nothing
  is ever installed or downloaded behind your back.

> **0.2** adds opt-in AI ([#434](https://github.com/edspencer/bragdoc-ai/issues/434)) to the first local release,
> **0.1** ([#411](https://github.com/edspencer/bragdoc-ai/issues/411)), both built on the `next` branch. If
> `npx @bragdoc/local` says it "could not determine executable to run", or `docker pull` finds no image, the release
> you're reading about isn't published yet: [run it from a checkout](#run-it-from-a-checkout).

## What it does

- **Board**: paste or drop screenshots, PDFs, files, links and GitHub PR links, or type a line, and it's pinned to a
  week-by-week board. Edit, archive, remove (with Undo) and search. Hand edits to the files show up live.
- **Projects**: your projects on a timeline, in company swimlanes, in any colour, linked to the repos they live in.
- **Found**: candidates BragDoc spots by itself, from **GitHub** (pull requests you merged) and a **screenshots
  folder** (praise for you, read on this computer). Both are off until you turn them on, and nothing reaches the board
  until you keep it.
- **Folio**: a date window of your achievements, filtered and exported as markdown for a self-review.
- **MCP**: your coding agent (Claude Code, Cursor, …) can read your projects and log what you did.
- **Import** an export from the hosted BragDoc app; importing it again adds nothing.
- **AI, if you want it** (Settings → AI, every feature off until you switch it on): a **judge** in Found that says
  whether a candidate looks like a win for you, and why (it never keeps or dismisses anything itself); **Tidy this
  up** on the board, which suggests a title, summary, date, impact and projects for what you pasted; and **Draft with
  AI** in Folio, a self-review draft whose every bullet cites the achievement it came from. Each uses a model runner
  on your computer or network (Ollama, LM Studio, llama.cpp, any OpenAI-compatible server) or a cloud provider with
  your own key (Anthropic, OpenAI, OpenRouter). See [the AI docs](https://github.com/edspencer/bragdoc-ai/blob/next/website/src/content/docs/ai/overview.mdx).

## Install

You need **Node.js 22.12 or later**, on macOS or Linux.

```sh
npx @bragdoc/local            # try it: serves http://localhost:2724 until you press Ctrl+C
npm install -g @bragdoc/local # or install it, then run `bragdoc`
```

It binds `127.0.0.1` only and never picks another port: if 2724 is taken it says so (`--port <n>` to choose one).
Your data lives in `~/.bragdoc` (`--data-dir` or `BRAGDOC_HOME` to move it). `bragdoc --help` lists every command.

**Used the old `@bragdoc/cli`?** It installed a `bragdoc` command too, so `npm install -g @bragdoc/local` stops with
`EEXIST: file already exists … bin/bragdoc` and the old command stays on your path. Remove it first:

```sh
npm uninstall -g @bragdoc/cli
npm install -g @bragdoc/local
```

Its files in `~/.bragdoc` (`config.yml`, `cache/`, `logs/`) are moved aside into `~/.bragdoc/legacy-cli/` on first run,
untouched.

### Keep it running

```sh
bragdoc service install   # a LaunchAgent on macOS, a systemd user unit on Linux: starts when you log in
bragdoc service status    # running? on which port?
bragdoc service uninstall # removes the service; your data stays
```

A service needs the installed `bragdoc`, not `npx` (npx's copy can vanish from its cache), and refuses to install
from there. `bragdoc service install --dry-run` shows what it would write.

### Docker

An alternative to Node, sharing the same `~/.bragdoc` (stop one before starting the other):

```sh
docker run --rm -p 127.0.0.1:2724:2724 -v ~/.bragdoc:/data ghcr.io/edspencer/bragdoc
```

Always publish the port on `127.0.0.1`: BragDoc has no login. `compose.yaml` in this repository does the same.

### Connect your coding agent

```sh
bragdoc mcp install claude          # registers BragDoc with Claude Code, with its token
bragdoc mcp install claude --print  # or print the config for Claude Code, Claude Desktop, Cursor and others
```

Agents reach BragDoc at `http://localhost:2724/mcp` with a per-install token (in `~/.bragdoc/runtime.json`, mode
600), or through the stdio bridge `bragdoc mcp`. What they add is marked "Written by" the agent; Settings → Sources
can send it to Found for review instead. `bragdoc guide` prints the agent guide.

## What leaves your machine

Nothing, unless you connect GitHub or turn AI on:

- **GitHub, through the gh CLI** (recommended): BragDoc runs `gh auth status`, `gh search prs` and `gh pr view`; `gh`
  makes its own requests to GitHub with its own login. Each run is a line in Settings → Network activity, marked
  "via gh CLI".
- **GitHub, with a token you paste**: requests go from BragDoc to `api.github.com` only, each one logged with its
  purpose, status and size. The token is kept in `~/.bragdoc/secrets.yaml` (mode 600).
- GitHub is only asked when you press **Check now**, connect, or turn on the hourly check, and for a PR link's title
  once it's connected.

- **A model, only with AI on** (Settings → AI). A runner on this computer or your network gets each request at the
  address you gave it, logged as *this computer* or *your network*. A cloud provider (any address on the internet,
  whatever kind of connection it is) gets **nothing, not even a test, until you've read what each feature would send
  there and pressed Allow**; then requests go straight to that host with your key, from `secrets.yaml`, logged as
  *internet* with their size but never their content. Revoke, or turning AI off, stops it at once. BragDoc never
  installs a runner, and asks Ollama to download a model only after a confirm that states the size. A runner is its
  own software: what it contacts by itself is outside BragDoc's log.

That's all. **No telemetry, no update check, no analytics, and no fonts or scripts from a CDN.** Screenshots are read with OCR on your computer (Apple Vision on macOS, a bundled tesseract.js elsewhere).
Every outbound request goes through one module that refuses anything not on the allow-list, and a test fails the
build if any other code reaches the network or starts a process. Settings → Network activity shows every request,
and "Test the guard" lets you watch a forbidden one being refused.

## Run it from a checkout

```sh
git clone -b next https://github.com/edspencer/bragdoc-ai.git
cd bragdoc-ai
npm ci
npm start                     # builds, then serves http://localhost:2724
docker compose up -d --build  # or build and run the image
```

## More

- Documentation: the docs site lives in [`website/`](website/) (Getting started, Guarantees, Reference).
- [SECURITY.md](SECURITY.md): what BragDoc guarantees, and how to report a vulnerability.
- [CONTRIBUTING.md](CONTRIBUTING.md); coding agents: [AGENTS.md](AGENTS.md). Releases: [RELEASING.md](RELEASING.md).

## License

[MIT](LICENSE)
