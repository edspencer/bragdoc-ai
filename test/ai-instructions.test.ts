// The instructions files (PR22, D67): ai/what-counts.md and ai/style.md, user data owned by the store. Written through
// the service and the API, picked up live after a hand edit, a Problem when broken (and never overwritten unseen),
// capped in size, kept in backups, and never gitignored.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { INSTRUCTIONS_MAX_CHARS } from '../shared/ai/instructions.ts';
import type { StoreChange } from '../shared/schema/index.ts';
import { forwardStoreChanges } from '../server/live.ts';
import { EventBus } from '../server/events.ts';
import { GITIGNORED } from '../server/home.ts';
import { takeSnapshot } from '../server/store/backups.ts';
import { ConflictError, NotFoundError, ValidationError } from '../server/store/index.ts';
import type { StoreWatcher } from '../server/store/watch.ts';
import { aiHome, type AiHome } from './ai-fixture.ts';
import { liveWatcher, storeHome, type StoreHome } from './store-fixture.ts';

let h: StoreHome | undefined;
let w: StoreWatcher | undefined;
let a: AiHome | undefined;
afterEach(async () => {
  await w?.close();
  w = undefined;
  h?.cleanup();
  h = undefined;
  a?.close();
  a = undefined;
});

const until = async (cond: () => boolean, what: string, ms = 10_000) => {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 10));
  }
};

const WINS = '# What counts as a win for me\n\n- Praise from a customer, by name.\n- A launch I led.\n';

test('written through the service: the whole file, read back with its body and ETag', () => {
  h = storeHome();
  const svc = h.services.instructions;
  assert.equal(svc.get('what-counts').exists, false);
  assert.equal(svc.forPrompt('what-counts'), null);
  const r = svc.put('what-counts', { text: WINS });
  assert.equal(h.read('ai/what-counts.md'), WINS);
  assert.equal(r.exists, true);
  assert.equal(r.file, 'ai/what-counts.md');
  assert.equal(r.text, WINS);
  assert.equal(r.body, WINS);
  assert.match(r.etag!, /^"[0-9a-f]{16}"$/);
  assert.deepEqual(r.problems, []);
  assert.equal(svc.forPrompt('what-counts'), WINS.trim());
  // a restart reads it back the same
  const again = h.reopen();
  assert.equal(again.get('instructions', 'what-counts')?.body, WINS);
});

test('front-matter is optional, and a model is given only the markdown after it; unknown keys are kept', () => {
  h = storeHome();
  const text = `---\nschemaVersion: 1\nmine: keep me\n---\n${WINS}`;
  h.services.instructions.put('style', { text });
  const r = h.services.instructions.get('style');
  assert.equal(r.text, text);
  assert.equal(r.body, WINS);
  assert.equal(h.services.instructions.forPrompt('style'), WINS.trim());
  // markdown that merely contains a rule later on isn't front-matter
  h.services.instructions.put('style', { text: 'Write plainly.\n\n---\n\nNo jargon.\n' });
  assert.equal(h.services.instructions.get('style').body, 'Write plainly.\n\n---\n\nNo jargon.\n');
});

test('only the two names exist; a misspelt file in ai/ is a Problem, anything not markdown is left alone', () => {
  h = storeHome();
  assert.throws(() => h!.services.instructions.get('wins'), NotFoundError);
  assert.throws(() => h!.services.instructions.put('../config', { text: 'x' }), NotFoundError);
  h.put('ai/what_counts.md', 'typo');
  h.put('ai/style.txt', 'wrong extension');
  h.put('ai/notes.json', '{}');
  const store = h.reopen();
  const stray = store.problems().filter((p) => p.code === 'stray');
  assert.deepEqual(stray.map((p) => p.file).sort(), ['ai/style.txt', 'ai/what_counts.md']);
  assert.match(stray.find((p) => p.file === 'ai/what_counts.md')!.message, /ai\/what-counts\.md and ai\/style\.md/);
  assert.match(stray.find((p) => p.file === 'ai/style.txt')!.message, /rename it to style\.md/);
});

test('a hand edit is picked up live, and announced to open tabs as an `instructions` event', async () => {
  h = storeHome();
  const events: StoreChange[] = [];
  h.store.subscribe((c) => events.push(c));
  const bus = new EventBus();
  const sent: string[] = [];
  bus.subscribe((e) => sent.push(e.type));
  forwardStoreChanges(h.store, bus);
  // a watcher that's provably live (macOS, D84), primed by hand edits to this very file
  w = await liveWatcher(h, {
    write: (i) => void h!.put('ai/what-counts.md', `${WINS}<!-- ${i} -->\n`),
    seen: (i) => h!.services.instructions.get('what-counts').text === `${WINS}<!-- ${i} -->\n`,
  });
  h.put('ai/what-counts.md', WINS + '- Mentoring someone through their first launch.\n');
  await until(() => /Mentoring/.test(h!.services.instructions.forPrompt('what-counts') ?? ''), 'the hand edit');
  assert.ok(events.every((e) => e.entity === 'instructions' && e.id === 'what-counts'), JSON.stringify(events));
  await until(() => sent.includes('instructions'), 'the instructions event');
});

