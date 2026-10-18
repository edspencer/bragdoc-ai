// OCR (server/ocr/): real tesseract.js on the synthetic screenshots (test/screenshots.ts), with the network stubbed to
// fail, here and inside its worker; the engine chooser's queue, cache and fallback with fake engines; the Apple Vision
// helper's contract with a fake osascript; and, on macOS only, the real Vision path. Then `bragdoc dev ocr`.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { compileRules } from '../shared/rules/screenshot.ts';
import { type OcrEngine, OcrError } from '../server/ocr/engine.ts';
import { prepareForTesseract, MAX_PIXELS } from '../server/ocr/image.ts';
import { createOcr, defaultEngines, evidenceOcrCache, memoryCache, sha256Of } from '../server/ocr/index.ts';
import { LANG_DIR, TesseractEngine } from '../server/ocr/tesseract.ts';
import { linesToText, VISION_SCRIPT, VisionEngine, type Runner } from '../server/ocr/vision-macos.ts';
import { ROOT, tmpDir, tmpHome, rmTmp } from './fixture.ts';
import { ALEX, CASES, DATASET, caseById, datasetShot, png } from './screenshots.ts';
import { storeHome } from './store-fixture.ts';

// SPEC R4: OCR never reaches the network. The global fetch throws (and counts); tesseract's worker has its own fetch,
// which only fails (server/ocr/tesseract-worker.ts), and the URL test below proves that one is in place.
let fetches = 0;
(globalThis as unknown as { fetch: unknown }).fetch = (url: unknown) => {
  fetches++;
  throw new Error(`no network in the OCR tests (asked for ${String(url)})`);
};

const tesseract = new TesseractEngine();
after(() => tesseract.close());
const rules = compileRules(ALEX);
const read = (image: Uint8Array) => tesseract.recognize(image, { timeoutMs: 60_000 });

test('the English language data is the package\'s own, on disk', () => {
  assert.ok(fs.statSync(path.join(LANG_DIR, 'eng.traineddata.gz')).size > 1_000_000);
  assert.ok(!/^https?:/.test(LANG_DIR));
});

test('tesseract reads the hand-made screenshots, and the rules give each its expected outcome', async () => {
  const outcomes: string[] = [];
  for (const c of CASES) {
    const { text } = await read(png(c.svg, c.zoom ?? 1));
    const r = rules(text);
    outcomes.push(`${c.id}: ${r.pass ? 'pass' : 'fail'}`);
    assert.equal(r.pass ? 'pass' : 'fail', c.expect, `${c.id} (${c.why}): read ${JSON.stringify(text)}, matched ${JSON.stringify(r.matched)}`);
  }
  assert.equal(outcomes.length, CASES.length);
  assert.equal(fetches, 0, 'nothing was fetched');
});

test('what tesseract reads: the words, a small screenshot (upscaled), dark mode, and a blank image', async () => {
  const billing = await read(png(caseById('praise-billing').svg));
  assert.match(billing.text, /@Alex Marlowe ran the dual-write plan beautifully/);
  assert.match(billing.text, /# eng-billing/);
  assert.ok(billing.confidence! > 80, `confidence ${billing.confidence}`);
  assert.match((await read(png(caseById('praise-incident-small').svg, 0.6))).text, /Kudos to @Alex Marlowe/);
  assert.match((await read(png(caseById('praise-dark').svg))).text, /Shoutout to Alex/);
  assert.equal((await read(png(caseById('blank').svg))).text.trim(), '');
});

test('the committed fixture smoke:pack and the Docker smoke read still passes (test/fixtures/screenshots/praise.png)', async () => {
  const r = rules((await read(fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'screenshots', 'praise.png')))).text);
  assert.ok(r.pass, JSON.stringify(r));
});

test("a slice of the spike's dataset: OCR'd, the rules agree with the perfect reading", async () => {
  const slice = DATASET.messages.filter((_, i) => i % 9 === 0);
  let agree = 0;
  const disagree: string[] = [];
  for (const m of slice) {
    const shot = datasetShot(m);
    const ideal = rules(shot.text).pass;
    const got = rules((await read(png(shot.svg))).text).pass;
    if (ideal === got) agree++;
    else disagree.push(`${m.id} (${m.label}): ideal ${ideal}, OCR ${got}`);
  }
  assert.ok(agree / slice.length >= 0.9, `${agree}/${slice.length} agree; ${disagree.join('; ')}`);
});

