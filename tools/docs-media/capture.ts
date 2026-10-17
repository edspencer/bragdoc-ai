// The capture rig: builds BragDoc with /dev/kit, boots it on a throwaway data home and takes every shot in shots.ts,
// deterministically. Adapted from Local Review's tools/docs-media/capture.ts (its leak scan, settle and crop logic).
//
//   npm run docs:media                              build (BRAGDOC_KIT=1), boot the rig, take every shot
//   npm run docs:media -- --only kit-light,kit-dark
//   npm run docs:media -- --base http://localhost:5050    a server you started yourself (skips the build)
//   npm run docs:media -- --no-build                       reuse dist/ as it is
//
// Output: tools/docs-media/out/<name>.png (2x), provenance.json, and contact-sheet.png (every shot on one page).
// Needs Chromium: `npx playwright install chromium`.
//
// It builds the web app with /dev/kit for the shots, and puts the release build (without it) back afterwards, so
// dist/ is never left with the kit in it.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from '@playwright/test';
import { leakPattern } from './leaks.ts';
import { DEFAULT_VIEWPORT, SHOTS, SHOT_NOW, type Crop, type Shot } from './shots.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

const argv = process.argv.slice(2);
const arg = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const OUT = path.resolve(arg('--out') ?? path.join(HERE, 'out'));
const ONLY = arg('--only')?.split(',');
let BASE = arg('--base');

/** Device pixels per CSS pixel for every shot (a crop's `zoom` multiplies it). */
const SCALE = 2;

// ------------------------------------------------------------------------------------------------ the rig

const freePort = () =>
  new Promise<number>((res) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => res(p));
    });
  });

/** `npm run <script>`, with or without /dev/kit (BRAGDOC_KIT, D23). */
function build(script: 'build' | 'build:web', kit: boolean) {
  console.log(kit ? 'Building with /dev/kit (BRAGDOC_KIT=1)…' : 'Putting the release build back (without /dev/kit)…');
  const env: NodeJS.ProcessEnv = { ...process.env, BRAGDOC_KIT: kit ? '1' : '' };
  delete env.NODE_ENV; // a shell's NODE_ENV=production would change how Vite builds
  execFileSync('npm', ['run', script], { cwd: ROOT, env, stdio: ['ignore', 'ignore', 'inherit'] });
}

async function bootRig(): Promise<{ base: string; proc: ChildProcess; home: string }> {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-docs-media-'));
  const port = await freePort();
  const proc = spawn(path.join(HERE, 'serve.sh'), [home, '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  proc.stdout!.on('data', (d) => (log += d));
  proc.stderr!.on('data', (d) => (log += d));
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 150; i++) {
    if (proc.exitCode !== null) throw new Error(`the rig exited (${proc.exitCode}):\n${log}`);
    try {
      if ((await fetch(`${base}/api/health`)).ok) return { base, proc, home };
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error(`the rig didn't start:\n${log}`);
}

// ------------------------------------------------------------------------------------------------ hygiene

async function assertClean(page: Page, name: string, port: string) {
  // the visible text, plus what's on screen without being text: form values, placeholders, tooltips, alt text
  const text = await page.evaluate(() => {
    const extra = [...document.querySelectorAll('input, textarea, select, [placeholder], [title], [alt], [aria-label]')].flatMap((el) => [
      (el as HTMLInputElement).value ?? '',
      el.getAttribute('placeholder') ?? '',
      el.getAttribute('title') ?? '',
      el.getAttribute('alt') ?? '',
      el.getAttribute('aria-label') ?? '',
    ]);
    return [document.body.innerText, ...extra].join('\n');
  });
  const found = [...new Set(text.match(leakPattern(port)) ?? [])];
  if (found.length) throw new Error(`${name}: the page shows ${found.map((f) => JSON.stringify(f)).join(', ')}; shot not written`);
}

/** No animations, transitions, blinking carets or hover leftovers; scrollbars hidden. */
const STILL_CSS = `
*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
::-webkit-scrollbar { display: none; }
* { scrollbar-width: none !important; }
`;

// ------------------------------------------------------------------------------------------------ shooting

/** Wait until the page has rendered: an h1, fonts loaded, images decoded. */
async function settle(page: Page) {
  await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))));
  });
  await page.waitForTimeout(250);
}

async function cropBox(page: Page, crop: Crop) {
  const sels = Array.isArray(crop.selector) ? crop.selector : [crop.selector];
  const first = page.locator(sels[0]).first();
  await first.waitFor({ state: 'visible', timeout: 15_000 });
  await first.scrollIntoViewIfNeeded();
  const boxes = [];
  for (const s of sels) {
    const b = await page.locator(s).first().boundingBox();
    if (!b) throw new Error(`crop: ${s} has no box`);
    boxes.push(b);
  }
  const pad = crop.pad ?? 16;
  const vp = page.viewportSize()!;
  const x = Math.max(0, Math.min(...boxes.map((b) => b.x)) - pad);
  const y = Math.max(0, Math.min(...boxes.map((b) => b.y)) - pad);
  const right = Math.min(vp.width, Math.max(...boxes.map((b) => b.x + b.width)) + pad);
  const bottom = Math.min(vp.height, Math.max(...boxes.map((b) => b.y + b.height)) + pad);
  if (Math.max(...boxes.map((b) => b.y + b.height)) + pad > vp.height + 1) console.warn(`  ! crop runs past the viewport (${vp.height}px): give the shot a taller viewport`);
  return { x: Math.round(x), y: Math.round(y), width: Math.round(right - x), height: Math.round(bottom - y) };
}

