// `npm run eval:screenshots [-- --ocr] [--out <dir>] [--every <n>]`: how well the screenshot rules do, on the
// synthetic fixtures (test/screenshots.ts). Prints precision and recall per label, and every hand-made case's outcome.
//
// - Without --ocr: the rules on each message's text as a perfect OCR would read it (fast: all 218 messages).
// - With --ocr: each message is rendered to PNG and read by the real OCR (tesseract.js here; Vision too on macOS),
//   with the network stubbed to fail, then the rules run on what it read. --every 3 reads every third message.
// - --out <dir> also writes the PNGs (for `bragdoc dev ocr`, or to look at).
//
// Precision and recall are over the messages labelled keep: true (wins) or false; "ambiguous" ones are left out, as in
// the Found spike.
import fs from 'node:fs';
import path from 'node:path';
import { compileRules } from '../shared/rules/screenshot.ts';
import { ALEX, CASES, DATASET, datasetShot, png } from '../test/screenshots.ts';

const argv = process.argv.slice(2);
const useOcr = argv.includes('--ocr');
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : undefined;
const every = argv.includes('--every') ? Number(argv[argv.indexOf('--every') + 1]) : 1;
if (out) fs.mkdirSync(out, { recursive: true });

// no network, here or (via its own adapter) in tesseract's worker
(globalThis as unknown as { fetch: unknown }).fetch = () => Promise.reject(new Error('no network in the eval'));

const rules = compileRules(ALEX);
const ocr = useOcr ? (await import('../server/ocr/index.ts')).createOcr() : null;
const read = async (svg: string, zoom: number, name: string, ideal: string) => {
  if (!ocr && !out) return { text: ideal, engine: 'none' };
  const image = png(svg, zoom);
  if (out) fs.writeFileSync(path.join(out, `${name}.png`), image);
  if (!ocr) return { text: ideal, engine: 'none' };
  const r = await ocr.read({ bytes: image });
  return { text: r.text, engine: r.engine };
};

const t0 = Date.now();
console.log(`Screenshot rules on synthetic fixtures (${useOcr ? 'real OCR' : 'ideal text, no OCR'})\n`);
console.log('Hand-made cases:');
let caseMisses = 0;
for (const c of CASES) {
  const { text, engine } = await read(c.svg, c.zoom ?? 1, c.id, '');
  // without OCR the hand-made cases have no ideal text: they're only meaningful read by OCR
  if (!useOcr) {
    console.log(`  ${c.id.padEnd(24)} (needs --ocr)`);
    continue;
  }
  const r = rules(text);
  const got = r.pass ? 'pass' : 'fail';
  const ok = got === c.expect;
  if (!ok) caseMisses++;
  console.log(`  ${ok ? '✓' : '✗'} ${c.id.padEnd(24)} ${got}${ok ? '' : ` (expected ${c.expect})`}${c.documented ? ` [documented: ${c.documented}]` : ''} · ${engine}`);
}

const byLabel = new Map<string, { n: number; passed: number }>();
let tp = 0;
let fp = 0;
let fn = 0;
let n = 0;
const misses: string[] = [];
const falsePass: string[] = [];
for (const [i, m] of DATASET.messages.entries()) {
  if (i % every) continue;
  const shot = datasetShot(m);
  const { text } = await read(shot.svg, 1, m.id, shot.text);
  const r = rules(text);
  n++;
  const s = byLabel.get(m.label) ?? { n: 0, passed: 0 };
  s.n++;
  if (r.pass) s.passed++;
  byLabel.set(m.label, s);
  if (m.keep === true && r.pass) tp++;
  if (m.keep === false && r.pass) {
    fp++;
    falsePass.push(`${m.id} (${m.label}): ${m.text.slice(0, 90)}`);
  }
  if (m.keep === true && !r.pass) {
    fn++;
    misses.push(`${m.id} (${m.channel.type}${m.thread?.length ? ', thread' : ''}): ${m.text.slice(0, 90)}`);
  }
}
const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(0)}%` : 'n/a');
console.log(`\nThe Found spike's dataset: ${n} messages${every > 1 ? ` (every ${every}th)` : ''}`);
console.log('  label             n   passed');
for (const [label, s] of [...byLabel].sort()) console.log(`  ${label.padEnd(16)} ${String(s.n).padStart(3)}   ${String(s.passed).padStart(3)} (${pct(s.passed, s.n)})`);
console.log(`\n  recall    ${pct(tp, tp + fn)} (${tp}/${tp + fn} wins passed)`);
console.log(`  precision ${pct(tp, tp + fp)} (${tp}/${tp + fp} of what passed was a win; ambiguous excluded)`);
if (misses.length) console.log(`\n  wins the rules missed:\n${misses.map((s) => `    ${s}`).join('\n')}`);
if (falsePass.length) console.log(`\n  passed, but not wins:\n${falsePass.map((s) => `    ${s}`).join('\n')}`);
if (useOcr) console.log(`\n  hand-made cases off expectation: ${caseMisses}`);
console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)} s`);
await ocr?.close();
