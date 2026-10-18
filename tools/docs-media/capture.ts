// The capture rig: builds BragDoc with /dev/kit, boots it on a throwaway data home and takes every shot in shots.ts,
// deterministically. Adapted from Local Review's tools/docs-media/capture.ts (its leak scan, settle and crop logic).
//
//   npm run docs:media                              build (BRAGDOC_KIT=1), boot the rig, take every shot
//   npm run docs:media -- --only kit-light,kit-dark
//   npm run docs:media -- --base http://localhost:5050    a server you started yourself (skips the build)
//   npm run docs:media -- --no-build                       reuse dist/ as it is
//
//   npm run docs:media:sync                                copy the shots the docs site uses into website/src/assets/
//
// Output: tools/docs-media/out/<name>.png (2x), provenance.json, and contact-sheet.png (every shot on one page).
// Needs Chromium: `npx playwright install chromium`.
//
// Two rigs: an empty data home (first run, empty states, /dev/kit), and the example world (`data: 'example'`): PR16's
// example dataset, Alex Marlowe's profile, the GitHub source connected through the fake gh (with
// tools/docs-media/fake-gh-prs.json), and one screenshot in a watched folder, so Found has both kinds of candidate.
// The example rig runs on the default port (2724) when it's free, because Settings shows BragDoc's own address.
//
// A third, the AI world (`data: 'ai'`, PR29): the example world with AI switched on against the repo's FAKE model
// server (test/fixtures/fake-llm), never a real model. The fake answers on Ollama's own preset address
// (127.0.0.1:11434), so the shots show the address a reader would see, and the rig refuses to start when something
// already listens there (a real Ollama must never answer a docs shot). Seeded the way a person would: AI on, an
// Ollama connection, qwen3.5:4b as the model, the judge (screenshots and merged PRs), Tidy and Draft on, a few
// screenshots from the synthetic dataset (praise, and one sarcastic message), one Judge now, and an Anthropic
// connection with no key and no consent, for the consent dialog. Every AI answer in these shots is the fake's, and
// the pages that use them say so.
//
// The example world lives at the time of the run, not SHOT_NOW: the server stamps some things itself (when a candidate
// was found, when GitHub was checked, the network log) with the real clock, which can't be pinned, so a browser clock
// at SHOT_NOW would show them as "in the future". So the example data is placed at today, and the browser's clock is
// frozen just after seeding (rig.now).
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
import { DEFAULT_PORT } from '../../server/port.ts';
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

const freePort = (want = 0) =>
  new Promise<number>((res, rej) => {
    const s = net.createServer();
    s.once('error', rej);
    s.listen(want, '127.0.0.1', () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => res(p));
    });
  });

type Data = NonNullable<Shot['data']>;
type Rig = { base: string; proc: ChildProcess; home: string; now: Date; llm?: ChildProcess };

/** Where the AI world's fake model server answers: Ollama's preset address, so a connection needs no address typed. */
const FAKE_LLM_PORT = 11434;

/** `npm run <script>`, with or without /dev/kit (BRAGDOC_KIT, D33). */
function build(script: 'build' | 'build:web', kit: boolean) {
  console.log(kit ? 'Building with /dev/kit (BRAGDOC_KIT=1)…' : 'Putting the release build back (without /dev/kit)…');
  const env: NodeJS.ProcessEnv = { ...process.env, BRAGDOC_KIT: kit ? '1' : '' };
  delete env.NODE_ENV; // a shell's NODE_ENV=production would change how Vite builds
  execFileSync('npm', ['run', script], { cwd: ROOT, env, stdio: ['ignore', 'ignore', 'inherit'] });
}

async function bootRig(data: Data): Promise<Rig> {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-docs-media-'));
  let proc: ChildProcess | undefined;
  let llm: ChildProcess | undefined;
  try {
    if (data === 'ai') llm = await startFakeLlm(home);
    // The example world shows BragDoc's own address (Settings → Sources), so it runs on the default port if it can.
    const port = data !== 'empty' ? await freePort(DEFAULT_PORT).catch(() => freePort()) : await freePort();
    if (data !== 'empty' && port !== DEFAULT_PORT) console.warn(`  ! port ${DEFAULT_PORT} is taken: shots that show BragDoc's address will fail the leak scan`);
    const args = [home, '--port', String(port)];
    if (data !== 'empty') args.push('--fake-gh', path.join(HERE, 'fake-gh-prs.json'), new Date().toISOString());
    const child = spawn(path.join(HERE, 'serve.sh'), args, { stdio: ['ignore', 'pipe', 'pipe'] });
    proc = child;
    let log = '';
    child.stdout!.on('data', (d) => (log += d));
    child.stderr!.on('data', (d) => (log += d));
    const base = `http://localhost:${port}`;
    let up = false;
    for (let i = 0; i < 150 && !up; i++) {
      if (child.exitCode !== null) throw new Error(`the rig exited (${child.exitCode}):\n${log}`);
      up = await fetch(`${base}/api/health`).then((r) => r.ok, () => false);
      if (!up) await new Promise((r) => setTimeout(r, 200));
    }
    if (!up) throw new Error(`the rig didn't start:\n${log}`);
    const rig: Rig = { base, proc: child, home, now: new Date(SHOT_NOW), llm };
    if (data !== 'empty') {
      await seedExample(rig); // outside the health poll: a seed error is reported as itself, and never retried
      if (data === 'ai') await seedAi(rig);
      rig.now = new Date(Date.now() + 10 * 60_000); // a little after everything the seed stamped
    }
    return rig;
  } catch (e) {
    proc?.kill();
    llm?.kill();
    fs.rmSync(home, { recursive: true, force: true });
    throw e;
  }
}

