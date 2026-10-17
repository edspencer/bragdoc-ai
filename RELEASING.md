# Releasing BragDoc Local

BragDoc Local is published to npm as `@bragdoc/local`, and as a multi-arch Docker image at `ghcr.io/edspencer/bragdoc`.
Every release comes from GitHub Actions (`.github/workflows/release.yml`), with npm trusted publishing and provenance,
after CI has passed on the exact commit being released. Nobody publishes from a laptop, and no npm token exists. This
is the same pipeline as the sibling projects [Hallway](https://github.com/edspencer/hallway/blob/main/RELEASING.md)
and [Local Review](https://github.com/edspencer/local-review/blob/main/RELEASING.md), plus Paddock's image jobs and
artifact attestations.

> **Status: nothing is released, and the pipeline is dormant.** `release.yml` has no push trigger; it runs only when
> started by hand, and then as a dry run unless you untick it. It can't publish anything until the one-time setup
> below is done. The release channel (`next` or `latest` on npm, #411 Q1) is still open, so the workflow asks for it.

## One-time setup (Ed, before the first release)

In this order. Steps 1–3 need a logged-in npm owner of the `@bragdoc` scope; the rest need admin on the repo.

1. **Publish a code-free placeholder, by hand.** A trusted publisher can only be attached to a package that already
   exists, and a new package's first publish can't be done over OIDC
   ([npm/cli#8544](https://github.com/npm/cli/issues/8544)). In an empty directory, outside any checkout:

   ```sh
   cat > package.json <<'JSON'
   {
     "name": "@bragdoc/local",
     "version": "0.0.1",
     "description": "Placeholder for BragDoc Local, a local-first tracker for your achievements at work. Not usable yet.",
     "license": "MIT",
     "repository": { "type": "git", "url": "git+https://github.com/edspencer/bragdoc-ai.git" }
   }
   JSON
   printf '# @bragdoc/local\n\nA placeholder: BragDoc Local is not released yet. See https://github.com/edspencer/bragdoc-ai\n' > README.md
   npm publish --access public
   ```

   No code, no `bin`, no dependencies: 0.0.1 is the only version that will ever come from a laptop, and it's
   permanently unattested, so it holds nothing to trust. Until the first real release reaches `latest`,
   `npx @bragdoc/local` resolves to it and fails ("could not determine executable to run").
2. **Attach the trusted publisher.** npmjs.com → `@bragdoc/local` → Settings → Trusted publishing → GitHub Actions:
   owner `edspencer`, repository `bragdoc-ai`, workflow filename `release.yml`, environment left empty. Under its
   **Allowed actions**, tick **npm publish** (a new trusted publisher otherwise allows only staged publishes, and the
   first run fails with `E403 … OIDC permission denied for this action`). Renaming `release.yml`, or moving the publish
   to another workflow file, breaks publishing until this is updated.
3. **Lock the package down.** Same settings page → Publishing access → **Require two-factor authentication and
   disallow tokens**.
4. **Let Actions open the version PR.** GitHub → Settings → Actions → General → Workflow permissions → tick **Allow
   GitHub Actions to create and approve pull requests**.
5. **Make "Run workflow" reachable.** GitHub only offers a manual run (and `gh workflow run`) for workflows that exist
   on the **default branch**, which is `main`, and `release.yml` lives on `next` until `next` merges into `main`. So
   before then, either make `next` the default branch for the release, or wait for the merge. (Until then, the
   workflow's dry runs happen on pull requests that change it.)
6. **After the first image push:** GitHub → your profile → Packages → `bragdoc` → Package settings. A new GHCR package
   is private: change its visibility to **Public**, and check it's linked to `edspencer/bragdoc-ai` (the image's
   `org.opencontainers.image.source` label does that) with Actions write access. Without public visibility,
   `docker pull` and `gh attestation verify oci://…` fail for everyone else.
7. Optional: private vulnerability reporting (Settings → Code security), which [SECURITY.md](SECURITY.md) points to,
   and a ruleset on `next` requiring the **CI passed** check.

**The first release must be 0.1.0, not 0.0.1**, which the placeholder holds: its changesets need one `minor` (PR17,
the v0.1 release candidate, adds it). The workflow refuses to release 0.0.1.

After the first real release reaches `latest`: `npm deprecate @bragdoc/local@0.0.1 "placeholder, use the latest version"`.

## How a release happens

1. **PRs carry changesets.** A PR with a user-facing change adds a `.changeset/*.md` file naming the bump (patch before
   1.0) and a summary for users ([CONTRIBUTING.md](CONTRIBUTING.md#changesets)).
2. **Open the version PR.** Actions → Release → Run workflow, on `next`, with **dry-run unticked**. While changesets
   are pending, that run opens (or updates) a PR titled **"chore: version packages"** (branch
   `changeset-release/next`), which consumes the changesets into `CHANGELOG.md`, bumps `version` in `package.json` and
   refreshes `package-lock.json`. Nothing else happens on that run.
3. **Merge the version PR, then run the workflow again** (same choices, plus the **dist-tag**: `next` for a preview,
   `latest` for everyone). Now there are no changesets left and the version has no `v<version>` tag, so it releases:
   - `verify-ci`: wait for the CI run on that commit and require it to have passed (see below);
   - `pack`: build the package as an **official build** and run `npm run smoke:pack` on it (pack, global install into a
     temp prefix with a throwaway HOME, boot, fetch). That exact tarball is what gets published;
   - `build-image`: build the image on native amd64 and arm64 runners, start each and wait for its health check
     (`scripts/smoke-image.sh`), then push it to GHCR by digest;
   - `publish-image`: merge the digests into `ghcr.io/edspencer/bragdoc:<version>` and `:<dist-tag>`, then attest its
     build provenance, pushed to the registry next to it (each architecture's SPDX SBOM is attested in `build-image`);
   - `publish-npm`: `npm publish <tarball> --tag <dist-tag>` with provenance, then check the attestation is visible on
     the registry. **npm goes last**, after the image, because it's the one step that can't be undone;
   - `github-release`: attest the tarball, create the tag `v<version>` and a GitHub Release (a prerelease for `next`)
     whose notes are that version's `CHANGELOG.md` section, with the tarball and its `SHA256SUMS` attached.

So you decide *when* to release by running the workflow, and *what* the version is by the changesets. Nobody edits
`version` by hand. The tag and the Release come after npm, so a `v<version>` tag always means that version is on npm.

When the release channel is decided (#411 Q1), a push trigger can replace step 2's manual run, as Hallway's does.
`changeset:version` also runs `scripts/whats-new-release.mjs` (Local Review's), which gives the docs site's What's new
page (`website/src/content/docs/whats-new.md`) its released heading: write the upcoming section by hand as
`## Coming in <version>: <title>` with "Not released yet." under it, and the version PR renames it to the version
actually released. `test/whats-new.test.ts` fails if a released version is still "coming". **For 0.1.0**, the version
PR also needs `RELEASED` flipped in `website/src/site.mjs` and every "Coming in v0.1" note on the site replaced
(PR19); `test/docs.test.ts` fails it until both are done.

### Build info: "official" is a claim, not a proof

Every `npm run build` writes `dist/build-info.json` (`scripts/build-info.mjs`): the version, the commit, the build time
(`SOURCE_DATE_EPOCH`, which the release sets to the commit's time), the Actions run, and `official`, which is true only
for this workflow's real releases. The server reports it at `GET /api/meta`, and About → Verify this build shows it.
Anyone can write that file, so the app never says "verified": it shows what the build claims and how to check it
independently:

```sh
npm audit signatures                                   # in a project that installed it: registry signatures + provenance
npm view @bragdoc/local@<version> dist.integrity       # compare with the installed package's integrity
gh attestation verify oci://ghcr.io/edspencer/bragdoc:<version> -R edspencer/bragdoc-ai
gh attestation verify bragdoc-local-<version>.tgz -R edspencer/bragdoc-ai   # the tarball from the GitHub Release
```

### The version PR's CI

The version PR is opened by `github-actions[bot]` with the workflow's `GITHUB_TOKEN`, and GitHub doesn't run CI for it
the usual way. Two consequences:

- **A required check never reports on it.** If a ruleset requires `CI passed`, close and reopen the PR (a person
  reopening it triggers CI), or merge with a bypass.
- **You can't ship unverified regardless.** CI on the push to `next` does run (a person merged it), and `verify-ci`
  blocks the publish unless that run concluded `success` on that exact commit. If it failed for a reason you judge
  unrelated (a flake), re-run CI until it's green, then re-run the Release workflow.

## npm auth: trusted publishing

The `publish-npm` job authenticates with **OIDC trusted publishing**. There is no `NPM_TOKEN` secret, and there must
never be one: once step 3 above is done, a token couldn't publish anyway. What makes it work:

- the trusted publisher on npmjs.com (step 2);
- `permissions: id-token: write` on the job, and `actions/setup-node` with `registry-url: https://registry.npmjs.org`
  (without it npm never tries to authenticate);
- npm ≥ 11.5.1 (Node 22 ships npm 10, so the job installs `npm@^11.5.1`);
- `publishConfig` in `package.json`: `access: public` and `provenance: true`. Trusted publishing would attest
  provenance on its own; asking explicitly makes a missing attestation an error, and the job then checks that it
  landed (`npm view @bragdoc/local@<version> dist.attestations.provenance`).

## When something goes wrong

The pipeline is built so that re-running it finishes a half-done release. npm will never accept the same version twice
(and unpublishing is only possible for 72 hours, and frees nothing: the version number stays burned).

- **The version PR has wrong notes or the wrong bump.** Fix the changesets on `next` in a normal PR; the next run
  rewrites the version PR. Don't hand-edit the version PR.
- **`verify-ci` failed.** Nothing was published. Fix `next`, or re-run CI and then re-run Release.
- **`pack` or `build-image` failed.** Nothing was published. A smoke test failing here is a real bug in the release:
  fix it on `next`.
- **`publish-image` failed.** The per-arch images may be on GHCR by digest, untagged; nothing was published to npm.
  Fix the cause and re-run the failed jobs: attesting again is harmless.
- **`publish-npm` failed before publishing** (auth, network). Nothing is on npm and there's no tag. An auth failure
  (`E404`/`ENEEDAUTH`) almost always means the trusted publisher doesn't match the repo, the workflow file name or the
  job's `id-token` permission. `E403 … OIDC permission denied for this action`: tick **npm publish** under the trusted
  publisher's Allowed actions, then re-run the failed jobs. If it fails at the token exchange with `package not
  found` (E404), check [npm/cli#9969](https://github.com/npm/cli/issues/9969).
- **Published, but a later step failed** (the provenance check timed out, or the GitHub Release step failed). The
  version is on npm and there's no `v<version>` tag. Use **Re-run failed jobs** on *that* run: it reuses the run's
  tarball and image, skips the publish ("already on npm") and finishes the provenance check, the tag and the Release.
  Don't start a fresh run for it: a new run rebuilds, and its tarball (whose `build-info.json` names the run) isn't
  the one on npm. The workflow refuses to attach a tarball that doesn't match npm's integrity, and never moves an
  existing `:<version>` image tag, so a fresh run fails at the Release instead of shipping a mismatch.
- **A bad version is out.** Don't try to replace it: fix forward with a new changeset (a patch) and release it.
  `npm deprecate @bragdoc/local@<bad> "<why; use x.y.z>"` warns anyone who installs it.

**Never publish from a laptop to fix any of this.** A manual publish has no provenance, and the package disallows
token publishing anyway. Everything goes through the workflow.

## Dry runs

A dry run (the default for a manual run, and what every pull request that changes `release.yml` gets) goes through
the whole release without publishing: it builds and smoke-tests the package, builds and starts both images, and runs
`npm publish --dry-run`, then stops. It opens no version PR, pushes nothing, tags nothing, attests nothing.

Locally:

```sh
npx changeset status --verbose --since=origin/next   # what the next version would be, and which changesets make it
npm publish --dry-run            # builds (prepack) and lists exactly what would go into the tarball
npm run smoke:pack               # packs, installs and runs the package as a user would (CI runs this too)

# the image, checked the way CI checks it (it publishes on 127.0.0.1:2724: stop anything else there first)
sha="$(git rev-parse HEAD)"
docker build --build-arg GITHUB_SHA="$sha" -t bragdoc:local .
scripts/smoke-image.sh bragdoc:local "$(node -p "require('./package.json').version")" "$sha" false
```

`npm publish --dry-run` warns that you aren't logged in; that's expected and harmless. To see what the version PR
would change, run `npm run changeset:version` in a scratch clone, not your working copy (it rewrites `package.json`,
`CHANGELOG.md` and the lockfile, and deletes the changesets). Use npm 11 for it: npm 10 rewrites the lockfile
differently.
