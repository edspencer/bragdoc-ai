// The screenshots source (PR15): the name filter, each file's path through the filters, OCR and the rules into Found,
// the watcher (new files only, half-written files, a folder that goes away, switched off = nothing left open), the
// look back, choosing a folder, and its routes. OCR is a fake that "reads" the text each rendered screenshot was drawn
// with (test/screenshots.ts chat()), so these are fast and the same on every machine; test/ocr.test.ts covers real OCR.
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { EvidenceOcrResponse, ScreenshotsSourceStatus, ScreenshotsSuggestionsResponse, SourcesResponse } from '../shared/api.ts';
import { ConfigStore } from '../server/config.ts';
import { EventBus } from '../server/events.ts';
import { initHome } from '../server/home.ts';
import { createAppWithContext } from '../server/index.ts';
import { OcrError, sha256Of, type Ocr, type OcrResult } from '../server/ocr/index.ts';
import { expandFolder, looksLikeScreenshot, titleOf } from '../server/sources/screenshots.ts';
import { openStore } from '../server/store/index.ts';
import { rmTmp, tmpDir } from './fixture.ts';
import { chat, png } from './screenshots.ts';

const PROFILE = 'name: Alex Marlowe\naliases: [Alex, AM, "@alex.m", Marlowe]\nnotMe: [Alex P, Alexandra]\n';

/** A rendered Slack-style screenshot, and the text a perfect OCR reads from it. */
function shot(text: string, author = 'Dana Whitfield', channel = '# eng-billing'): { bytes: Buffer; text: string } {
  const c = chat({ title: channel, messages: [{ author, time: '4:52 PM', text }] });
  return { bytes: png(c.svg), text: c.text };
}

const PRAISE = shot('Billing cutover is DONE. 41k subscriptions moved. @Alex Marlowe ran the dual-write plan beautifully. Thank you!');
const OTHER = shot('Massive kudos to the SRE team for the zero-downtime Postgres upgrade. Amazing work everyone.', 'Lee Chen', '# kudos');
const DEPLOY = shot('Reminder: the deploy freeze starts Friday at noon.', 'Sam Okafor', '# eng');

/** OCR that reads back the text each known picture was drawn with; counts its reads. */
function fakeOcr(): Ocr & { reads: number; texts: Map<string, string>; fail: Set<string>; gate: Promise<void> | null } {
  const texts = new Map<string, string>();
  const fail = new Set<string>();
  const o = {
    reads: 0,
    texts,
    fail,
    /** While set, every read waits for it (a read "in progress"). */
    gate: null as Promise<void> | null,
    async read(input: { bytes: Uint8Array } | { path: string }): Promise<OcrResult> {
      o.reads++;
      if (o.gate) await o.gate;
      const bytes = 'bytes' in input ? input.bytes : new Uint8Array(fs.readFileSync(input.path));
      const sha = sha256Of(bytes);
      if (fail.has(sha)) throw new OcrError("the PNG can't be decoded", 'unsupported');
      return { engine: 'tesseract', text: texts.get(sha) ?? '', sha256: sha, ms: 1, cached: false, skipped: [] };
    },
    async engines() {
      return [{ name: 'tesseract' as const, ok: true }];
    },
    queued: () => 0,
    async close() {},
  };
  for (const s of [PRAISE, OTHER, DEPLOY]) texts.set(sha256Of(s.bytes), s.text);
  return o;
}

const ROOTS: string[] = [];
after(() => ROOTS.forEach(rmTmp));