/** The example world, set up through BragDoc's own API, the way a person would (Welcome, Settings → Sources). */
async function seedExample({ base, home }: Rig) {
  const call = async (method: string, route: string, body?: unknown) => {
    const r = await fetch(base + route, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!r.ok) throw new Error(`seed: ${method} ${route} → ${r.status} ${await r.text()}`);
    return r.json();
  };
  const until = async (what: string, ok: () => Promise<boolean>) => {
    for (let i = 0; i < 300; i++) {
      if (await ok()) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`seed: timed out waiting for ${what}`);
  };
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  console.log('  seeding the example world…');
  await call('PUT', '/api/profile', { name: 'Alex Marlowe', role: 'Senior Software Engineer', aliases: ['Alex', 'AM', 'alexm'] });
  await call('POST', '/api/example', { asOf: day });
  // GitHub through the fake gh (its PRs are "days ago" from now)
  await call('POST', '/api/sources/github/connect', { auth: 'gh', lookBackDays: 90 });
  await until('the first GitHub check', async () => (await call('GET', '/api/sources')).github.lastRun !== null);
  // A screenshot of praise, saved into the watched folder yesterday (written aside, dated, then moved in, as a
  // screenshot tool does), so it's read as a new file. Drawn from the synthetic dataset (test/screenshots.ts): one of
  // the example data's own pictures would be skipped as "already on your board" (since 95338b9).
  const shots = path.join(home, 'Screenshots');
  fs.mkdirSync(shots, { recursive: true });
  await call('PUT', '/api/sources/screenshots', { folder: '~/Screenshots', enabled: true });
  const aside = path.join(home, 'incoming.png');
  fs.writeFileSync(aside, await datasetPng(EXAMPLE_WORLD_MESSAGE));
  const when = new Date(now - 86_400_000 - 3 * 3_600_000);
  fs.utimesSync(aside, when, when);
  const name = `Screenshot ${when.toISOString().slice(0, 10)} at 9.12.09 AM.png`; // macOS's naming, dated as the file is
  fs.renameSync(aside, path.join(shots, name));
  await until('the screenshot to reach Found', async () => (await call('GET', '/api/found')).counts.screenshots > 0);
  // "Test the guard", once, so Network activity shows a refusal (as a per-shot click it would add one per theme)
  await call('POST', '/api/network-log/guard-check', {});
}

