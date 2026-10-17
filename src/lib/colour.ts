// Colour helpers for project colours, which can be any colour the user picks (SPEC R6). Pure functions: they're
// tested in test/colour.test.ts. Ported from the Scrapbook prototype (state.tsx `inkOn`, Projects.tsx swatches,
// ui.tsx `tilt`).

/** The twelve tape swatches offered for a project; "Any colour" opens the native picker on top of these. */
export const PROJECT_SWATCHES = [
  '#ef5a3c',
  '#f5a524',
  '#e8c547',
  '#2fb37e',
  '#14a3a3',
  '#3b6cf6',
  '#6a5cf0',
  '#a25ddc',
  '#e05aa8',
  '#8a6a4f',
  '#5f6b7a',
  '#1d1a17',
] as const;

/** What a project without a colour gets: a neutral tape that reads on both boards. */
export const NEUTRAL_TAPE = '#948b7e';

const DARK_INK = '#1d1a17';
const LIGHT_INK = '#ffffff';

/** `#rgb` or `#rrggbb` (any case) → [r, g, b] in 0–255, or null for anything else. */
export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Legible text for any background colour: near-black on light colours, white on dark ones. The threshold is where
 * white text drops to 3:1 contrast (luminance 0.30), so whichever ink is picked, any colour gets at least 3:1 (the
 * dark side gets 5.7:1 or more). The prototype used 0.36, which put white on its green at 2.67:1 (D24). An
 * unparseable colour gets dark text, on the neutral tape it will be drawn as.
 */
export function inkOn(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return DARK_INK;
  return luminance(rgb) > 0.3 ? DARK_INK : LIGHT_INK;
}

/** A colour that's safe to paint: the input if it's a hex colour, else the neutral tape. */
export function safeColour(hex: string | null | undefined): string {
  return hex && parseHex(hex) ? hex : NEUTRAL_TAPE;
}

/**
 * A small, stable rotation for a piece of paper, in degrees within ±max, from its id. The same card always sits at
 * the same angle, so the board doesn't shuffle on every render.
 */
export function tilt(id: string, max = 1.4): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return ((h % 100) / 100 - 0.5) * 2 * max;
}