async function takeShot(browser: Browser, shot: Shot, base: string) {
  const port = new URL(base).port;
  const crop = typeof shot.capture === 'object' ? shot.capture : null;
  const viewport = shot.viewport ?? DEFAULT_VIEWPORT;
  const theme = shot.theme ?? 'light';
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: SCALE * (crop?.zoom ?? 1),
    colorScheme: theme,
    reducedMotion: 'reduce',
    locale: 'en-GB',
    timezoneId: 'UTC',
    // STILL_CSS goes in as an inline <style>, which the app's CSP (style-src 'self') would refuse
    bypassCSP: true,
  });
  await context.clock.setFixedTime(new Date(SHOT_NOW));
  // tsx (esbuild) wraps named functions in __name(); functions sent to the page need it to exist there too
  await context.addInitScript('globalThis.__name = (f) => f;');
  await context.addInitScript((t: string) => localStorage.setItem('bragdoc.theme', t), theme);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(base + shot.route, { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: STILL_CSS });
    await settle(page);
    for (const a of shot.actions ?? []) {
      if ('click' in a) await page.locator(a.click).first().click();
      else if ('hover' in a) await page.locator(a.hover).first().hover();
      else if ('press' in a) await page.keyboard.press(a.press);
      else if ('waitFor' in a) await page.locator(a.waitFor).first().waitFor({ state: 'visible', timeout: 15_000 });
      else if ('wait' in a) await page.waitForTimeout(a.wait);
      else if ('fill' in a) await page.locator(a.fill).first().fill(a.text);
      else if ('scrollTo' in a) await page.locator(a.scrollTo).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
    }
    await page.mouse.move(0, viewport.height - 1); // no stray hover state
    await settle(page);
    await assertClean(page, shot.name, port);
    if (errors.length) throw new Error(`${shot.name}: console errors: ${errors.join(' | ')}`);
    const file = path.join(OUT, `${shot.name}.png`);
    let clip: { x: number; y: number; width: number; height: number } | undefined;
    if (crop) {
      clip = await cropBox(page, crop);
      await page.screenshot({ path: file, clip });
    } else await page.screenshot({ path: file, fullPage: shot.capture === 'page' });
    return { file, viewport, theme, scale: SCALE * (crop?.zoom ?? 1), clip };
  } finally {
    await context.close();
  }
}

/** One image with every shot on it, labelled, to look over a run at a glance. */
async function contactSheet(browser: Browser, files: string[]) {
  const cells = files
    .map((f) => `<figure><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"><figcaption>${path.basename(f)}</figcaption></figure>`)
    .join('');
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 1 });
  await page.addInitScript('globalThis.__name = (f) => f;');
  await page.setContent(`<style>
    body { margin: 16px; font: 13px system-ui, sans-serif; background: #eee; }
    main { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; align-items: start; }
    figure { margin: 0; background: white; padding: 8px; border-radius: 6px; }
    img { width: 100%; border: 1px solid #ddd; display: block; }
    figcaption { margin-top: 6px; color: #444; }
  </style><main>${cells}</main>`);
  await page.evaluate(async () => Promise.all([...document.images].map((i) => i.decode())));
  const out = path.join(OUT, 'contact-sheet.png');
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
  return out;
}

async function main() {
  const shots = SHOTS.filter((s) => !ONLY || ONLY.includes(s.name));
  if (ONLY) for (const n of ONLY) if (!SHOTS.some((s) => s.name === n)) throw new Error(`no shot named ${n}`);
  fs.mkdirSync(OUT, { recursive: true });

  let rig: Awaited<ReturnType<typeof bootRig>> | undefined;
  const building = !BASE && !argv.includes('--no-build');
  if (!BASE) {
    if (building) build('build', true);
    console.log('Booting the rig (serve.sh)…');
    rig = await bootRig();
    BASE = rig.base;
  }
  const browser = await chromium.launch();
  const provenance: Record<string, unknown> = {};
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const failures: string[] = [];
  try {
    for (const shot of shots) {
      try {
        const r = await takeShot(browser, shot, BASE);
        console.log(`  ✓ ${path.relative(process.cwd(), r.file)}`);
        provenance[`${shot.name}.png`] = { doc: shot.doc, route: shot.route, theme: r.theme, viewport: r.viewport, scale: r.scale, ...(r.clip ? { clip: r.clip } : {}), now: SHOT_NOW };
      } catch (e) {
        failures.push(`${shot.name}: ${(e as Error).message.split('\n')[0]}`);
        console.error(`  ✗ ${shot.name}: ${(e as Error).message}`);
      }
    }
    const all = SHOTS.map((s) => path.join(OUT, `${s.name}.png`)).filter((f) => fs.existsSync(f));
    console.log(`  ✓ ${path.relative(process.cwd(), await contactSheet(browser, all))}`);
  } finally {
    await browser.close();
    if (rig) {
      rig.proc.kill();
      fs.rmSync(rig.home, { recursive: true, force: true });
    }
    if (building) build('build:web', false);
  }
  const provFile = path.join(OUT, 'provenance.json');
  const prev = fs.existsSync(provFile) && ONLY ? JSON.parse(fs.readFileSync(provFile, 'utf8')).shots : {};
  fs.writeFileSync(provFile, JSON.stringify({ app_version: pkg.version, shots: { ...prev, ...provenance } }, null, 2) + '\n');
  if (failures.length) {
    console.error(`\n${failures.length} shot(s) failed:\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
