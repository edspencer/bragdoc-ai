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

/** WCAG contrast ratio between two luminances (1 to 21). */
export function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const DARK_INK_L = luminance([0x1d, 0x1a, 0x17]);

/**
 * Legible text for any background colour: whichever of near-black and white has the higher contrast on it. That
 * crossover sits near luminance 0.18, and every colour gets at least about 4.2:1 either way (the floor, right at the crossover). The prototype used a fixed
 * 0.36 threshold, which put white on its own green at 2.67:1 and on tomato at 3.39:1 (D34). An unparseable colour
 * gets dark text, on the neutral tape it will be drawn as.
 */
export function inkOn(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return DARK_INK;
  const l = luminance(rgb);
  return contrast(l, DARK_INK_L) >= contrast(l, 1) ? DARK_INK : LIGHT_INK;
}

/**
 * A colour that's safe to paint and to hand to <input type="color">: any hex colour (`#abc`, `ABCDEF`, …) as
 * lowercase `#rrggbb`, and anything else as the neutral tape.
 */
export function safeColour(hex: string | null | undefined): string {
  const rgb = hex ? parseHex(hex) : null;
  return rgb ? `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}` : NEUTRAL_TAPE;
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