test('a hand-made ai/ folder is picked up too, once the watcher is running', async () => {
  h = storeHome();
  w = await liveWatcher(h); // primed by an achievement of its own (macOS, D84)
  h.put('ai/style.md', 'Write plainly.\n');
  await until(() => h!.services.instructions.forPrompt('style') === 'Write plainly.', 'the new ai/ folder');
});

test('a hand-broken file is a Problem: the last good copy is used, and it is never overwritten unseen', () => {
  h = storeHome();
  const svc = h.services.instructions;
  svc.put('what-counts', { text: WINS });
  // front-matter that's never closed
  h.put('ai/what-counts.md', `---\nmine: yes\n${WINS}`);
  let store = h.reopen();
  // a fresh store on the same home has no last good copy; the original store keeps its own
  assert.equal(store.problems()[0]?.code, 'syntax');
  assert.equal(store.problems()[0]?.file, 'ai/what-counts.md');
  assert.match(store.problems()[0]!.message, /never closed/);
  // YAML that isn't
  h.put('ai/what-counts.md', `---\nmine: [unclosed\n---\n${WINS}`);
  store = h.reopen();
  assert.equal(store.problems()[0]?.code, 'syntax');
  // the live store re-reads it and keeps the last good body for prompts
  h.store.reloadPath(path.join(h.home, 'ai/what-counts.md'));
  const r = svc.get('what-counts');
  assert.equal(r.problems[0]?.code, 'syntax');
  assert.equal(r.body, WINS);
  assert.equal(svc.forPrompt('what-counts'), WINS.trim());
  assert.match(r.text!, /unclosed/); // the editor shows what's really there
  // replacing it needs proof you've seen it
  const before = h.read('ai/what-counts.md');
  assert.throws(() => svc.put('what-counts', { text: 'Fixed.\n' }), ConflictError);
  assert.equal(h.read('ai/what-counts.md'), before);
  assert.throws(() => svc.put('what-counts', { text: 'Fixed.\n' }, { ifMatch: '"0000000000000000"' }), ConflictError);
  assert.throws(() => svc.put('what-counts', { text: 'Fixed.\n' }, { ifMatch: '*' }), ConflictError, '`*` is not proof of having seen it');
  svc.put('what-counts', { text: 'Fixed.\n' }, { ifMatch: r.etag });
  assert.equal(h.read('ai/what-counts.md'), 'Fixed.\n');
  assert.deepEqual(svc.get('what-counts').problems, []);
});

test('a byte-order mark before the front-matter: still front-matter, never sent to the model', () => {
  h = storeHome();
  h.put('ai/style.md', '\uFEFF---\nschemaVersion: 1\nnote: mine\n---\nWrite plainly.\n');
  const store = h.reopen();
  assert.equal(store.get('instructions', 'style')?.body, 'Write plainly.\n');
  h.put('ai/style.md', '\uFEFF---\nschemaVersion: 2\n---\nFrom the future.\n');
  assert.equal(h.reopen().entry('instructions', 'style')?.readOnly, true);
});

test('a huge file is a Problem, and a huge save is refused with nothing written', () => {
  h = storeHome();
  const svc = h.services.instructions;
  svc.put('style', { text: 'Short.\n' });
  const huge = 'All work and no play. '.repeat(Math.ceil(INSTRUCTIONS_MAX_CHARS / 22) + 10);
  assert.throws(() => svc.put('style', { text: huge }), (e: unknown) => e instanceof ValidationError && /at most 20,000/.test(e.message));
  assert.equal(h.read('ai/style.md'), 'Short.\n');
  h.put('ai/style.md', huge);
  h.store.reloadPath(path.join(h.home, 'ai/style.md'));
  const r = svc.get('style');
  assert.equal(r.problems[0]?.code, 'invalid');
  assert.match(r.problems[0]!.message, /characters long/);
  assert.equal(svc.forPrompt('style'), 'Short.'); // the last good copy
  // exactly at the cap is fine
  assert.doesNotThrow(() => svc.put('style', { text: 'x'.repeat(INSTRUCTIONS_MAX_CHARS) }, { ifMatch: r.etag }));
});

test('a file from a newer BragDoc is read-only', () => {
  h = storeHome();
  h.put('ai/style.md', '---\nschemaVersion: 2\n---\nFrom the future.\n');
  const store = h.reopen();
  assert.equal(store.entry('instructions', 'style')?.readOnly, true);
  assert.equal(store.get('instructions', 'style')?.body, 'From the future.\n');
  h.store.reloadPath(path.join(h.home, 'ai/style.md'));
  assert.throws(() => h!.services.instructions.put('style', { text: 'Mine.\n' }), /newer BragDoc/);
  assert.throws(() => h!.services.instructions.put('style', { text: '---\nschemaVersion: 3\n---\nx\n' }, { ifMatch: '*' }));
});

