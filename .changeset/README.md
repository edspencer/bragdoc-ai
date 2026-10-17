# Changesets

Each markdown file here is a pending changelog entry: which bump it needs (patch, minor or major) and a summary for
users. `npm run changeset` writes one. On the next release they're consumed into `CHANGELOG.md` and the version in
`package.json`, by the "chore: version packages" PR the Release workflow opens.

When a PR needs one and how to write it: [CONTRIBUTING.md](../CONTRIBUTING.md#changesets). How releases work:
[RELEASING.md](../RELEASING.md). The tool: [changesets.dev](https://changesets.dev).
