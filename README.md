# BragDoc Local

**A free, open-source, local-first tracker for the things you've done at work.** Keep your achievements, and the
evidence for them (screenshots, PRs, quotes, documents), as plain files on your own machine, on a pinboard you can
throw anything at. When review season comes round, it's all there.

- **Your data is just files**: markdown and YAML in `~/.bragdoc`, readable and editable by you or your coding agent.
- **Nothing leaves your computer** except calls to services you connect yourself, and every one is logged.
- **AI is off** unless you turn it on.

> **Status: v0.1 is in progress on the `next` branch.** Nothing is released yet, and this branch is a skeleton that
> grows PR by PR. Follow along in [#411](https://github.com/edspencer/bragdoc-ai/issues/411).

## Trying the work in progress

You need Node.js 22.12 or later.

```sh
git clone -b next https://github.com/edspencer/bragdoc-ai.git
cd bragdoc-ai
npm ci
npm start             # builds, then serves http://localhost:2724
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Coding agents: [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)
