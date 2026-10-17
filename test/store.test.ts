// The store against hostile files: hand-edited invalid YAML, schema errors, a future schemaVersion, dangling ids, misnamed
// files, concurrent writes, and edits landing behind its back. The rule throughout: Problems, never a crash, and a
// broken file is never rewritten.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { ulid } from '../shared/ulid.ts';
import { createServices } from '../server/services/index.ts';
import { relPathFor } from '../server/store/files.ts';
import { ConflictError, ReadOnlyError, ValidationError } from '../server/store/index.ts';
import { storeHome, type StoreHome } from './store-fixture.ts';

let h: StoreHome;
afterEach(() => h?.cleanup());

const projectYaml = (id: string, extra = '') => `# hand-written\nid: ${id}\nname: Apollo # codename\ncolor: '#3b6cf6'\nstart: 2026-01-05\n${extra}`;

test('an empty or missing data home is an empty store', () => {
  h = storeHome();
  assert.deepEqual(h.store.problems(), []);
  assert.equal(h.store.profile(), null);
  assert.equal(h.store.all('achievement').length, 0);
});

test('comments in a hand-edited project.yaml survive an update through the service', () => {
  h = storeHome();
  const id = ulid();
  const rel = relPathFor('project', id);
  h.put(rel, projectYaml(id, 'mood: unknown keys stay\n'));
  h.store.reloadPath(`${h.home}/${rel}`);
  h.services.projects.update(id, { name: 'Apollo 2', end: '2026-06-30' });
  assert.equal(h.read(rel), `# hand-written\nid: ${id}\nname: Apollo 2 # codename\ncolor: '#3b6cf6'\nstart: 2026-01-05\nmood: unknown keys stay\nend: 2026-06-30\n`);
  assert.equal(h.store.get('project', id)!.name, 'Apollo 2');
});

test('invalid YAML is a Problem with a line; the store keeps serving and never rewrites the file', () => {
  h = storeHome();
  const good = h.services.projects.create({ name: 'Good' });
  const id = ulid();
  const rel = relPathFor('project', id);
  const broken = `id: ${id}\nname: [oops\ncolor: '#000000'\n`;
  h.put(rel, broken);
  const store = h.reopen();
  const p = store.problems().find((x) => x.file === rel)!;
  assert.equal(p.code, 'syntax');
  assert.equal(p.severity, 'error');
  assert.ok(p.line && p.line >= 2);
  assert.equal(store.get('project', good.id)!.name, 'Good', 'the rest still loads');
  assert.equal(store.get('project', id), undefined);
  // unrelated writes leave it alone; a write to it is refused
  const services = createServices(store);
  services.projects.update(good.id, { name: 'Still good' });
  services.projects.create({ name: 'Another' });
  assert.throws(() => services.projects.update(id, { name: 'fix?' }), ConflictError);
  assert.equal(h.read(rel), broken);
});

