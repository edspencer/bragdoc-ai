# Releasing BragDoc Local

BragDoc Local will be published to npm as `@bragdoc/local`, and as a Docker image on GHCR. Every release will come from
GitHub Actions, with npm trusted publishing and provenance, after CI has passed on the exact commit being released.
Nobody publishes from a laptop. This is the same pipeline as the sibling projects
[Hallway](https://github.com/edspencer/hallway/blob/main/RELEASING.md) and
[Local Review](https://github.com/edspencer/local-review/blob/main/RELEASING.md).

> **Status: nothing is released, and the release machinery doesn't exist yet.** It arrives with PR6 of
> [#411](https://github.com/edspencer/bragdoc-ai/issues/411): Changesets, `release.yml` (manual trigger only until
> the release channel is decided), `smoke:pack`, the Docker image, build info and attestations. PR6 fills in this
> document.

## How a release will happen

1. PRs carry changesets naming the bump and a summary for users.
2. The release workflow keeps a "chore: version packages" PR open that consumes them into `CHANGELOG.md` and bumps
   `version`.
3. Merging it releases: verify CI on the merge commit, build and push the image, publish to npm (last, because it's
   the irreversible step), check provenance landed, then tag and create the GitHub release.

## Maintainer settings

To be listed by PR6: the npm trusted publisher, the first-publish placeholder (npm can't use OIDC for a package's
very first publish), workflow permissions, and private vulnerability reporting.