function rig({ profile = true, platform }: { profile?: boolean; platform?: NodeJS.Platform } = {}) {
  const root = tmpDir('bragdoc-shots-');
  ROOTS.push(root);
  const home = path.join(root, 'home');
  const dir = path.join(home, '.bragdoc');
  const folder = path.join(home, 'Screenshots');
  fs.mkdirSync(folder, { recursive: true });
  initHome(dir);
  if (profile) fs.writeFileSync(path.join(dir, 'profile.yaml'), PROFILE);
  const bus = new EventBus();
  const config = new ConfigStore(dir, { onChange: () => bus.emit({ type: 'config' }) });
  const ocr = fakeOcr();
  const { app, ctx } = createAppWithContext({ dataDir: dir, webDist: null, bus, config, store: openStore(dir), ocr, homedir: home, env: { PATH: '' } });
  // tests drive the source directly: short waits instead of production's
  const src = ctx.sources.screenshots;
  Object.assign(src as unknown as { healthMs: number; stableMs: number }, { healthMs: 100, stableMs: 150 });
  if (platform) Object.assign(src as unknown as { platform: string }, { platform });
  const call = async <T,>(method: string, p: string, body?: unknown) => {
    const res = await app.request(p, method === 'GET' ? {} : { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? '{}' : JSON.stringify(body) });
    const type = res.headers.get('content-type') ?? '';
    return { status: res.status, body: (type.includes('json') ? await res.json() : await res.arrayBuffer()) as T, type };
  };
  const write = (name: string, bytes: Uint8Array | string) => {
    const p = path.join(folder, name);
    fs.writeFileSync(p, bytes);
    return p;
  };
  return { root, home, dir, folder, app, ctx, src, ocr, bus, call, write };
}

const NAME = 'Screenshot 2026-10-17 at 9.41.03 PM.png';

async function until(what: string, fn: () => boolean, ms = 8000) {
  const end = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > end) assert.fail(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 25));
  }
}

describe('screenshot names', () => {
  test('macOS (U+202F before PM since macOS 14), older macOS, and localized names', () => {
    for (const n of [
      'Screenshot 2026-10-17 at 9.41.03 PM.png',
      'Screenshot 2026-10-17 at 9.41.03 PM.png',
      'Screen Shot 2019-03-01 at 10.02.11 AM.png',
      'Screenshot 2026-10-17 at 21.41.03.png',
      'Screenshot 2026-10-17 at 9.41.03 PM (2).png',
      'Bildschirmfoto 2026-10-17 um 21.41.03.png',
      'Capture d’écran 2026-10-17 à 21.41.03.png',
      'Capture d’écran 2026-10-17 à 21.41.03.png'.normalize('NFD'),
      'Captura de pantalla 2026-10-17 a las 21.41.03.png',
      'スクリーンショット 2026-10-17 21.41.03.png',
      '스크린샷 2026-10-17 오후 9.41.03.png',
      'Skärmavbild 2026-10-17 kl. 21.41.03.png',
    ])
      assert.ok(looksLikeScreenshot(n), n);
  });

  test('Linux and other tools (best effort): GNOME, Spectacle, Flameshot, Windows, CleanShot', () => {
    for (const n of ['Screenshot from 2026-10-17 21-41-03.png', 'Screenshot_20261017_214103.png', '2026-10-17_21-41.png', 'Screenshot 2026-10-17 214103.png', 'CleanShot 2026-10-17 at 21.41.03@2x.png'])
      assert.ok(looksLikeScreenshot(n), n);
  });

  test('ordinary pictures are not screenshots', () => {
    for (const n of ['holiday.png', 'IMG_4031.JPG', 'report 2026.png', 'logo-v2.png', 'diagram 2026-10-17.png']) assert.equal(looksLikeScreenshot(n), false, n);
  });

  test('~/ folders expand; relative ones are refused', () => {
    assert.equal(expandFolder('~/Screenshots', '/home/alex'), '/home/alex/Screenshots');
    assert.equal(expandFolder('~', '/home/alex'), '/home/alex');
    assert.equal(expandFolder('Screenshots', '/home/alex'), null);
  });

  test("a candidate's title is the quote's first sentence", () => {
    assert.equal(titleOf('Billing cutover is DONE. 41k subscriptions moved. Thanks Alex!'), 'Billing cutover is DONE.');
    assert.equal(titleOf('Kudos to Alex'), 'Kudos to Alex');
    assert.ok(titleOf('x'.repeat(300)).endsWith('…'));
  });
});

