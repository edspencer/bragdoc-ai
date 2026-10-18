// The shots the docs site, README and PRs are made from. capture.ts runs them; each one says what it's for, so a stale
// image can be traced back to whatever uses it. Adapted from Local Review's tools/docs-media/shots.ts.
//
// route:     a URL path
// theme:     'light' (default) or 'dark': the stored theme choice and the browser's colour scheme both
// viewport:  CSS px, default 1440×900; `MOBILE` is 390×844
// actions:   what to do after the page has loaded, in order (Playwright selectors)
// capture:   'viewport' (default), 'page' (the whole scrollable page) or a crop: the box around one or more
//            elements, with `pad` CSS px around it and `zoom` (device pixels per CSS px, on top of the 2x default)
// data:      'empty' (default: a fresh data home) or 'example': the example world capture.ts seeds (PR16's example
//            data at SHOT_NOW, Alex Marlowe's profile, GitHub through the fake gh, a screenshot in a watched folder)
//
// The docs site uses the `docs-*` and `landing-*` shots: a page refers to website/src/assets/shots/<name>.png (or
// assets/landing/), and `npm run docs:media:sync` copies exactly those out of out/. test/docs.test.ts fails on a page
// that uses a shot this file doesn't list, or one that isn't committed.

export type Action =
  | { click: string }
  | { hover: string }
  | { press: string }
  | { waitFor: string }
  | { wait: number }
  | { fill: string; text: string }
  | { scrollTo: string };

export interface Crop {
  selector: string | string[]; // several: the box around all of them (each one's first match)
  pad?: number; // CSS px, default 16
  zoom?: number; // default 1: the shot's own 2x
}

export interface Shot {
  name: string; // the file: out/<name>.png
  doc: string;
  route: string;
  theme?: 'light' | 'dark';
  viewport?: { width: number; height: number };
  actions?: Action[];
  capture?: 'viewport' | 'page' | Crop;
  data?: 'empty' | 'example';
}

export const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
export const MOBILE = { width: 390, height: 844 };

/**
 * The browser's clock in the empty-home shots, so "This week" and relative dates never drift. A Saturday. The example
 * world's shots use the time of the run instead (capture.ts says why); its example data is placed at that day.
 */
export const SHOT_NOW = '2026-10-17T12:00:00Z';

const both = (s: Omit<Shot, 'theme' | 'name'> & { name: string }): Shot[] => [
  { ...s, name: `${s.name}-light`, theme: 'light' },
  { ...s, name: `${s.name}-dark`, theme: 'dark' },
];

export const SHOTS: Shot[] = [
  ...both({ name: 'kit', doc: 'Every kit component (/dev/kit), the whole page: the PR4 reference for the Scrapbook look', route: '/dev/kit', capture: 'page' }),
  ...both({ name: 'kit-board', doc: 'The sample board on /dev/kit: week headers, masonry, cards with every evidence kind', route: '/dev/kit', capture: { selector: '[data-testid="kit-board"]', pad: 24 }, viewport: { width: 1440, height: 2400 } }),
  ...both({ name: 'kit-mobile', doc: '/dev/kit at 390 px: single column, bottom tabs', route: '/dev/kit', viewport: MOBILE }),
  ...both({ name: 'shell-board', doc: 'The shell on the board page of an empty data home', route: '/' }),
  ...both({ name: 'shell-board-mobile', doc: 'The shell at 390 px: bottom tab bar, no overflow', route: '/', viewport: MOBILE }),
  ...both({ name: 'shell-settings', doc: 'Settings with its notebook-divider tabs', route: '/settings/network' }),
  ...both({ name: 'shell-welcome', doc: 'The first-run page, without the header', route: '/welcome' }),
  ...both({ name: 'shell-not-found', doc: 'An unknown address', route: '/nothing/here' }),

  // The docs site (PR19): the example world, light and dark.
  ...both({ name: 'landing-board', doc: 'The landing page\'s picture of the board (website/src/pages/index.astro)', route: '/', data: 'example', viewport: { width: 1280, height: 860 } }),
  ...both({ name: 'docs-board', doc: 'The board: composer, Found strip, example strip, this week\'s cards (concepts/board)', route: '/', data: 'example', viewport: { width: 1440, height: 1100 } }),
  ...both({ name: 'docs-board-mobile', doc: 'The board at 390 px (concepts/board)', route: '/', data: 'example', viewport: MOBILE }),
  ...both({ name: 'docs-composer', doc: 'The composer with a line typed: projects, repos, impact, date (getting-started/quickstart)', route: '/', data: 'example', actions: [{ fill: '[data-testid="composer-text"]', text: 'Ran the quarterly game day for on-call\nFour scenarios, two real gaps found in the runbook.' }], capture: { selector: '[data-testid="composer"]', pad: 20 } }),
  ...both({ name: 'docs-found', doc: 'Found with GitHub and screenshot candidates (concepts/found-and-sources)', route: '/found', data: 'example', viewport: { width: 1440, height: 1100 } }),
  ...both({ name: 'docs-projects', doc: 'Projects: the timeline by company (concepts/projects)', route: '/projects', data: 'example', viewport: { width: 1440, height: 1000 } }),
  ...both({ name: 'docs-folio', doc: 'Folio: window, filters, clippings and the printout (concepts/folio)', route: '/folio', data: 'example', viewport: { width: 1440, height: 1100 } }),
  ...both({ name: 'docs-sources', doc: 'Settings → Sources: the GitHub and screenshots folder cards, both on (concepts/found-and-sources)', route: '/settings/sources', data: 'example', capture: { selector: ['[data-testid="source-github"]', '[data-testid="source-screenshots"]'], pad: 20 }, viewport: { width: 1440, height: 1100 } }),
  ...both({ name: 'docs-agents', doc: 'Settings → Sources: the agents card, MCP address, hidden token and the install command (agents/mcp)', route: '/settings/sources', data: 'example', capture: { selector: '[data-testid="source-agents"]', pad: 20 }, viewport: { width: 1440, height: 1500 } }),
  ...both({ name: 'docs-network', doc: 'Settings → Network activity after a GitHub check and a "Test the guard" refusal, both made while seeding (guarantees/network-activity)', route: '/settings/network', data: 'example', viewport: { width: 1440, height: 1000 } }),
  ...both({ name: 'docs-welcome', doc: 'Welcome, the first run (getting-started/quickstart)', route: '/welcome', viewport: { width: 1440, height: 1000 } }),
];
