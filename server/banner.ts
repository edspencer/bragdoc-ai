// What `bragdoc serve` prints once it's listening. Adapted from Hallway's banner.ts (itself modelled on Local Review's):
// hand-rolled, no dependency, a 12-pixel-high font drawn with half blocks (▀ ▄ █), so it's 6 rows and fits an
// 80-column terminal, coloured from kraft paper to marigold (Scrapbook's sticky notes, D13).
//
// One difference from the siblings, and it matters: **the "BragDoc on <url>" line is always the FIRST line on stdout**,
// with "Data home:" right after it. Scripts and tests wait for it (test/cli.test.ts, e2e/, smoke-pack from PR6), and a
// banner printed above it would push it down. So the art comes after those two lines, never before. --quiet prints
// the first line alone.
//
// The banner and the hints are only for a person at a terminal: none when stdout isn't a TTY (piped, the service's log,
// CI) unless FORCE_COLOR is set, a one-line title when the terminal is too narrow. Without them the version is a plain
// "Version:" line. Colour follows Node's own rules (tty.WriteStream#getColorDepth: NO_COLOR, FORCE_COLOR, TERM=dumb,
// COLORTERM).
import tty from 'node:tty';

// Each glyph: 12 pixel rows, `#` set. Rows pair up into one text row each.
const FONT: Record<string, string[]> = {
  B: ['#####.', '######', '##..##', '##..##', '##..##', '#####.', '#####.', '##..##', '##..##', '##..##', '######', '#####.'],
  R: ['#####.', '######', '##..##', '##..##', '##..##', '######', '#####.', '##.##.', '##..##', '##..##', '##..##', '##..##'],
  A: ['.####.', '######', '##..##', '##..##', '##..##', '##..##', '######', '######', '##..##', '##..##', '##..##', '##..##'],
  G: ['.####.', '######', '##..##', '##....', '##....', '##....', '##.###', '##.###', '##..##', '##..##', '######', '.####.'],
  D: ['#####.', '######', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '######', '#####.'],
  O: ['.####.', '######', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '######', '.####.'],
  C: ['.####.', '######', '##..##', '##....', '##....', '##....', '##....', '##....', '##....', '##..##', '######', '.####.'],
};

/** The banner's lines, uncoloured: `text` drawn in FONT, one column between letters. */
export function bannerLines(text = 'BRAGDOC'): string[] {
  const glyphs = [...text].map((ch) => FONT[ch]!);
  const px = Array.from({ length: 12 }, (_, y) => glyphs.map((g) => g[y]).join('.'));
  const out: string[] = [];
  for (let y = 0; y < 12; y += 2) {
    let line = '';
    for (let x = 0; x < px[y]!.length; x++) {
      const top = px[y]![x] === '#';
      const bottom = px[y + 1]![x] === '#';
      line += top && bottom ? '█' : top ? '▀' : bottom ? '▄' : ' ';
    }
    out.push(line.trimEnd());
  }
  return out;
}

type Rgb = [number, number, number];
// left to right: kraft paper (lifted to read on black), marigold (the sticky notes), and a deeper amber that still
// reads on a light terminal
const STOPS: Rgb[] = [
  [196, 150, 104],
  [242, 176, 62],
  [222, 140, 48],
];
function gradient(t: number): Rgb {
  const s = Math.min(STOPS.length - 2, Math.floor(t * (STOPS.length - 1)));
  const f = t * (STOPS.length - 1) - s;
  return STOPS[s]!.map((v, i) => Math.round(v + (STOPS[s + 1]![i]! - v) * f)) as Rgb;
}

/** An SGR foreground colour for `rgb` at a colour depth (24, 8 or 4 bits; 1: none). */
function fg([r, g, b]: Rgb, depth: number): string {
  if (depth >= 24) return `\x1b[38;2;${r};${g};${b}m`;
  if (depth >= 8) {
    const c = (v: number) => Math.round((v / 255) * 5);
    return `\x1b[38;5;${16 + 36 * c(r) + 6 * c(g) + c(b)}m`;
  }
  return '\x1b[33m'; // 16 colours: yellow
}
const RESET = '\x1b[0m';

export interface Terminal {
  isTTY?: boolean;
  columns?: number;
  env: NodeJS.ProcessEnv;
  /** Colour depth (bits); default: Node's own detection for this env. */
  depth?: number;
}

/** Node's colour detection, for a TTY or not: FORCE_COLOR wins over NO_COLOR, as in Node and force-color.org. */
export function colorDepth(t: Terminal): number {
  if (t.depth !== undefined) return t.depth;
  const forced = t.env.FORCE_COLOR !== undefined;
  if (!t.isTTY && !forced) return 1;
  return tty.WriteStream.prototype.getColorDepth.call(null, t.env);
}

function paint(line: string, width: number, depth: number): string {
  if (depth < 4) return line;
  let out = '';
  let last = '';
  for (let x = 0; x < line.length; x++) {
    const ch = line[x]!;
    if (ch === ' ') {
      out += ch;
      continue;
    }
    const code = fg(gradient(width > 1 ? x / (width - 1) : 0), depth);
    if (code !== last) out += code;
    last = code;
    out += ch;
  }
  return out + RESET;
}

const bold = (s: string, depth: number) => (depth >= 4 ? `\x1b[1m${s}\x1b[22m` : s);
const dim = (s: string, depth: number) => (depth >= 4 ? `\x1b[2m${s}\x1b[22m` : s);

export interface Startup {
  version: string;
  /** The server's address as people should open it: `http://localhost:2724`. */
  url: string;
  /** The data home, as people see it (`~/.bragdoc`). */
  home: string;
  /** Running from npx's cache or the like (platform/spec.ts, transientInstall): where, for the hint. */
  transient?: string | null;
  quiet?: boolean;
}

/** The startup text, for a terminal (or not: `t.isTTY`). The first line is always "BragDoc on <url>". */
export function startupMessage(o: Startup, t: Terminal = { env: {} }): string {
  const line = `BragDoc on ${o.url}`;
  if (o.quiet) return line + '\n';
  const depth = colorDepth(t);
  const out = [line, `Data home: ${o.home}`];
  const showBanner = t.isTTY || (t.env.FORCE_COLOR !== undefined && depth > 1);
  if (!showBanner) {
    out.push(`Version: ${o.version}`);
    return out.join('\n') + '\n';
  }
  const lines = bannerLines();
  const width = Math.max(...lines.map((l) => l.length));
  // 2 columns of margin; narrower than that, a one-line title rather than a wrapped banner. 0 or unset: the terminal
  // didn't say (a bare pty), so assume the usual 80
  if ((t.columns || 80) >= width + 2) out.push('', ...lines.map((l) => ' ' + paint(l, width, depth)), ' ' + dim(`v${o.version}`, depth), '');
  else out.push('', ' ' + bold(paint('▌ BRAGDOC', 9, depth), depth) + ' ' + dim(`v${o.version}`, depth), '');
  out.push(`Using a coding agent? ${bold('bragdoc guide', depth)} prints what it needs to know.`);
  if (o.transient)
    out.push('', `Running from ${o.transient}, so it stops with this terminal. To keep it running:`, `  ${bold('npm i -g @bragdoc/local && bragdoc service install', depth)}`);
  return out.join('\n') + '\n';
}