test("tesseract's worker can't fetch: pointed at the CDN, it fails instead of downloading", async () => {
  const cdn = new TesseractEngine({ langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int' });
  try {
    await assert.rejects(cdn.recognize(png(caseById('praise-billing').svg), { timeoutMs: 30_000 }), (e: OcrError) => {
      assert.equal(e.code, 'unavailable');
      assert.match(e.message, /no network access.*cdn\.jsdelivr\.net/);
      return true;
    });
  } finally {
    await cdn.close();
  }
  assert.equal(fetches, 0, "the worker's own fetch refused it; the global one was never reached");
});

test('a recognition past its timeout stops the worker; the next one starts a fresh one', async () => {
  const engine = new TesseractEngine();
  try {
    // warm: the worker is up, so the timeout below lands on the recognition itself, not on starting
    await engine.recognize(png(caseById('blank').svg), { timeoutMs: 60_000 });
    const big = png(caseById('code-editor').svg, 2.5);
    await assert.rejects(engine.recognize(big, { timeoutMs: 30 }), (e: OcrError) => e.code === 'timeout' && /^tesseract took longer/.test(e.message));
    assert.match((await engine.recognize(png(caseById('praise-billing').svg), { timeoutMs: 60_000 })).text, /eng-billing/);
  } finally {
    await engine.close();
  }
});

test('a worker that dies while starting is an error, and closing it never hangs', async () => {
  const dir = tmpDir();
  const script = path.join(dir, 'dies.mjs');
  fs.writeFileSync(script, 'process.exit(1);\n'); // what our worker does when tesseract.js's internals won't load
  const engine = new TesseractEngine({ workerPath: script });
  try {
    await assert.rejects(engine.recognize(png(caseById('blank').svg), { timeoutMs: 1500 }), (e: OcrError) => e.code === 'timeout');
    const t = Date.now();
    await engine.close();
    assert.ok(Date.now() - t < 3000, `close took ${Date.now() - t} ms`);
  } finally {
    rmTmp(dir);
  }
});

test('missing language data is an error, not a hang', async () => {
  const dir = tmpDir();
  const engine = new TesseractEngine({ langPath: dir });
  try {
    await assert.rejects(engine.recognize(png(caseById('praise-billing').svg), { timeoutMs: 30_000 }), (e: OcrError) => e.code === 'unavailable');
  } finally {
    await engine.close();
    rmTmp(dir);
  }
});

// ---- image preparation ------------------------------------------------------------------------------------------------

const solid = (w: number, h: number, alpha = 255) => {
  const p = new PNG({ width: w, height: h });
  p.data.fill(0);
  for (let i = 3; i < p.data.length; i += 4) p.data[i] = alpha;
  return new Uint8Array(PNG.sync.write(p));
};

test('small PNGs are scaled up 2×, wide ones are not, transparency becomes white', () => {
  const small = prepareForTesseract(solid(400, 100));
  assert.deepEqual([small.scale, small.width, small.height], [2, 800, 200]);
  const wide = solid(2000, 100);
  const w = prepareForTesseract(wide);
  assert.equal(w.scale, 1);
  assert.equal(w.bytes, wide, 'an opaque wide PNG goes through untouched');
  const clear = PNG.sync.read(Buffer.from(prepareForTesseract(solid(2000, 10, 0)).bytes));
  assert.deepEqual([...clear.data.subarray(0, 4)], [255, 255, 255, 255]);
});

test("images it can't read, or that are too big, are refused before any OCR", () => {
  assert.throws(() => prepareForTesseract(new TextEncoder().encode('not an image')), (e: OcrError) => e.code === 'unsupported');
  // a PNG header claiming 10000 × 10000 (no pixels needed: it's refused from the header)
  const huge = new Uint8Array(solid(1, 1));
  new DataView(huge.buffer).setUint32(16, 10_000);
  new DataView(huge.buffer).setUint32(20, 10_000);
  assert.ok(10_000 * 10_000 > MAX_PIXELS);
  assert.throws(() => prepareForTesseract(huge), (e: OcrError) => e.code === 'too_large');
  const corrupt = new Uint8Array(solid(10, 10)).subarray(0, 40);
  assert.throws(() => prepareForTesseract(corrupt), (e: OcrError) => e.code === 'unsupported');
});

// ---- the chooser: queue, cache, fallback ------------------------------------------------------------------------------

function fake(name: 'tesseract' | 'vision', opts: { ok?: boolean; fail?: OcrError; delay?: number; text?: string } = {}) {
  const calls: number[] = [];
  let running = 0;
  let maxRunning = 0;
  const engine: OcrEngine & { calls: number[]; maxRunning: () => number } = {
    name,
    calls,
    maxRunning: () => maxRunning,
    available: async () => (opts.ok === false ? { ok: false, why: `${name} is off` } : { ok: true }),
    recognize: async (image) => {
      calls.push(image.length);
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, opts.delay ?? 5));
      running--;
      if (opts.fail) throw opts.fail;
      return { text: opts.text ?? `${name} read ${image.length} bytes`, confidence: 90 };
    },
    close: async () => {},
  };
  return engine;
}
const img = (n: number) => new Uint8Array(n).fill(n % 251);

