# website/CLAUDE.md

Astro + Starlight **documentation site** for BragDoc, to be served at **https://bragdoc.ai** by **Cloudflare Pages**.
It is not set up yet, and **Ed deploys it himself**: never deploy it, and never touch DNS or Cloudflare (README.md
"Deploying" has the settings he needs). It is a documentation site, never a "marketing site": in names, paths and copy.

Adapted from Hallway's site (`edspencer/hallway`, `website/`), which itself follows Local Review's. **Versions: Astro 7
+ Starlight 0.42 (Node >= 22.12)**, the same as both; the lockfile started as a copy of Hallway's. The Astro 7 notes
there apply here too:

- `compressHTML: true`, because Astro 7's default glues inline text together.
- `overrides: { "postcss-nested": "^7.0.2" }` in `package.json` (an advisory fix; drop it once
  `@expressive-code/core` depends on postcss-nested 7 itself).
- The build prints two expected warnings: `The collection "i18n" does not exist or is empty` (Starlight's optional
  i18n collection), and `Could not render /404 from route /[...slug]` (the docs catch-all deferring to Starlight's own
  404 route, which renders `src/content/docs/404.md`, the not-found page). Ignore them.

`npm audit` in `website/` should report 0 vulnerabilities. Check it when you change dependencies.

This package is **standalone**: NOT part of the root `@bragdoc/local` package. Build it on its own from `website/`. The
build deps are in `dependencies`, not `devDependencies`, so a plain `npm install` under `NODE_ENV=production` still
installs them (that is what Cloudflare's build does).

## Where it differs from Hallway's site, and why

- **No analytics, no CDN, nothing third-party.** Hallway's PostHog snippet and `functions/ingest/` proxy are gone, and
  so is Mermaid (it loads from a CDN). BragDoc promises to send nothing off your machine, and its docs keep the same
  rule: `npm run check-external` fails on any script, stylesheet, image, font or frame from another origin.
- **A blog**, which neither sibling has: the `blog` collection (`src/content/blog/*.md`), rendered by
  `src/pages/blog/` inside Starlight's page frame (`<StarlightPage>`), so it keeps the header, search and theme, with
  an RSS feed at `/blog/rss.xml`. A post with `draft: true` isn't built. The header's "Blog" link is an override of
  Starlight's `SocialIcons` (`src/components/SocialIcons.astro`).
- **The landing page follows the reader's theme** (Hallway's is always dark), because the app has light and dark
  ("lamplight") too. It reads and writes Starlight's own `starlight-theme` key (`public/theme-init.js`,
  `src/scripts/landing.ts`), so a choice made on one side holds on the other.
- **The brand is the repo's brand kit** (`../brand`, from PR4), copied in by `npm run sync-brand` (local-review's
  arrangement), not a placeholder made here. The root `test/docs.test.ts` fails while a copy is stale.
- **The data-folder reference is generated** from the app's schemas: `npm run sync:reference` at the repo root
  rewrites the tables between the `reference:start`/`reference:end` markers in `reference/data-folder.md` (as it does
  for `docs/data-format.md`).

## Content rules

**BragDoc v0.1 isn't released.** While `RELEASED` is `false` in `src/site.mjs`, the Banner, the landing page and the
installation page say the package isn't on npm yet. **Never claim behaviour that isn't built and verified.**

- **Mark what isn't built** with a sticky note at the top of the page: `:::note[Coming in v0.1]` … `:::`, saying in a
  sentence what is and isn't there. Reference pages say `:::note[Tracking \`next\`]` instead. Inline, write
  *Coming in v0.1.* at the start of the paragraph. PR19 replaces these as the features land; the root test suite fails
  if any "Coming in v0.1" is left once `package.json` reaches 0.1.0, or if `RELEASED` disagrees with it.
- **The guarantees are promises: word them exactly.** "Sends nothing off your machine on its own"; "the only
  outbound requests go to services you connect yourself"; "AI is off unless you turn it on" (v0.1 has none). State the
  edges honestly (the `gh` CLI's own traffic isn't visible to BragDoc). Never say "Verified" about a build.