describe('one file, start to finish', () => {
  test('praise for you → a Found card with the quote, the reasons and the file it points at; nothing copied yet', async () => {
    const r = rig();
    await r.call('PUT', '/api/sources/screenshots', { folder: '~/Screenshots', enabled: true });
    const p = r.write(NAME, PRAISE.bytes);
    const out = await r.src.process(p);
    assert.equal(out.kind, 'sent');
    const [c] = r.ctx.services.found.list();
    assert.equal(c!.source, 'screenshots');
    assert.equal(c!.externalKey, `screenshot:${sha256Of(PRAISE.bytes)}`);
    assert.equal(c!.title, 'Billing cutover is DONE.');
    assert.equal(c!.summary, 'Dana Whitfield in #eng-billing');
    assert.deepEqual(c!.files, [{ path: p, title: NAME }]);
    const q = c!.evidence.find((e) => e.kind === 'quote')!.quote!;
    assert.match(q.text, /dual-write plan beautifully/);
    assert.equal(q.from, 'Dana Whitfield');
    assert.ok(c!.matchedRules.some((x) => x.startsWith('Says your name')));
    assert.equal(c!.matchedRules.filter((x) => x.startsWith('Looks like a chat')).length, 1, 'the chat cues are one chip');
    assert.equal(r.ctx.store.all('evidence').length, 0, 'copied into evidence/ only on keep');
    const s = r.src.status();
    assert.deepEqual(s.counts, { looked: 1, sent: 1, ignored: 0, failed: 0 });
    assert.equal(s.lastMatch?.name, NAME);
    // the same picture again (a copy, a rename) adds nothing
    const again = await r.src.process(r.write('Screenshot 2026-10-17 at 9.41.04 PM.png', PRAISE.bytes));
    assert.equal(again.kind, 'skipped');
    assert.equal(r.ctx.services.found.list().length, 1);
  });

  test("praise for someone else, and a plain message: counted, nothing stored, their text kept nowhere", async () => {
    const r = rig();
    for (const s of [OTHER, DEPLOY]) assert.equal((await r.src.process(r.write(`Screenshot 2026-10-17 at 9.4${s === OTHER ? 1 : 2}.00 PM.png`, s.bytes))).kind, 'looked');
    assert.equal(r.ctx.services.found.list().length, 0);
    assert.deepEqual(r.src.status().counts, { looked: 2, sent: 0, ignored: 0, failed: 0 });
    assert.match(r.src.status().lastSeen!.outcome, /didn’t pass the rules \(doesn’t name you\)/);
    r.src.stop(); // saves the state now: counts and names, never text
    const all = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? all(path.join(d, e.name)) : [path.join(d, e.name)]));
    for (const f of all(r.dir)) assert.doesNotMatch(fs.readFileSync(f, 'latin1'), /Postgres|deploy freeze/, f);
  });

  test('passed over without reading: not a picture, a fake .png, not named like a screenshot, too small, too big, empty', async () => {
    const r = rig();
    const tiny = png('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="#fff"/></svg>');
    const cases: [string, Uint8Array | string, RegExp][] = [
      ['notes.txt', 'hello', /not a picture/],
      ['Screenshot 2026-10-17 at 10.00.00 PM.png', '<html>not a picture</html>', /not a picture, whatever its name says/],
      ['holiday.png', PRAISE.bytes, /not named like a screenshot/],
      ['Screenshot 2026-10-17 at 10.01.00 PM.png', tiny, /too small/],
      ['Screenshot 2026-10-17 at 10.02.00 PM.png', '', /empty/],
    ];
    for (const [name, bytes, why] of cases) {
      const o = await r.src.process(r.write(name, bytes));
      assert.equal(o.kind, 'ignored', name);
      assert.match((o as { why: string }).why, why, name);
    }
    // over the evidence limit (it could never be kept): a sparse 26 MB file, never read
    const big = path.join(r.folder, 'Screenshot 2026-10-17 at 10.03.00 PM.png');
    fs.writeFileSync(big, PRAISE.bytes);
    fs.truncateSync(big, 26 * 1024 * 1024);
    assert.match((await r.src.process(big)).kind === 'ignored' ? r.src.status().lastSeen!.outcome : '', /too big to keep \(26 MB/);
    assert.equal(r.ocr.reads, 0, 'none of them reached OCR');
    assert.equal(r.src.status().counts.ignored, cases.length + 1);
  });

  test('with "only screenshots" off, any picture is read', async () => {
    const r = rig();
    await r.call('PUT', '/api/sources/screenshots', { folder: '~/Screenshots', onlyScreenshots: false });
    assert.equal((await r.src.process(r.write('holiday.png', PRAISE.bytes))).kind, 'sent');
  });

  test("a picture OCR can't read is counted as unreadable; one bad file doesn't stop the rest", async () => {
    const r = rig();
    r.ocr.fail.add(sha256Of(DEPLOY.bytes));
    assert.equal((await r.src.process(r.write('Screenshot 2026-10-17 at 1.00.00 PM.png', DEPLOY.bytes))).kind, 'failed');
    assert.equal((await r.src.process(r.write('Screenshot 2026-10-17 at 1.00.01 PM.png', PRAISE.bytes))).kind, 'sent');
    assert.match(r.src.status().lastSeen!.outcome, /in Found/);
    assert.equal(r.src.status().counts.failed, 1);
  });

  test('a link in the folder is passed over: it may lead anywhere (a hidden folder, the data folder)', async () => {
    const r = rig();
    const hidden = path.join(r.home, '.secret');
    fs.mkdirSync(hidden);
    fs.writeFileSync(path.join(hidden, 'p.png'), PRAISE.bytes);
    const link = path.join(r.folder, NAME);
    fs.symlinkSync(path.join(hidden, 'p.png'), link);
    const o = await r.src.process(link);
    assert.equal(o.kind, 'ignored');
    assert.equal(r.ocr.reads, 0);
  });

  test('without a name in profile.yaml nothing is read, and the card says why', async () => {
    const r = rig({ profile: false });
    assert.equal(r.src.status().needsProfile, true);
    const o = await r.src.process(r.write(NAME, PRAISE.bytes));
    assert.equal(o.kind, 'ignored');
    assert.equal(r.ocr.reads, 0);
  });
});