test('reads are queued: one at a time, the same image read once, the rest refused past the limit', async () => {
  const e = fake('tesseract', { delay: 20 });
  const ocr = createOcr({ engines: [e], maxQueue: 5 });
  const results = await Promise.all([img(10), img(11), img(12), img(10)].map((bytes) => ocr.read({ bytes })));
  assert.equal(e.maxRunning(), 1, 'never two at once');
  assert.deepEqual(e.calls, [10, 11, 12], 'the duplicate shared the first read');
  assert.equal(results[3], results[0]);
  const flood = [...Array(8)].map((_, i) => ocr.read({ bytes: img(100 + i) }).then(() => 'ok', (err: OcrError) => err.code));
  assert.deepEqual((await Promise.all(flood)).filter((x) => x === 'busy').length, 3);
  assert.equal(ocr.queued(), 0);
});

test('results are cached by sha256: the second read is instant and says so; a forced engine skips the cache', async () => {
  const e = fake('tesseract');
  const ocr = createOcr({ engines: [e] });
  const first = await ocr.read({ bytes: img(20) });
  const second = await ocr.read({ bytes: img(20) });
  assert.deepEqual([first.cached, second.cached, second.ms, second.text, second.sha256], [false, true, 0, first.text, sha256Of(img(20))]);
  await ocr.read({ bytes: img(20) }, { engine: 'tesseract' });
  assert.equal(e.calls.length, 2);
  const lru = memoryCache(2);
  lru.set('a', { engine: 'vision', text: 'a' });
  lru.set('b', { engine: 'vision', text: 'b' });
  lru.get('a');
  lru.set('c', { engine: 'vision', text: 'c' });
  assert.deepEqual([lru.get('a')?.text, lru.get('b'), lru.get('c')?.text], ['a', undefined, 'c']);
});

test('the first available engine runs; one that fails falls back to the next, and the result says why', async () => {
  const off = createOcr({ engines: [fake('vision', { ok: false }), fake('tesseract')] });
  const r = await off.read({ bytes: img(30) });
  assert.equal(r.engine, 'tesseract');
  assert.deepEqual(r.skipped, ['vision: vision is off']);
  const broken = createOcr({ engines: [fake('vision', { fail: new OcrError('Vision blew up', 'failed') }), fake('tesseract')] });
  const b = await broken.read({ bytes: img(31) });
  assert.equal(b.engine, 'tesseract');
  assert.match(b.skipped[0]!, /vision: Vision blew up/);
  // the image's own problem isn't retried on another engine
  const t = fake('tesseract');
  const bad = createOcr({ engines: [fake('vision', { fail: new OcrError('not an image', 'unsupported') }), t] });
  await assert.rejects(bad.read({ bytes: img(32) }), (e: OcrError) => e.code === 'unsupported');
  assert.equal(t.calls.length, 0);
  // nothing works: the last error, with what else was tried
  const none = createOcr({ engines: [fake('vision', { ok: false }), fake('tesseract', { fail: new OcrError('wasm failed', 'failed') })] });
  await assert.rejects(none.read({ bytes: img(33) }), /wasm failed \(also tried: vision: vision is off\)/);
  await assert.rejects(createOcr({ engines: [fake('tesseract')] }).read({ bytes: img(34) }, { engine: 'vision' }), (e: OcrError) => e.code === 'unavailable');
  assert.deepEqual(await off.engines(), [
    { name: 'vision', ok: false, why: 'vision is off' },
    { name: 'tesseract', ok: true },
  ]);
});

