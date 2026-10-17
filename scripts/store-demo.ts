// `npm run store:demo`: the file store end to end, on a throwaway data home under the OS temp dir (never ~/.bragdoc).
// Seeds a few synthetic files through the services, prints the index stats, then edits and breaks a file behind the
// store's back and shows what the watcher reports. `--keep` leaves the data home behind to look at.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServices } from '../server/services/index.ts';
import { relPathFor } from '../server/store/files.ts';
import { openStore } from '../server/store/index.ts';
import { watchStore } from '../server/store/watch.ts';

const home = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-demo-')), '.bragdoc');
const keep = process.argv.includes('--keep');
const say = (s: string) => console.log(s);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const store = openStore(home);
const s = createServices(store);
say(`data home: ${home}`);

s.profile.set({ name: 'Alex Marlowe', role: 'Staff Engineer', aliases: ['AM'] });
const co = s.companies.create({ name: 'Cyberdyne' });
const { repo } = s.repos.create({ remoteUrl: 'https://github.com/example/rocket' });
const p = s.projects.create({ name: 'Apollo', companyId: co.id, repoIds: [repo.id], start: '2026-01-05' });
const { achievement } = s.achievements.create({ title: 'Cut CI time from 20 minutes to 8', impact: 5, projects: [p.id], body: 'Split the suite across four runners.' });
s.achievements.create({ title: 'Mentored two new engineers', happenedAt: '2026-09-02', projects: [p.id] });
s.found.add({ source: 'github', externalKey: 'github_pr:example/rocket#42', title: 'Add a retry to the deploy step', evidence: [{ kind: 'github_pr', url: 'https://github.com/example/rocket/pull/42', externalKey: 'github_pr:example/rocket#42' }] });

say(`\nindex: ${JSON.stringify(store.stats())}`);
say(`search "runners": ${s.achievements.search('runners').items.map((a) => a.title).join(', ')}`);

store.subscribe((c) => say(`  event: ${JSON.stringify(c)}`));
const w = watchStore(store);
await w.ready;

const rel = relPathFor('achievement', achievement.id);
const file = path.join(home, rel);
say(`\n1. editing ${rel} by hand (the title)`);
fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('title: Cut CI time from 20 minutes to 8', 'title: Cut CI time from 20 minutes to 6'));
await wait(300);
say(`   the index now says: "${store.get('achievement', achievement.id)!.title}"`);

say('\n2. a write through the services (exactly one event, no echo from the watcher)');
s.achievements.update(achievement.id, { impact: 6 });
await wait(300);

say(`\n3. breaking ${rel} (invalid YAML)`);
fs.writeFileSync(file, '---\ntitle: [oops\n---\n');
await wait(300);
for (const pr of store.problems()) say(`   problem: ${pr.file}${pr.line ? `:${pr.line}` : ''} ${pr.message}`);
say(`   still serving its last good copy: "${store.get('achievement', achievement.id)!.title}"`);

await w.close();
if (keep) say(`\nleft the data home at ${home}`);
else fs.rmSync(path.dirname(home), { recursive: true, force: true });