test('a file that breaks keeps its last good value, gains a Problem, and recovers when fixed', () => {
  h = storeHome();
  const p = h.services.projects.create({ name: 'Apollo' });
  const rel = relPathFor('project', p.id);
  const changes: unknown[] = [];
  h.store.subscribe((c) => changes.push(c));
  const original = h.read(rel);
  h.put(rel, original.replace(/^color: .*$/m, 'color: not a colour'));
  h.store.reloadPath(`${h.home}/${rel}`);
  assert.equal(h.store.get('project', p.id)!.name, 'Apollo', 'last good value kept');
  const prob = h.store.problems().find((x) => x.file === rel)!;
  assert.equal(prob.code, 'invalid');
  assert.equal(prob.key, 'color');
  assert.deepEqual(changes, [{ entity: 'project', id: p.id, op: 'upsert', problem: true }]);
  assert.throws(() => h.services.projects.update(p.id, { name: 'x' }), /won't overwrite it/);
  h.put(rel, original);
  h.store.reloadPath(`${h.home}/${rel}`);
  assert.deepEqual(h.store.problems(), []);
});

test('a future schemaVersion is read-only: shown, a Problem, never rewritten', () => {
  h = storeHome();
  const id = ulid();
  const rel = relPathFor('project', id);
  const text = projectYaml(id, 'schemaVersion: 7\nnewFangled: true\n');
  h.put(rel, text);
  const store = h.reopen();
  const p = store.get('project', id)!;
  assert.equal(p.name, 'Apollo');
  assert.equal(p.schemaVersion, 7);
  assert.equal(store.entry('project', id)!.readOnly, true);
  assert.equal(store.problems()[0].code, 'future-version');
  assert.match(store.problems()[0].message, /version 7 .* newer BragDoc/);
  assert.throws(() => store.write('project', id, () => ({ patch: { name: 'x' } })), ReadOnlyError);
  assert.equal(h.read(rel), text);
  // an unreadable version counts as from the future too
  h.put(rel, projectYaml(id, 'schemaVersion: banana\n'));
  store.reloadPath(`${h.home}/${rel}`);
  assert.equal(store.entry('project', id)!.readOnly, true);
});

test('an older (or absent) schemaVersion is version 1 and loads normally', () => {
  h = storeHome();
  const id = ulid();
  h.put(relPathFor('project', id), projectYaml(id));
  const store = h.reopen();
  assert.equal(store.get('project', id)!.schemaVersion, 1);
  assert.equal(store.entry('project', id)!.readOnly, false);
  assert.deepEqual(store.problems(), []);
});

test('a dangling reference is tolerated and flagged once per missing id', () => {
  h = storeHome();
  const ghost = ulid();
  const a = ulid();
  const b = ulid();
  for (const id of [a, b])
    h.put(
      relPathFor('achievement', id),
      `---\nid: ${id}\ntitle: Shipped it\nhappenedAt: 2026-10-01\nprojects: [${ghost}]\ncreatedAt: 2026-10-01T00:00:00Z\nupdatedAt: 2026-10-01T00:00:00Z\n---\nBody\n`,
    );
  const store = h.reopen();
  assert.equal(store.all('achievement').length, 2, 'both still load');
  const probs = store.problems();
  assert.equal(probs.length, 1);
  assert.equal(probs[0].code, 'dangling');
  assert.equal(probs[0].severity, 'warning');
  assert.match(probs[0].message, new RegExp(`project ${ghost}.*1 more`));
});

test('id mismatches, misnamed files and stray extensions are Problems, not crashes', () => {
  h = storeHome();
  const id = ulid();
  h.put(relPathFor('project', id), projectYaml(ulid()));
  h.put('projects/apollo.yaml', 'name: x\n');
  h.put(`projects/${ulid()}.yml`, 'name: x\n');
  h.put('projects/README.md', 'notes are fine');
  h.put(relPathFor('achievement', ulid()), 'no front-matter here\n');
  const store = h.reopen();
  const codes = store.problems().map((p) => `${p.code}:${p.file.split('/')[0]}`).sort();
  assert.deepEqual(codes, ['invalid:projects', 'stray:projects', 'stray:projects', 'syntax:achievements']);
  assert.match(store.problems().find((p) => p.code === 'invalid')!.message, /doesn't match the file name/);
});

test('a hand-written file may leave its id to its file name', () => {
  h = storeHome();
  const id = ulid();
  h.put(relPathFor('company', id), 'name: Cyberdyne\n');
  assert.equal(h.reopen().get('company', id)!.name, 'Cyberdyne');
});

test('concurrent writes to one achievement all land, one after another', async () => {
  h = storeHome();
  const { achievement } = h.services.achievements.create({ title: 'Start' });
  await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      Promise.resolve().then(() => h.services.achievements.addEvidence(achievement.id, [{ id: ulid(), kind: 'url', url: `https://example.com/${i}` }])),
    ),
  );
  assert.equal(h.store.get('achievement', achievement.id)!.evidence.length, 20);
  assert.equal(h.reopen().get('achievement', achievement.id)!.evidence.length, 20);
});

test('a write edits the file as it is on disk, keeping a hand edit the watcher has not reported yet', () => {
  h = storeHome();
  const p = h.services.projects.create({ name: 'Apollo' });
  const rel = relPathFor('project', p.id);
  h.put(rel, h.read(rel) + 'description: added by hand\n');
  h.services.projects.update(p.id, { status: 'done' });
  assert.match(h.read(rel), /description: added by hand/);
  assert.equal(h.store.get('project', p.id)!.description, 'added by hand');
});