describe('watching', () => {
  test('a new screenshot reaches Found within seconds; files already there are left alone', async () => {
    const r = rig();
    r.write('Screenshot 2026-10-01 at 9.00.00 AM.png', PRAISE.bytes); // there before: never read by itself
    await r.call('PUT', '/api/sources/screenshots', { folder: '~/Screenshots', enabled: true });
    const stop = r.src.start();
    try {
      await until('watching', () => r.src.handles().watcher);
      await new Promise((res) => setTimeout(res, 300));
      assert.equal(r.ocr.reads, 0, 'no back-scan without asking');
      const other = shot('Huge shoutout to @Alex Marlowe for the pager timeline export. Kudos!', 'Oskar Lindqvist', '# incidents');
      r.ocr.texts.set(sha256Of(other.bytes), other.text);
      r.write(NAME, other.bytes);
      await until('the candidate', () => r.ctx.services.found.list().length === 1);
      assert.equal(r.src.status().state, 'watching');
    } finally {
      stop();
    }
  });

  test('a half-written file is read once, whole (awaitWriteFinish)', async () => {
    const r = rig();
    await r.call('PUT', '/api/sources/screenshots', { folder: '~/Screenshots', enabled: true });
    const stop = r.src.start();
    try {
      await until('watching', () => r.src.handles().watcher);
      const p = path.join(r.folder, NAME);
      const fd = fs.openSync(p, 'w');
      const half = Math.floor(PRAISE.bytes.length / 2);
      fs.writeSync(fd, PRAISE.bytes.subarray(0, half));
      await new Promise((res) => setTimeout(res, 80));
      fs.writeSync(fd, PRAISE.bytes.subarray(half));
      fs.closeSync(fd);
      await until('the candidate', () => r.ctx.services.found.list().length === 1);
      await r.src.idle();
      assert.equal(r.ocr.reads, 1);
      assert.equal(r.src.status().counts.failed, 0);
    } finally {
      stop();
    }
  });

  test('the folder removed while watched: a red status, no crash loop; back by itself when it returns', async () => {
    const r = rig();
    await r.call('PUT', '/api/sources/screenshots', { folder: '~/Screenshots', enabled: true });
    const stop = r.src.start();
    try {
      await until('watching', () => r.src.handles().watcher);
      fs.rmSync(r.folder, { recursive: true });
      await until('the error', () => r.src.status().state === 'error');
      assert.equal(r.src.status().error?.code, 'missing');
      assert.equal(r.src.handles().watcher, false);
      assert.equal(((await r.call<SourcesResponse>('GET', '/api/sources')).body as SourcesResponse).screenshots.state, 'error');
      fs.mkdirSync(r.folder);
      await until('watching again', () => r.src.status().state === 'watching' && r.src.handles().watcher);
      r.write(NAME, PRAISE.bytes);
      await until('the candidate', () => r.ctx.services.found.list().length === 1);
    } finally {
      stop();
    }
  });

  test('switched off: the watcher is closed, what was waiting is dropped, and stop() leaves no handles', async () => {
    const r = rig();
    await r.call('PUT', '/api/sources/screenshots', { folder: '~/Screenshots', enabled: true });
    const stop = r.src.start();
    await until('watching', () => r.src.handles().watcher);
    assert.deepEqual(r.src.handles(), { watcher: true, health: true });
    const off = await r.call<ScreenshotsSourceStatus>('PUT', '/api/sources/screenshots', { enabled: false });
    assert.equal(off.body.state, 'off');
    assert.equal(r.src.handles().watcher, false);
    r.write(NAME, PRAISE.bytes);
    await new Promise((res) => setTimeout(res, 500));
    assert.equal(r.ocr.reads, 0, 'nothing is read while it is off');
    stop();
    assert.deepEqual(r.src.handles(), { watcher: false, health: false });
  });

  test('switched off while a screenshot is being read: that read adds nothing, and what was waiting is dropped', async () => {
    const r = rig();
    await r.call('PUT', '/api/sources/screenshots', { folder: '~/Screenshots', enabled: true });
    const stop = r.src.start();
    try {
      await until('watching', () => r.src.handles().watcher);
      let release!: () => void;
      r.ocr.gate = new Promise((res) => (release = res));
      r.write(NAME, PRAISE.bytes);
      r.write('Screenshot 2026-10-17 at 9.41.04 PM.png', OTHER.bytes);
      await until('a read in progress, one waiting', () => r.ocr.reads === 1 && r.src.status().queued === 1);
      await r.call('PUT', '/api/sources/screenshots', { enabled: false });
      assert.equal(r.src.status().queued, 0, 'what was waiting is dropped');
      release();
      await r.src.idle();
      assert.equal(r.ctx.services.found.list().length, 0, 'the read that was running added nothing');
      assert.equal(r.ocr.reads, 1);
    } finally {
      stop();
    }
  });

  test('a folder deleted and made again between checks is watched again (a new directory at the same path)', async () => {
    const r = rig();
    await r.call('PUT', '/api/sources/screenshots', { folder: '~/Screenshots', enabled: true });
    const stop = r.src.start();
    try {
      await until('watching', () => r.src.handles().watcher);
      fs.rmSync(r.folder, { recursive: true });
      fs.mkdirSync(r.folder);
      await new Promise((res) => setTimeout(res, 400)); // a few health checks
      r.write(NAME, PRAISE.bytes);
      await until('the candidate', () => r.ctx.services.found.list().length === 1);
    } finally {
      stop();
    }
  });

  test('a hand edit of config.yaml switching it on is followed', async () => {
    const r = rig();
    const stop = r.src.start();
    try {
      const file = path.join(r.dir, 'config.yaml');
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('enabled: false\n    folder: null', 'enabled: true\n    folder: ~/Screenshots'));
      r.ctx.config.get(); // any request re-reads it (the Host check); that fires `config`
      await until('watching', () => r.src.handles().watcher);
    } finally {
      stop();
    }
  });
});