test('reads a path as well as bytes', async () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(path.join(dir, 'x.png'), img(40));
    const r = await createOcr({ engines: [fake('tesseract')] }).read({ path: path.join(dir, 'x.png') });
    assert.equal(r.sha256, sha256Of(img(40)));
  } finally {
    rmTmp(dir);
  }
});

test("evidence files keep their text in the sidecar (searchable); a screenshot that isn't evidence leaves nothing on disk", async () => {
  const h = storeHome();
  try {
    const image = png(caseById('praise-billing').svg);
    const stored = await h.services.evidence.ingestBytes(image, { originalName: 'billing.png' });
    const cache = evidenceOcrCache(h.store, h.services);
    const ocr = createOcr({ engines: [fake('tesseract', { text: 'Kudos to Alex Marlowe' })], cache });
    await ocr.read({ bytes: image });
    const sidecar = h.store.get('evidence', stored.sha256)!;
    assert.deepEqual([sidecar.ocr?.engine, sidecar.ocr?.text, sidecar.ocr?.at], ['tesseract', 'Kudos to Alex Marlowe', h.clock.now().toISOString()]);
    assert.equal((await ocr.read({ bytes: image })).cached, true, 'read back from the sidecar');
    // not evidence: memory only
    const before = fs.readdirSync(h.home, { recursive: true }).length;
    await ocr.read({ bytes: img(50) });
    assert.equal(fs.readdirSync(h.home, { recursive: true }).length, before);
    assert.equal(cache.get(sha256Of(img(50)))?.text, 'Kudos to Alex Marlowe');
  } finally {
    h.cleanup();
  }
});

test('the default engines: Vision then tesseract.js on macOS, tesseract.js elsewhere', () => {
  assert.deepEqual(defaultEngines('darwin').map((e) => e.name), ['vision', 'tesseract']);
  assert.deepEqual(defaultEngines('linux').map((e) => e.name), ['tesseract']);
  assert.deepEqual(defaultEngines('win32').map((e) => e.name), ['tesseract']);
});

// ---- Apple Vision's contract, with a fake osascript ---------------------------------------------------------------