- **The spec is the source of truth** (`../spec.md`, `../docs/`, the epic #411's SPEC). Every claim should be checkable
  against it or the code. Where the spec leaves something open, say so rather than inventing an answer.
- **A documentation site, not marketing.** Explain what it is and how to run it. No selling, no pricing, no
  testimonials, no comparisons, no "join thousands of…". Nothing from the old BragDoc marketing site or blog.
- **Keep it generic**: `example.com`, `acme/web`, `~/Code/my-app`; no employer, machine or real person's names. Never
  mention a date for the hosted app's future.
- **Vocabulary** (SPEC "Vocabulary"): Achievement, Evidence, Board, Found, Source, Folio, Project. Never "stats" or
  "marketing".

Every page needs Starlight frontmatter: `title:` and a real `description:` (llms.txt and search use it; quote values
with a colon). The root `test/docs.test.ts` checks both, that every page is in the sidebar, that every
`localhost:<port>` is 2724 (`DEFAULT_PORT` in `src/site.mjs`, a copy of `../server/port.ts`), that every `BRAGDOC_*`
variable the code reads (apart from the test suite's own, listed in the test) is on `reference/environment.md`, that `reference/cli.md` has a section per command and every
`serve` flag, and (once `server/mcp/` exists) that `agents/mcp.md` lists exactly the registered tools.

**What's new.** `whats-new.md` keeps one `## Coming in <version>: <title>` section headed "Not released yet." for the
next release; `../scripts/whats-new-release.mjs` gives it the real version at `changeset version` time, and
`../test/release.test.ts` checks a released version is never "coming".

**Links.** Link pages site-relative with the trailing slash (`/reference/cli/`). After a build,
`npm run check-links` checks every internal link and `#fragment` in `dist/`, and `npm run check-external` that nothing
is loaded from elsewhere (its parser is pinned by fixtures in `test/docs.test.ts`) (the `website` job in the root `ci.yml` runs the build and both whenever `website/**` changes).

## Sidebar

Maintained **by hand** in `src/sidebar.mjs` (also read by the llms.txt routes). Starlight does NOT auto-discover pages:
add new pages there. Never point a sidebar entry at `/` (the landing page is outside Starlight). The blog isn't in the
sidebar.

## Landing page

`src/pages/index.astro` is a custom page outside Starlight with its own layout (`LandingLayout.astro`), styles
(`src/styles/landing.css`) and script (`src/scripts/landing.ts`). All its copy is in
`src/components/landing/copy.ts`. Because it is outside Starlight, head tags, fonts and the theme are re-provided by
`LandingLayout.astro`: change a site-wide head tag in `astro.config.mjs` and check whether the layout needs it too.

Its picture of the board is a capture of the **design prototype** with invented data, tagged "Mock-up"
(`src/assets/landing/board-{light,dark}.png`; the AI status pill and the prototype's demo controls were removed before
capture, because v0.1 has neither). PR19 replaces it with a real capture of the app on the example dataset, tagged
"Real capture · example data". Check every pixel of any capture for real names, hosts and paths: the repo is public.

## Design tokens

All colours and fonts are CSS variables in `src/styles/tokens.css`, copied from the app's `src/styles.css` (each names
its app token), imported by both `custom.css` (docs) and `landing.css`. Keep them in step with the app. **Tomato is a
fill, not small text on light grounds** (3.1:1 on oat): the light theme's text accent is the darker
`--bd-accent-text`, and a tomato fill carrying white text (the current-page pill, primary buttons) uses the deeper
`--bd-accent-fill` (4.97:1). Fonts are the app's four, self-hosted from `@fontsource`: Bricolage Grotesque (headings,
wordmark), Instrument Sans (text), Caveat (handwriting), Geist Mono (code).

## Previewing under a process supervisor

`astro preview` detaches itself when it isn't on a TTY, which a process supervisor can't track. Under a supervisor,
serve `dist/` with any static file server instead.