/** The repo's fake model server on Ollama's preset port, with a throwaway HOME and nothing inherited. */
async function startFakeLlm(home: string): Promise<ChildProcess> {
  // something already answering there could be a real Ollama: never let it answer a docs shot
  await freePort(FAKE_LLM_PORT).catch(() => {
    throw new Error(`port ${FAKE_LLM_PORT} (Ollama's) is taken: the AI world's fake model server needs it. Stop whatever runs there (a real Ollama?) and try again`);
  });
  const child = spawn(process.execPath, ['--import', 'tsx', path.join(ROOT, 'test', 'fixtures', 'fake-llm', 'server.ts'), '--port', String(FAKE_LLM_PORT)], {
    cwd: ROOT,
    env: { PATH: process.env.PATH ?? '', HOME: home },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout!.on('data', (d) => (log += d));
  child.stderr!.on('data', (d) => (log += d));
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`the fake model server exited (${child.exitCode}):\n${log}`);
    if (await fetch(`http://127.0.0.1:${FAKE_LLM_PORT}/api/version`).then((r) => r.ok, () => false)) return child;
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  throw new Error(`the fake model server didn't start:\n${log}`);
}

/** The synthetic dataset's message the example world's screenshot shows (a win for Alex). */
const EXAMPLE_WORLD_MESSAGE = 'm036';
/** And the ones the AI world adds: three more wins, and one sarcastic one. */
const AI_WORLD_MESSAGES = ['m016', 'm053', 'm010', 'm019'];

/** One of the synthetic dataset's messages (test/fixtures/screenshots/messages.json), drawn as a chat screenshot. */
async function datasetPng(id: string): Promise<Buffer> {
  const { DATASET, datasetShot, png } = await import('../../test/screenshots.ts');
  const m = DATASET.messages.find((x) => x.id === id);
  if (!m) throw new Error(`seed: no message ${id} in the dataset`);
  return png(datasetShot(m).svg, 2);
}

/** AI on in the example world, against the fake model server (see the top of this file). */
async function seedAi({ base, home }: Rig) {
  const call = async (method: string, route: string, body?: unknown) => {
    const r = await fetch(base + route, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!r.ok) throw new Error(`seed: ${method} ${route} → ${r.status} ${await r.text()}`);
    return r.status === 204 ? null : r.json();
  };
  const until = async (what: string, ok: () => Promise<boolean>) => {
    for (let i = 0; i < 300; i++) {
      if (await ok()) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`seed: timed out waiting for ${what}`);
  };
  console.log('  switching AI on, against the fake model server…');
  // screenshots from the synthetic dataset, saved into the watched folder over the last few hours
  const before = (await call('GET', '/api/found')).counts.screenshots as number;
  const now = Date.now();
  for (const [i, id] of AI_WORLD_MESSAGES.entries()) {
    const when = new Date(now - (i + 1) * 3_600_000);
    const aside = path.join(home, `incoming-${id}.png`);
    fs.writeFileSync(aside, await datasetPng(id));
    fs.utimesSync(aside, when, when);
    // macOS's naming; the time is made up (a "10.35.00" would read as an address to the leak scan)
    const name = `Screenshot ${when.toISOString().slice(0, 10)} at 4.2${i}.1${i} PM.png`;
    fs.renameSync(aside, path.join(home, 'Screenshots', name));
  }
  await until('the screenshots to reach Found', async () => (await call('GET', '/api/found')).counts.screenshots >= before + AI_WORLD_MESSAGES.length - 1);
  await call('PUT', '/api/ai', { enabled: true });
  await call('POST', '/api/ai/connections', { kind: 'ollama' }); // its preset address: the fake, on 11434
  await call('PUT', '/api/ai', { text: { connection: 'ollama', model: 'qwen3.5:4b' } });
  await call('PUT', '/api/ai/features/judge', { enabled: true, github: true });
  await call('PUT', '/api/ai/features/tidy', { enabled: true });
  await call('PUT', '/api/ai/features/draft', { enabled: true });
  await call('POST', '/api/ai/connections', { kind: 'anthropic' }); // no key, no consent: it sends nothing
  await call('POST', '/api/ai/judge/run', {});
  await until('the judge to finish', async () => {
    const s = await call('GET', '/api/ai/judge/status');
    return !s.running && s.last?.outcome === 'ok';
  });
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
    // a lazy image below the fold never loads, so its decode() never settles: give each one a few seconds at most
    const atMost = (p: Promise<unknown>) => Promise.race([p, new Promise((r) => setTimeout(r, 3000))]);
    await Promise.all([...document.images].map((i) => (i.complete ? null : atMost(i.decode().catch(() => null)))));
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

async function takeShot(browser: Browser, shot: Shot, base: string, now: Date) {
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
  await context.clock.setFixedTime(now);
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

  const rigs = new Map<Data, Rig>();
  const building = !BASE && !argv.includes('--no-build');
  if (!BASE && building) build('build', true);
  const broken = new Map<Data, Error>(); // a rig that failed to boot isn't tried again for every shot
  const rigFor = async (data: Data): Promise<{ base: string; now: Date }> => {
    if (BASE) return { base: BASE, now: new Date(SHOT_NOW) };
    if (broken.has(data)) throw broken.get(data)!;
    if (!rigs.has(data)) {
      // the example and AI worlds both want the default port: one rig at a time (shots.ts keeps each world's together)
      for (const [d, r] of rigs) {
        await Promise.all([r.proc, r.llm].map((p) => (p && p.exitCode === null ? new Promise((res) => (p.once('exit', res), p.kill())) : null)));
        fs.rmSync(r.home, { recursive: true, force: true });
        rigs.delete(d);
      }
      console.log(`Booting the ${data} rig (serve.sh)…`);
      try {
        rigs.set(data, await bootRig(data));
      } catch (e) {
        broken.set(data, e as Error);
        throw e;
      }
    }
    return rigs.get(data)!;
  };
  const browser = await chromium.launch();
  const provenance: Record<string, unknown> = {};
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const failures: string[] = [];
  try {
    for (const shot of shots) {
      try {
        const rig = await rigFor(shot.data ?? 'empty');
        const r = await takeShot(browser, shot, rig.base, rig.now);
        console.log(`  ✓ ${path.relative(process.cwd(), r.file)}`);
        provenance[`${shot.name}.png`] = { doc: shot.doc, route: shot.route, data: shot.data ?? 'empty', theme: r.theme, viewport: r.viewport, scale: r.scale, ...(r.clip ? { clip: r.clip } : {}), now: rig.now.toISOString() };
      } catch (e) {
        failures.push(`${shot.name}: ${(e as Error).message.split('\n')[0]}`);
        console.error(`  ✗ ${shot.name}: ${(e as Error).message}`);
      }
    }
    const all = SHOTS.map((s) => path.join(OUT, `${s.name}.png`)).filter((f) => fs.existsSync(f));
    console.log(`  ✓ ${path.relative(process.cwd(), await contactSheet(browser, all))}`);
  } finally {
    await browser.close();
    for (const rig of rigs.values()) {
      rig.proc.kill();
      rig.llm?.kill();
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