function fakeOsascript(reply: (args: readonly string[], input?: string) => { code?: number; stdout?: string; stderr?: string } | Error) {
  const calls: { args: readonly string[]; input?: string }[] = [];
  const run: Runner = async (bin, args, opts = {}) => {
    assert.equal(bin, 'osascript');
    calls.push({ args, ...(opts.input !== undefined ? { input: opts.input } : {}) });
    const r = reply(args, opts.input);
    if (r instanceof Error) throw r;
    return { code: r.code ?? 0, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
  };
  return { run, calls };
}

test('Vision is never tried off macOS', async () => {
  const f = fakeOsascript(() => assert.fail('osascript ran'));
  assert.deepEqual(await new VisionEngine({ run: f.run, platform: 'linux' }).available(), { ok: false, why: 'Apple Vision is only on macOS' });
  assert.equal(f.calls.length, 0);
});

test("Vision's probe: run once, JXA via osascript -l JavaScript, and every way it can fail is 'not available'", async () => {
  const ok = fakeOsascript(() => ({ stdout: '{"ok":true}\n' }));
  const v = new VisionEngine({ run: ok.run, platform: 'darwin' });
  assert.deepEqual(await v.available(), { ok: true });
  await v.available();
  assert.equal(ok.calls.length, 1, 'probed once');
  assert.deepEqual(ok.calls[0]!.args, ['-l', 'JavaScript', '-e', VISION_SCRIPT, 'probe']);
  assert.match(VISION_SCRIPT, /VNRecognizeTextRequest/);
  for (const [reply, why] of [
    [{ code: 1, stderr: "execution error: Error: Can't find variable: VNRecognizeTextRequest (-2700)\n" }, /Can't find variable/],
    [{ stdout: '{"ok":false}' }, /isn't available/],
    [{ stdout: 'garbage' }, /isn't usable/],
    [new Error('osascript isn\'t installed'), /isn't installed/],
  ] as const) {
    const f = fakeOsascript(() => reply);
    const a = await new VisionEngine({ run: f.run, platform: 'darwin' }).available();
    assert.equal(a.ok, false);
    assert.match((a as { why: string }).why, why);
  }
});

test("Vision's read: the image as base64 on stdin, lines back in reading order, errors as OcrErrors", async () => {
  const image = png(caseById('praise-billing').svg);
  // Vision's boxes: normalised, origin bottom left, in no particular order; two entries on the author line
  const lines = [
    { text: '@Alex Marlowe ran it beautifully.', confidence: 0.9, x: 0.1, y: 0.4, w: 0.8, h: 0.05 },
    { text: '# eng-billing', confidence: 1, x: 0.03, y: 0.9, w: 0.3, h: 0.06 },
    { text: '4:52 PM', confidence: 0.8, x: 0.4, y: 0.71, w: 0.1, h: 0.04 },
    { text: 'Dana Whitfield', confidence: 0.95, x: 0.1, y: 0.7, w: 0.2, h: 0.05 },
  ];
  const f = fakeOsascript(() => ({ stdout: JSON.stringify({ lines }) }));
  const v = new VisionEngine({ run: f.run, platform: 'darwin' });
  const r = await v.recognize(image, { timeoutMs: 5000 });
  assert.equal(r.text, '# eng-billing\nDana Whitfield 4:52 PM\n@Alex Marlowe ran it beautifully.');
  assert.equal(r.confidence, 91);
  assert.deepEqual(f.calls[0]!.args, ['-l', 'JavaScript', '-e', VISION_SCRIPT, 'read']);
  assert.equal(Buffer.from(f.calls[0]!.input!, 'base64').equals(image), true);
  assert.ok(rules(r.text).pass);

  const err = (reply: Parameters<typeof fakeOsascript>[0]) => new VisionEngine({ run: fakeOsascript(reply).run, platform: 'darwin' }).recognize(image, { timeoutMs: 5000 });
  await assert.rejects(err(() => ({ stdout: '{"error":"The image is not valid"}' })), (e: OcrError) => e.code === 'failed' && /not valid/.test(e.message));
  await assert.rejects(err(() => ({ code: 1, stderr: 'execution error: boom\n' })), (e: OcrError) => e.code === 'failed' && /boom/.test(e.message));
  await assert.rejects(err(() => ({ stdout: 'not json' })), (e: OcrError) => e.code === 'failed' && /unexpected/.test(e.message));
  const { ProcError } = await import('../server/proc.ts');
  await assert.rejects(err(() => new ProcError('osascript took longer than 5000 ms', 'timeout')), (e: OcrError) => e.code === 'timeout');
  await assert.rejects(err(() => new ProcError("osascript isn't installed", 'not_found')), (e: OcrError) => e.code === 'unavailable');
  // the image is checked before osascript is ever run
  await assert.rejects(new VisionEngine({ run: fakeOsascript(() => assert.fail('ran')).run, platform: 'darwin' }).recognize(new Uint8Array(10), { timeoutMs: 5000 }), (e: OcrError) => e.code === 'unsupported');
});

test("Vision's lines without boxes keep Vision's order; empty lines are dropped", () => {
  assert.equal(linesToText([{ text: 'b' }, { text: ' ' }, { text: 'a' }]), 'b\na');
  assert.equal(linesToText([]), '');
});

// On macOS CI this is the real thing: Vision through osascript on a rendered screenshot (SPEC R8: verified on a macOS
// runner). Skipped elsewhere; the Linux dev box can't run it.
test('macOS: the real Apple Vision path reads a screenshot', { skip: process.platform !== 'darwin' && 'Apple Vision is macOS only' }, async () => {
  const v = new VisionEngine();
  const available = await v.available();
  assert.deepEqual(available, { ok: true }, `Vision should work on a macOS runner: ${JSON.stringify(available)}`);
  const ocr = createOcr();
  try {
    const r = await ocr.read({ bytes: png(caseById('praise-billing').svg) });
    assert.equal(r.engine, 'vision', `the Vision path ran (skipped: ${r.skipped.join('; ')})`);
    assert.match(r.text, /Alex Marlowe/);
    assert.ok(rules(r.text).pass, r.text);
  } finally {
    await ocr.close();
  }
});

// ---- bragdoc dev ocr -------------------------------------------------------------------------------------------------

const CLI = ['--import', 'tsx', path.join(ROOT, 'server', 'cli.ts')];

test('bragdoc dev ocr: the engine, the text and the rules, for each image; JSON with --json', () => {
  const h = tmpHome();
  try {
    const dir = path.join(h.home, 'shots');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'praise.png'), png(caseById('praise-billing').svg));
    fs.writeFileSync(path.join(dir, 'dashboard.png'), png(caseById('dashboard').svg));
    // from the checkout (where tsx resolves), with the images by absolute path
    const run = (...args: string[]) => spawnSync(process.execPath, [...CLI, ...args.map((a) => (/\.(png|txt)$/.test(a) ? path.join(dir, a) : a))], { cwd: ROOT, env: h.env, encoding: 'utf8' });
    const json = run('dev', 'ocr', 'praise.png', 'dashboard.png', '--engine', 'tesseract', '--name', 'Alex Marlowe', '--aliases', 'Alex,AM', '--not-me', 'Alex P', '--json');
    assert.equal(json.status, 0, json.stderr);
    const out = JSON.parse(json.stdout) as { file: string; engine: string; text: string; rules: { pass: boolean; quote?: string } }[];
    assert.deepEqual(out.map((o) => [path.basename(o.file), o.engine, o.rules.pass]), [
      ['praise.png', 'tesseract', true],
      ['dashboard.png', 'tesseract', false],
    ]);
    assert.match(out[0]!.rules.quote!, /@Alex Marlowe ran the dual-write plan beautifully/);

    // no flags: the data home's profile.yaml; none there: the rules are skipped
    const plain = run('dev', 'ocr', 'praise.png', '--engine', 'tesseract');
    assert.equal(plain.status, 0, plain.stderr);
    assert.match(plain.stdout, /praise\.png: tesseract, \d+ ms/);
    assert.match(plain.stdout, /--- rules: skipped \(no profile/);
    fs.mkdirSync(h.dataDir, { recursive: true });
    fs.writeFileSync(path.join(h.dataDir, 'profile.yaml'), 'name: Alex Marlowe\naliases: [AM]\n');
    const withProfile = run('dev', 'ocr', 'praise.png', '--engine', 'tesseract');
    assert.match(withProfile.stdout, /--- rules for Alex Marlowe: PASS ---\n {2}Says your name: "@Alex Marlowe"/);
    assert.ok(!fs.readdirSync(h.dataDir).some((f) => f !== 'profile.yaml'), 'dev ocr wrote nothing to the data home');
    fs.writeFileSync(path.join(h.dataDir, 'profile.yaml'), 'role: nobody\n');
    assert.match(run('dev', 'ocr', 'praise.png', '--engine', 'tesseract').stderr, /isn't a valid profile; the rules are skipped/);

    // unhappy paths
    const missing = run('dev', 'ocr', 'nope.png');
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /nope\.png: ENOENT/);
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'hello');
    const text = run('dev', 'ocr', 'notes.txt', '--engine', 'tesseract');
    assert.equal(text.status, 1);
    assert.match(text.stderr, /isn't an image BragDoc can read text in/);
    for (const [args, msg] of [
      [['dev'], /dev needs a command/],
      [['dev', 'frob'], /unknown dev command 'frob'/],
      [['dev', 'ocr'], /needs at least one image/],
      [['dev', 'ocr', 'x.png', '--engine', 'magic'], /--engine must be one of auto, tesseract, vision/],
      [['dev', 'ocr', 'x.png', '--port', '1'], /dev ocr doesn't take --port/],
      [['dev', 'ocr', 'x.png', '--aliases', 'AM'], /--aliases and --not-me go with --name/],
    ] as const) {
      const r = run(...args);
      assert.equal(r.status, 2, `${args.join(' ')}: ${r.stderr}`);
      assert.match(r.stderr, msg);
    }
    if (process.platform !== 'darwin') {
      const vision = run('dev', 'ocr', 'praise.png', '--engine', 'vision');
      assert.equal(vision.status, 1);
      assert.match(vision.stderr, /Apple Vision is only on macOS/);
    }
  } finally {
    h.cleanup();
  }
});
