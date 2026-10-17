// Generate every derived brand asset from the hand-authored mark (brand/mark.svg), adapted from Local Review's
// brand/generate.mjs:
//
//   favicon.svg                         the mark, as is
//   favicon.ico                         16/32/48 (PNG-in-ICO)
//   apple-touch-icon.png                180, full-bleed (iOS rounds the corners itself)
//   icon-192.png, icon-512.png          web manifest icons
//   og-image.png                        1200×630 Open Graph card (the docs site, PR18)
//   social-preview.png                  1280×640 GitHub social preview
//
// and copies the favicons into public/, where the app serves them.
//
// Run: `npm run brand` (after `npx playwright install chromium` once). It rasterises with the Chromium that
// @playwright/test already brings, rather than Local Review's resvg + opentype.js, which BragDoc doesn't otherwise
// depend on. The cards' text is set in the app's own self-hosted fonts, from node_modules/@fontsource*. Re-run it and
// commit the results whenever the mark, colours or tagline change.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BRAND = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(BRAND, '..');
const out = (name) => path.join(BRAND, name);

// Brand colours (brand/README.md; the app's tokens in src/styles.css use the same values).
const TOMATO = '#ef5a3c';
const TOMATO_SHADOW = '#b8381f';
const OAT = '#f1ece2';
const DOTS = '#d8cfbf';
const INK = '#1d1a17';
const MUTED = '#5f584e';
const STICKY = '#fff3a8';

const TAGLINE = 'Your achievements, and the evidence for them,';
const TAGLINE_2 = 'kept as plain files on your own machine.';

const markSvg = fs.readFileSync(out('mark.svg'), 'utf8');
const markInner = markSvg
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')
  .replace(/<title>[\s\S]*?<\/title>/, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .trim();
const fullBleed = markSvg.replace(/(<rect id="tile"[^>]*?) rx="[\d.]+"/, '$1');

const font = (pkg, file) => pathToFileURL(path.join(ROOT, 'node_modules', pkg, 'files', file)).href;
const FONTS = `
@font-face { font-family: 'Bricolage'; src: url(${font('@fontsource-variable/bricolage-grotesque', 'bricolage-grotesque-latin-wght-normal.woff2')}) format('woff2'); font-weight: 200 800; }
@font-face { font-family: 'Instrument'; src: url(${font('@fontsource-variable/instrument-sans', 'instrument-sans-latin-wght-normal.woff2')}) format('woff2'); font-weight: 400 700; }
@font-face { font-family: 'Caveat'; src: url(${font('@fontsource/caveat', 'caveat-latin-500-normal.woff2')}) format('woff2'); font-weight: 500; }
`;

/** An oat pinboard with the mark, the wordmark, the tagline and a taped sticky note, scaled from the card's height. */
function card(W, H) {
  const k = H / 630;
  const px = (n) => `${Math.round(n * k)}px`;
  return `<!doctype html><html><head><style>${FONTS}
    html, body { margin: 0; }
    body { width: ${W}px; height: ${H}px; background: ${OAT} radial-gradient(${DOTS} ${px(2)}, transparent ${px(2)}) 0 0 / ${px(28)} ${px(28)}; position: relative; overflow: hidden; font-family: Instrument; color: ${INK}; }
    .lockup { position: absolute; left: ${px(96)}; top: ${px(150)}; display: flex; align-items: center; gap: ${px(30)}; }
    .lockup svg { width: ${px(132)}; height: ${px(132)}; transform: rotate(-6deg); filter: drop-shadow(0 ${px(8)} 0 ${TOMATO_SHADOW}); }
    .word { font-family: Bricolage; font-weight: 800; font-size: ${px(120)}; letter-spacing: -0.03em; line-height: 1; }
    .tag { position: absolute; left: ${px(100)}; top: ${px(330)}; font-size: ${px(38)}; line-height: 1.35; color: ${MUTED}; }
    .sticky { position: absolute; right: ${px(64)}; bottom: ${px(44)}; width: ${px(290)}; padding: ${px(30)} ${px(30)} ${px(24)}; background: ${STICKY}; transform: rotate(-3deg); box-shadow: 0 ${px(14)} ${px(26)} -${px(12)} rgba(60,50,0,.5); font-family: Caveat; font-size: ${px(38)}; line-height: 1.05; color: #3d3600; }
    .tape { position: absolute; top: -${px(14)}; left: 50%; width: ${px(130)}; height: ${px(30)}; margin-left: -${px(65)}; background: ${TOMATO}; opacity: .82; mix-blend-mode: multiply; clip-path: polygon(3% 0, 100% 6%, 97% 100%, 0 92%); }
    .pill { position: absolute; left: ${px(100)}; bottom: ${px(78)}; display: flex; gap: ${px(14)}; font-family: Bricolage; font-weight: 700; font-size: ${px(26)}; }
    .pill span { border-radius: 999px; padding: ${px(8)} ${px(22)}; }
  </style></head><body>
    <div class="lockup"><svg viewBox="0 0 32 32">${markInner}</svg><div class="word">bragdoc</div></div>
    <div class="tag">${TAGLINE}<br>${TAGLINE_2}</div>
    <div class="pill"><span style="background:${INK};color:#fff">local-first</span><span style="background:#2fb37e;color:${INK}">open source</span><span style="background:#3b6cf6;color:#fff">no telemetry</span></div>
    <div class="sticky"><div class="tape"></div>“Unblocked the release on Tuesday.”</div>
  </body></html>`;
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  /** Render an SVG at `size`×`size` (transparent outside the tile). */
  const svgPng = async (svg, size) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg style="display:block;width:${size}px;height:${size}px" `)}</body></html>`);
    return page.screenshot({ omitBackground: true, type: 'png' });
  };

  fs.writeFileSync(out('favicon.svg'), markSvg);
  fs.writeFileSync(out('apple-touch-icon.png'), await svgPng(fullBleed, 180));
  fs.writeFileSync(out('icon-192.png'), await svgPng(markSvg, 192));
  fs.writeFileSync(out('icon-512.png'), await svgPng(markSvg, 512));

  // favicon.ico: an ICONDIR followed by one PNG per size (PNG entries are valid ICO since Windows Vista).
  const icoSizes = [16, 32, 48];
  const pngs = [];
  for (const s of icoSizes) pngs.push(await svgPng(markSvg, s));
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach((png, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(icoSizes[i], e); // width
    header.writeUInt8(icoSizes[i], e + 1); // height
    header.writeUInt8(0, e + 2); // palette colours
    header.writeUInt8(0, e + 3); // reserved
    header.writeUInt16LE(1, e + 4); // colour planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(png.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  fs.writeFileSync(out('favicon.ico'), Buffer.concat([header, ...pngs]));

  // The cards load their fonts from file:// URLs, so they're rendered from a file page, not setContent's about:blank.
  const tmp = path.join(BRAND, '.card.html');
  for (const [name, W, H] of [['og-image.png', 1200, 630], ['social-preview.png', 1280, 640]]) {
    fs.writeFileSync(tmp, card(W, H));
    await page.setViewportSize({ width: W, height: H });
    await page.goto(pathToFileURL(tmp).href);
    await page.evaluate(() => document.fonts.ready);
    fs.writeFileSync(out(name), await page.screenshot({ type: 'png' }));
  }
  fs.rmSync(tmp);
} finally {
  await browser.close();
}

for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']) fs.copyFileSync(out(f), path.join(ROOT, 'public', f));

console.log('Wrote brand/: favicon.svg favicon.ico apple-touch-icon.png icon-192.png icon-512.png og-image.png social-preview.png (and the favicons into public/)');