describe('choosing a folder, the look back, and the routes', () => {
  test('a folder is checked before it is saved: missing, a file, relative, hidden, the data folder', async () => {
    const r = rig();
    fs.writeFileSync(path.join(r.home, 'a-file'), 'x');
    fs.mkdirSync(path.join(r.home, '.hidden'));
    const cases: [string, number, string][] = [
      ['~/Nope', 400, 'missing'],
      ['~/a-file', 400, 'not_a_folder'],
      ['Screenshots', 400, 'invalid'],
      ['~/.hidden', 400, 'not_allowed'],
      [r.dir, 400, 'not_allowed'],
      [r.home, 400, 'not_allowed'], // holds the data folder
      ['/', 400, 'not_allowed'], // so does the root of the file system
    ];
    for (const [folder, status, code] of cases) {
      const res = await r.call<{ error: { code: string } }>('PUT', '/api/sources/screenshots', { folder, enabled: true });
      assert.equal(res.status, status, folder);
      assert.equal(res.body.error.code, code, folder);
    }
    assert.equal(r.ctx.config.get().sources.screenshots.enabled, false, 'nothing was saved');
    const notSet = await r.call<{ error: { code: string } }>('PUT', '/api/sources/screenshots', { enabled: true });
    assert.equal(notSet.status, 409);
    assert.equal(notSet.body.error.code, 'not_set');
    assert.equal((await r.call('PUT', '/api/sources/screenshots', { folder: '~/Screenshots', what: 1 })).status, 400);
    const ok = await r.call<ScreenshotsSourceStatus>('PUT', '/api/sources/screenshots', { folder: `${r.home}/Screenshots`, enabled: true });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.folder, '~/Screenshots', 'saved as ~/…');
    assert.match(fs.readFileSync(path.join(r.dir, 'config.yaml'), 'utf8'), /folder: ~\/Screenshots/);
  });

  test("macOS: a folder the system won't let BragDoc read says so, and why", async () => {
    const r = rig({ platform: 'darwin' });
    const desktop = path.join(r.home, 'Desktop');
    fs.mkdirSync(desktop);
    const realReaddir = fs.promises.readdir;
    // as root, chmod can't make a folder unreadable: stand in for TCC's EPERM
    (fs.promises as { readdir: unknown }).readdir = async (p: fs.PathLike, ...rest: unknown[]) => {
      if (String(p) === desktop) throw Object.assign(new Error('operation not permitted'), { code: 'EPERM' });
      return (realReaddir as (...a: unknown[]) => unknown)(p, ...rest);
    };
    try {
      const res = await r.call<{ error: { code: string; message: string } }>('PUT', '/api/sources/screenshots', { folder: '~/Desktop', enabled: true });
      assert.equal(res.status, 409);
      assert.equal(res.body.error.code, 'denied');
      assert.match(res.body.error.message, /Desktop, Documents and Downloads are protected/);
      assert.match(res.body.error.message, /Privacy & Security/);
    } finally {
      (fs.promises as { readdir: unknown }).readdir = realReaddir;
    }
  });

  test('suggestions: Linux looks in Pictures/Screenshots (XDG); the ones that exist come first', async () => {
    const r = rig({ platform: 'linux' });
    const s = (await r.call<ScreenshotsSuggestionsResponse>('GET', '/api/sources/screenshots/suggestions')).body;
    assert.equal(s.platform, 'linux');
    assert.deepEqual(s.suggestions.map((x) => [x.folder, x.exists]), [['~/Screenshots', true], ['~/Pictures/Screenshots', false], ['~/Pictures', false]]);
    assert.ok(s.suggestions.every((x) => !x.protected));
  });

  test("suggestions on macOS without `defaults`: the Desktop (protected) and a folder of their own", async () => {
    const r = rig({ platform: 'darwin' });
    const s = (await r.call<ScreenshotsSuggestionsResponse>('GET', '/api/sources/screenshots/suggestions')).body;
    const desk = s.suggestions.find((x) => x.folder === '~/Desktop')!;
    assert.equal(desk.protected, true);
    assert.match(desk.why, /the default/);
    assert.ok(s.suggestions.some((x) => x.folder === '~/Screenshots' && !x.protected));
  });

  test('the look back reads the last 7 days once, oldest first, and skips older files', async () => {
    const r = rig();
    await r.call('PUT', '/api/sources/screenshots', { folder: '~/Screenshots', enabled: true });
    const old = r.write('Screenshot 2026-09-01 at 9.00.00 AM.png', OTHER.bytes);
    const tenDays = (Date.now() - 10 * 86_400_000) / 1000;
    fs.utimesSync(old, tenDays, tenDays);
    r.write(NAME, PRAISE.bytes);
    const newer = r.write('Screenshot 2026-10-17 at 9.50.00 PM.png', DEPLOY.bytes);
    const twoDays = (Date.now() - 2 * 86_400_000) / 1000;
    fs.utimesSync(path.join(r.folder, NAME), twoDays, twoDays);
    r.write('notes.txt', 'not a picture'); // not counted: the look back takes pictures only
    const order: string[] = [];
    const read = r.ocr.read.bind(r.ocr);
    r.ocr.read = async (input) => {
      const res = await read(input);
      order.push(res.sha256);
      return res;
    };
    let release!: () => void;
    r.ocr.gate = new Promise((res) => (release = res));
    const res = await r.call<ScreenshotsSourceStatus>('POST', '/api/sources/screenshots/look-back', { days: 7 });
    assert.equal(res.status, 200);
    assert.equal(res.body.lookBack?.total, 2);
    const busy = await r.call<{ error: { code: string } }>('POST', '/api/sources/screenshots/look-back', { days: 7 });
    assert.equal(busy.status, 409);
    assert.equal(busy.body.error.code, 'busy');
    release();
    r.ocr.gate = null;
    await r.src.idle();
    assert.deepEqual(order, [sha256Of(PRAISE.bytes), sha256Of(fs.readFileSync(newer))], 'oldest first');
    assert.equal(r.ctx.services.found.list().length, 1);
    assert.deepEqual({ ...r.src.status().lookBack, at: '' }, { running: false, days: 7, total: 2, done: 2, at: '' });
    assert.equal(r.src.status().counts.ignored, 0);
    assert.equal((await r.call('POST', '/api/sources/screenshots/look-back', { days: 400 })).status, 400);
  });

  test("the card's picture: served from where it is while pending, 404 gone once it has moved", async () => {
    const r = rig();
    const p = r.write(NAME, PRAISE.bytes);
    await r.src.process(p);
    const [c] = r.ctx.services.found.list();
    const ok = await r.call<ArrayBuffer>('GET', `/api/found/${c!.id}/picture`);
    assert.equal(ok.status, 200);
    assert.equal(ok.type, 'image/png');
    assert.equal(Buffer.from(ok.body).equals(PRAISE.bytes), true);
    // replaced by another picture under the same name: not shown, and not kept
    fs.writeFileSync(p, OTHER.bytes);
    assert.equal((await r.call('GET', `/api/found/${c!.id}/picture`)).status, 404);
    fs.rmSync(p);
    const gone = await r.call<{ error: { code: string } }>('GET', `/api/found/${c!.id}/picture`);
    assert.equal(gone.status, 404);
    assert.equal(gone.body.error.code, 'gone');
    // keeping it now keeps the quote, and says the picture had gone
    const kept = await r.call<{ missingFiles: string[]; achievementId: string }>('POST', `/api/found/${c!.id}/keep`);
    assert.deepEqual(kept.body.missingFiles, [p]);
    assert.ok(r.ctx.store.get('achievement', kept.body.achievementId)!.evidence.some((e) => e.kind === 'quote'));
  });

  test("the picture route never serves from a hidden folder or the data folder, whatever found/<id>.yaml says", async () => {
    const r = rig();
    await r.src.process(r.write(NAME, PRAISE.bytes));
    const [c] = r.ctx.services.found.list();
    const file = path.join(r.dir, 'found', `${c!.id}.yaml`);
    for (const target of [path.join(r.home, '.secret', 'p.png'), path.join(r.dir, 'p.png')]) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, PRAISE.bytes); // even the very bytes that passed
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/path: .*/, `path: ${target}`));
      r.ctx.store.reloadPath(file, { dir: false });
      assert.equal(r.ctx.store.get('found', c!.id)!.files[0]!.path, target);
      assert.equal((await r.call('GET', `/api/found/${c!.id}/picture`)).status, 404, target);
    }
  });

  test("keep after the screenshot was replaced keeps the quote, not the other picture", async () => {
    const r = rig();
    const p = r.write(NAME, PRAISE.bytes);
    await r.src.process(p);
    const [c] = r.ctx.services.found.list();
    fs.writeFileSync(p, OTHER.bytes);
    const kept = await r.call<{ missingFiles: string[]; achievementId: string }>('POST', `/api/found/${c!.id}/keep`);
    assert.deepEqual(kept.body.missingFiles, [p]);
    assert.deepEqual(r.ctx.store.get('achievement', kept.body.achievementId)!.evidence.map((e) => e.kind), ['quote']);
  });

  test("keep copies the screenshot into evidence/, with its text on the sidecar once read (searchable)", async () => {
    const r = rig();
    await r.src.process(r.write(NAME, PRAISE.bytes));
    const [c] = r.ctx.services.found.list();
    const kept = await r.call<{ achievementId: string }>('POST', `/api/found/${c!.id}/keep`);
    const stop = r.ctx.evidenceText.start();
    try {
      await r.ctx.evidenceText.idle();
      const sha = sha256Of(PRAISE.bytes);
      assert.match(r.ctx.store.get('evidence', sha)!.ocr!.text, /dual-write/);
      assert.deepEqual(r.ctx.store.search('dual-write').map((h) => h.id), [kept.body.achievementId]);
    } finally {
      stop();
    }
  });

  test('GET /api/sources reports the screenshots folder', async () => {
    const r = rig();
    const s = (await r.call<SourcesResponse>('GET', '/api/sources')).body.screenshots;
    assert.deepEqual({ enabled: s.enabled, folder: s.folder, state: s.state, onlyScreenshots: s.onlyScreenshots }, { enabled: false, folder: null, state: 'off', onlyScreenshots: true });
  });
});