test('in the backups, and not gitignored', () => {
  h = storeHome();
  h.services.instructions.put('what-counts', { text: WINS });
  const name = takeSnapshot(h.home)!;
  assert.equal(fs.readFileSync(path.join(h.home, 'backups', name, 'ai', 'what-counts.md'), 'utf8'), WINS);
  assert.ok(!GITIGNORED.some((g) => g.startsWith('/ai')));
});

test('reset: the starter back, your version moved into backups/removed/ first; ensure() never replaces', () => {
  h = storeHome();
  const svc = h.services.instructions;
  assert.throws(() => svc.reset('what-counts'), NotFoundError); // no feature has a starter yet
  const off = svc.setStarter('what-counts', () => 'The starter.\n');
  assert.equal(svc.get('what-counts').hasStarter, true);
  // no file: ensure writes it
  assert.equal(svc.ensure('what-counts', 'The starter.\n').text, 'The starter.\n');
  assert.equal(svc.ensure('what-counts', 'Another starter.\n').text, 'The starter.\n');
  // the same text: nothing moved
  assert.equal(svc.reset('what-counts').removedTo, null);
  svc.put('what-counts', { text: WINS });
  const r = svc.reset('what-counts');
  assert.equal(r.text, 'The starter.\n');
  assert.match(r.removedTo!, /^backups\/removed\/[^/]+\/ai\/what-counts\.md$/);
  assert.equal(h.read(r.removedTo!), WINS);
  // a broken file can be reset too (it's moved, not lost)
  h.put('ai/what-counts.md', '---\nbroken: [\n');
  h.store.reloadPath(path.join(h.home, 'ai/what-counts.md'));
  const r2 = svc.reset('what-counts');
  assert.equal(h.read('ai/what-counts.md'), 'The starter.\n');
  assert.equal(h.read(r2.removedTo!), '---\nbroken: [\n');
  // a bad starter is refused before anything moves: your file stays where it is
  svc.put('what-counts', { text: WINS });
  assert.throws(() => svc.reset('what-counts', '---\nnever closed\n'), ValidationError);
  assert.throws(() => svc.reset('what-counts', 'x'.repeat(INSTRUCTIONS_MAX_CHARS + 1)), ValidationError);
  assert.equal(h.read('ai/what-counts.md'), WINS);
  assert.equal(svc.forPrompt('what-counts'), WINS.trim());
  off();
  assert.equal(svc.get('what-counts').hasStarter, false);
});

test('the API: GET, PUT with If-Match, reset; AI off changes nothing, and nothing is sent', async () => {
  a = aiHome();
  const res = (method: string, p: string, body?: unknown, headers: Record<string, string> = {}) =>
    a!.app.request(p, { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  let r = await res('GET', '/api/ai/instructions/what-counts');
  assert.equal(r.status, 200);
  assert.equal(((await r.json()) as { exists: boolean }).exists, false);
  assert.equal((await res('GET', '/api/ai/instructions/nope')).status, 404);
  r = await res('PUT', '/api/ai/instructions/what-counts', { text: WINS });
  assert.equal(r.status, 200);
  const etag = r.headers.get('etag')!;
  assert.ok(etag);
  assert.equal(fs.readFileSync(path.join(a.dir, 'ai/what-counts.md'), 'utf8'), WINS);
  // a stale If-Match: 409 with the current ETag
  r = await res('PUT', '/api/ai/instructions/what-counts', { text: 'x' }, { 'If-Match': '"0000000000000000"' });
  assert.equal(r.status, 409);
  assert.equal(r.headers.get('etag'), etag);
  r = await res('PUT', '/api/ai/instructions/what-counts', { text: 'Newer.\n' }, { 'If-Match': etag });
  assert.equal(r.status, 200);
  // bad bodies
  assert.equal((await res('PUT', '/api/ai/instructions/what-counts', { text: 1 })).status, 400);
  assert.equal((await res('PUT', '/api/ai/instructions/what-counts', { text: 'x', more: 1 })).status, 400);
  assert.equal((await res('PUT', '/api/ai/instructions/what-counts', { text: 'y'.repeat(INSTRUCTIONS_MAX_CHARS + 1) })).status, 400);
  // reset: 404 until a feature registers a starter (the judge registers what-counts' when the app is made, PR24)
  assert.equal((await res('POST', '/api/ai/instructions/style/reset')).status, 404);
  a.ctx.services.instructions.setStarter('what-counts', () => 'Starter.\n');
  r = await res('POST', '/api/ai/instructions/what-counts/reset');
  assert.equal(r.status, 200);
  const body = (await r.json()) as { text: string; removedTo: string };
  assert.equal(body.text, 'Starter.\n');
  assert.match(body.removedTo, /^backups\/removed\//);
  // AI was off throughout: these are files, and nothing went anywhere
  assert.equal(a.config.get().ai.enabled, false);
  assert.deepEqual(a.log(), []);
  assert.equal(a.ctx.ai.loaded(), false);
});
