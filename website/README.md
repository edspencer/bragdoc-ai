# BragDoc documentation site

The [Astro](https://astro.build) 7 + [Starlight](https://starlight.astro.build) 0.42 documentation site for BragDoc, to
be served at **https://bragdoc.ai**. It needs Node 22.12 or later.

Adapted from [Hallway's docs site](https://github.com/edspencer/hallway/tree/main/website) (same stack and structure),
with BragDoc's content, the Scrapbook look, a blog, and no analytics. See [CLAUDE.md](CLAUDE.md) for the content rules
and where it differs from Hallway's.

A standalone package: it is not part of the root `@bragdoc/local` package, so it never affects the app's build, tests
or npm tarball.

## Develop

```bash
cd website
npm install
npm run dev                         # local dev server
npm run build                       # the static site, in dist/
npm run check-links                 # after a build: every internal link and #fragment resolves
npm run check-external              # after a build: nothing is loaded from another origin
```

## Structure

- `src/pages/index.astro` and `src/components/landing/`: the landing page at `/` (outside Starlight). Its copy is all
  in `src/components/landing/copy.ts`.
- `src/content/docs/`: the documentation pages (`.md` / `.mdx`, Starlight frontmatter).
- `src/content/blog/`: blog posts (`title`, `description`, `date`, optional `author` and `draft`), rendered by
  `src/pages/blog/` at `/blog/<file name>/`, with a feed at `/blog/rss.xml`.
- `src/sidebar.mjs`: the hand-maintained sidebar (read by `astro.config.mjs` and by the llms.txt routes).
- `src/site.mjs`: site constants (URL, repo, tagline, the default port, the install command, whether v0.1 is
  released).
- `src/styles/tokens.css`: **every colour and font**, copied from the app's tokens.
- `src/components/Banner.astro`: the banner on every docs page (v0.1's status).
- `src/pages/llms.txt.ts`, `src/pages/llms-full.txt.ts`, `src/pages/[...slug].md.ts`: `/llms.txt`, `/llms-full.txt`
  and every docs page as Markdown, for coding agents, generated from the pages at build time.
- `public/` and `src/assets/mark.svg`: copies of the repo's brand kit (`npm run sync-brand`).

`npm run build` writes the static site to `dist/`, including the Pagefind search index, the sitemap and the RSS feed.

## Screenshots

There are no real captures of the app yet: it isn't built. The landing page's picture of the board
(`src/assets/landing/board-light.png`, `board-dark.png`) is a capture of the Scrapbook **design prototype**, at
1200×800 and 2× scale, in each theme. Every name, company and message in it is invented. Before capturing, the
prototype's AI status pill, its "demo" labels and its "States" control were removed from the page, because v0.1 has
no AI and the demo controls aren't part of the app. The page tags it "Mock-up · design prototype, invented data".

When the app is built (PR19), real captures come from the example dataset through the repo's leak-scanning capture
rig, tagged "Real capture · example data". Check every pixel for host names, paths and real names before committing
one: the repository is public.

## Fonts and brand

The fonts are the app's four, all OFL-licensed and self-hosted from `@fontsource`: Bricolage Grotesque (headings and
the wordmark), Instrument Sans (text), Caveat (handwriting) and Geist Mono (code). The mark, favicons and social card
are copies of the repository's brand kit (`../brand/`, see its README); after it changes, run `npm run sync-brand` and
commit the copies. The root test suite fails while they differ.

## Deploying

This is meant to be built and served by **Cloudflare Pages** straight from the GitHub repo (git integration, no deploy
Action). **Nothing has been set up yet**, and the site is never deployed from CI. To deploy it, Ed:

1. **Creates the Pages project.** Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git →
   `edspencer/bragdoc-ai`, with:

   | Setting | Value |
   | --- | --- |
   | Framework preset | Astro (or None) |
   | Production branch | `next` for now (where the docs live until `next` merges into `main`; then `main`) |
   | Root directory | `website` |
   | Build command | `npm install && npm run build` |
   | Build output directory | `dist` |
   | Node version | 22, from `website/.node-version` (no setting needed) |
   | Environment variables | none (there is no analytics key, or anything else, to set) |

   Under **Settings → Builds → Build watch paths**, include `website/*` so app-only commits don't rebuild the site
   (optional).

2. **Adds the custom domain** `bragdoc.ai` (and `www.bragdoc.ai`, redirecting to it) in the Pages project → Custom
   domains. If the domain's DNS is on Cloudflare, that creates the records itself. The apex currently serves the old
   site, so moving it is the switch-over: do it when the new docs should go live.

Every PR that touches the repo then gets a preview deployment. Until then (and after), the `website` job in the root
`.github/workflows/ci.yml` builds the site and checks its links and third-party requests whenever `website/**` changes.
