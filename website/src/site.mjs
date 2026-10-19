// @ts-check
/**
 * Site-wide constants, in one place.
 *
 * Plain .mjs rather than .ts because astro.config.mjs imports it too, and the
 * config is loaded before any TypeScript tooling is in play. test/docs.test.ts
 * (in the root suite) imports it as well, to keep these copies in step with the app.
 */

export const SITE_URL = 'https://bragdoc.ai';
export const REPO_URL = 'https://github.com/edspencer/bragdoc-ai';
/** Where v0.1 is being built until it merges into main: links into the code point here. */
export const CODE_BRANCH = 'next';
export const TITLE = 'BragDoc';
export const TAGLINE = 'A local-first, open-source record of the work you did, and the evidence for it';

/**
 * The port BragDoc serves on by default.
 *
 * 2724 spells "BRAG" on a phone keypad (D6 in docs/decisions.md). A copy of
 * DEFAULT_PORT in the app's server/port.ts: Cloudflare builds with website/ as
 * its root, so it can't be imported from there. test/docs.test.ts checks the two
 * match. Code blocks can't interpolate, so Markdown pages write the number out
 * (and the same test checks every `localhost:<port>` in them).
 */
export const DEFAULT_PORT = 2724;
export const LOCAL_URL = `http://localhost:${DEFAULT_PORT}`;

/** The npm package, and the command that runs it without installing anything. */
export const PACKAGE = '@bragdoc/local';
export const INSTALL_COMMAND = `npx ${PACKAGE}`;

/**
 * Is a release on npm yet? While this is false, every page that shows the
 * install command says it doesn't work yet (the Banner, the landing page and
 * getting-started/installation.md; the Banner has both wordings). The first
 * release flips it by itself: `npm run changeset:version` (the version PR) runs
 * scripts/whats-new-release.mjs, which sets it once package.json is 0.1.0 or later.
 */
export const RELEASED = true;