describe("the board's pictures", () => {
  test('a pasted picture is read in the background: pending, then its text (searchable) and the quote to offer', async () => {
    const r = rig();
    const up = await r.app.request('/api/evidence', { method: 'POST', headers: { 'Content-Type': 'image/png', 'X-Filename': 'paste.png' }, body: PRAISE.bytes });
    assert.equal(up.status, 201);
    const sha = sha256Of(PRAISE.bytes);
    assert.equal((await r.call<EvidenceOcrResponse>('GET', `/api/evidence/${sha}/ocr`)).body.status, 'pending');
    const a = r.ctx.services.achievements.create({ title: 'Billing cutover', evidence: [{ kind: 'image', blob: sha }] }).achievement;
    const stop = r.ctx.evidenceText.start();
    try {
      await r.ctx.evidenceText.idle();
      const o = (await r.call<EvidenceOcrResponse>('GET', `/api/evidence/${sha}/ocr`)).body;
      assert.equal(o.status, 'done');
      assert.match(o.text!, /dual-write/);
      assert.match(o.quote!.text, /beautifully/);
      assert.equal(o.quote!.from, 'Dana Whitfield');
      assert.deepEqual(r.ctx.store.search('dual-write').map((h) => h.id), [a.id], 'the text is searchable');
    } finally {
      stop();
    }
  });

  test("a picture whose text isn't praise has no quote; one OCR can't read says failed; not a picture says none", async () => {
    const r = rig();
    const send = (bytes: Uint8Array | string, type: string) => r.app.request('/api/evidence', { method: 'POST', headers: { 'Content-Type': type, 'X-Filename': 'x' }, body: bytes });
    await send(DEPLOY.bytes, 'image/png');
    const bad = shot('Something OCR chokes on');
    r.ocr.fail.add(sha256Of(bad.bytes));
    await send(bad.bytes, 'image/png');
    await send('%PDF-1.4\n%%EOF\n', 'application/pdf');
    const stop = r.ctx.evidenceText.start();
    try {
      await r.ctx.evidenceText.idle();
      const get = async (sha: string) => (await r.call<EvidenceOcrResponse>('GET', `/api/evidence/${sha}/ocr`)).body;
      const plain = await get(sha256Of(DEPLOY.bytes));
      assert.equal(plain.status, 'done');
      assert.equal(plain.quote, undefined);
      assert.equal((await get(sha256Of(bad.bytes))).status, 'failed');
      assert.equal((await get(sha256Of(Buffer.from('%PDF-1.4\n%%EOF\n')))).status, 'none');
      assert.equal((await r.call('GET', `/api/evidence/${'0'.repeat(64)}/ocr`)).status, 404);
    } finally {
      stop();
    }
  });
});
