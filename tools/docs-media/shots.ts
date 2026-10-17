// The shots the docs site, README and PRs are made from. capture.ts runs them; each one says what it's for, so a stale
// image can be traced back to whatever uses it. Adapted from Local Review's tools/docs-media/shots.ts.
//
// route:     a URL path
// theme:     'light' (default) or 'dark': the stored theme choice and the browser's colour scheme both
// viewport:  CSS px, default 1440×900; `MOBILE` is 390×844
// actions:   what to do after the page has loaded, in order (Playwright selectors)
// capture:   'viewport' (default), 'page' (the whole scrollable page) or a crop: the box around one or more
//            elements, with `pad` CSS px around it and `zoom` (device pixels per CSS px, on top of the 2x default)
//
// Until example data exists (PR16), every shot is of an empty data home or of /dev/kit's invented content. Feature
// PRs add their shots here; PR19 re-shoots everything for the docs.

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
}

export const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
export const MOBILE = { width: 390, height: 844 };

/** The browser's clock in every shot, so "This week" and relative dates never drift. A Saturday. */
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
];