test('If-Match: a stale ETag is a conflict', () => {
  h = storeHome();
  const p = h.services.projects.create({ name: 'Apollo' });
  const etag = h.store.entry('project', p.id)!.etag!;
  h.services.projects.update(p.id, { name: 'B' }, { ifMatch: etag });
  assert.throws(() => h.services.projects.update(p.id, { name: 'C' }, { ifMatch: etag }), ConflictError);
});

test('a write that would make the file invalid is refused before it touches the disk', () => {
  h = storeHome();
  const p = h.services.projects.create({ name: 'Apollo' });
  const before = h.read(relPathFor('project', p.id));
  assert.throws(() => h.store.write('project', p.id, () => ({ patch: { color: 'red' } })), ValidationError);
  assert.equal(h.read(relPathFor('project', p.id)), before);
});

test('remove moves the file into backups/removed/ and restore brings it back; nothing is deleted', () => {
  h = storeHome();
  const { achievement } = h.services.achievements.create({ title: 'Gone soon', body: 'Keep this body' });
  const rel = relPathFor('achievement', achievement.id);
  const { removedTo } = h.services.achievements.remove(achievement.id);
  assert.ok(!h.exists(rel));
  assert.ok(h.exists(removedTo) && removedTo.startsWith('backups/removed/'));
  assert.equal(h.store.get('achievement', achievement.id), undefined);
  const back = h.services.achievements.restore(achievement.id);
  assert.equal(back.body, 'Keep this body\n');
  assert.ok(h.exists(rel) && !h.exists(removedTo));
  // restoring over a file that's back already is refused, and both copies stay
  const again = h.services.achievements.remove(achievement.id).removedTo;
  h.put(rel, h.read(again));
  assert.throws(() => h.services.achievements.restore(achievement.id), ConflictError);
  assert.ok(h.exists(again));
});


test('an achievement moved by hand to another month folder stays indexed; restore finds it wherever it was', async () => {
  h = storeHome();
  const { watchStore } = await import('../server/store/watch.ts');
  const fs = await import('node:fs');
  const { achievement } = h.services.achievements.create({ title: 'Moving' });
  const from = relPathFor('achievement', achievement.id);
  const to = `achievements/2023/09/${achievement.id}.md`;
  const changes: unknown[] = [];
  h.store.subscribe((c) => changes.push(c));
  const w = watchStore(h.store);
  await w.ready;
  fs.mkdirSync(`${h.home}/achievements/2023/09`, { recursive: true });
  fs.renameSync(`${h.home}/${from}`, `${h.home}/${to}`);
  await new Promise((r) => setTimeout(r, 400));
  await w.close();
  assert.equal(h.store.entry('achievement', achievement.id)!.file, to);
  assert.deepEqual(changes, [], 'the same bytes under a new name: nothing to announce');
  h.services.achievements.update(achievement.id, { title: 'Moved' });
  assert.match(h.read(to), /title: Moved/);
  h.services.achievements.remove(achievement.id);
  h.services.achievements.restore(achievement.id);
  assert.ok(h.exists(to));
});

test('removing a sidecar takes its OCR text out of search', async () => {
  h = storeHome();
  const png = Buffer.from('89504e470d0a1a0a0000000d494844520000000100000001080600000000000000', 'hex');
  const img = await h.services.evidence.ingestBytes(png);
  h.services.evidence.setOcr(img.sha256, { engine: 'tesseract', text: 'zebracorn', at: '2026-10-17T09:00:00Z' });
  h.services.achievements.create({ title: 'Shot', evidence: [h.services.evidence.toEvidence(img)] });
  assert.equal(h.store.search('zebracorn').length, 1);
  h.store.remove('evidence', img.sha256);
  assert.equal(h.store.search('zebracorn').length, 0);
});

test('a string that looks like a number to the fast reader is written quoted', () => {
  h = storeHome();
  const { achievement } = h.services.achievements.create({ title: '0b1010', meta: { code: '0x1F' } });
  const back = h.reopen().get('achievement', achievement.id)!;
  assert.equal(back.title, '0b1010');
  assert.deepEqual(back.meta, { code: '0x1F' });
});
