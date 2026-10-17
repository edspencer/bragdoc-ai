// server/guide.ts, AGENT-GUIDE.md and the agent routes: the committed reference matches the schemas, the guide stays
// generic, the snippet, `bragdoc guide`, and /llms.txt, /llms-full.txt, /agent-guide.md with live data. Adapted from
// Hallway's test/guide.test.ts.
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { IMPACT_SCALE } from '../shared/impact.ts';
import { REFERENCE_END, REFERENCE_START, referenceMarkdown, withReference } from '../shared/schema/reference.ts';
import { AGENT_GUIDE, DEFAULT_URL, agentGuide, llmsTxt, readGuide, snippet } from '../server/guide.ts';
import { createApp } from '../server/index.ts';
import { ROOT, tmpHome } from './fixture.ts';
import { storeHome } from './store-fixture.ts';

const cleanups: (() => void)[] = [];
after(() => cleanups.forEach((c) => c()));

describe('AGENT-GUIDE.md', () => {
  test('ships in the package', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.files.includes('AGENT-GUIDE.md'));
    assert.equal(AGENT_GUIDE, path.join(ROOT, 'AGENT-GUIDE.md'));
  });

  test("the committed reference matches the schemas (run `npm run sync:reference` if not)", () => {
    const committed = fs.readFileSync(AGENT_GUIDE, 'utf8');
    assert.equal(committed, withReference(committed), 'AGENT-GUIDE.md is out of date: run `npm run sync:reference`');
    const between = committed.slice(committed.indexOf(REFERENCE_START) + REFERENCE_START.length, committed.indexOf(REFERENCE_END)).trim();
    assert.equal(between, referenceMarkdown());
  });

  test('its impact table is the impact scale', () => {
    const g = readGuide();
    for (const l of IMPACT_SCALE) assert.ok(g.includes(`| ${l.value} ${l.label} | ${l.guidance} |`), `impact ${l.value}`);
  });

  test('it names every MCP tool, the resource and the prompts', async () => {
    const g = readGuide();
    for (const name of ['bragdoc_get_context', 'bragdoc_search_achievements', 'bragdoc_get_achievement', 'bragdoc_add_achievement', 'bragdoc_update_achievement', 'bragdoc_attach_evidence', 'bragdoc_add_found', 'bragdoc_list_projects', 'bragdoc_upsert_project', 'bragdoc_list_repos', 'bragdoc_link_repo', 'bragdoc://context', 'log-this', 'weekly-recap'])
      assert.ok(g.includes(`\`${name}\``), name);
  });

  test('the snippet is the blockquote, unquoted', () => {
    const s = snippet(readGuide());
    assert.match(s, /^When I ask you to note, log or remember something I did at work/);
    assert.match(s, /Run `bragdoc guide` for details\.\n$/);
    assert.doesNotMatch(s, /^>/m);
  });

  test('without a server: no live facts, but the data home', () => {
    const g = agentGuide({ guide: readGuide(), url: DEFAULT_URL, home: '~/.bragdoc-test' });
    assert.match(g, /No live data here/);
    assert.match(g, /`~\/\.bragdoc-test`/);
    assert.doesNotMatch(g, /<!-- live facts -->/);
  });

  test('stays generic: no personal names, machines, private paths or employers', () => {
    for (const text of [readGuide(), llmsTxt({ guide: readGuide(), url: DEFAULT_URL })])
      assert.doesNotMatch(text, /edspencer|valfenda|paddock|hallway|homelab|\/Users\/[a-z]|\/home\/(?!alex\b)[a-z]|\/data\/projects|\b(?:ed|spencer)\b/i);
  });
});

describe('bragdoc guide', () => {
  test('prints the guide (no live facts, the data home from BRAGDOC_HOME), or just the snippet', () => {
    const h = tmpHome();
    cleanups.push(h.cleanup);
    const run = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', path.join(ROOT, 'server', 'cli.ts'), 'guide', ...args], { cwd: ROOT, env: h.env, encoding: 'utf8' });
    const g = run();
    assert.equal(g.status, 0, g.stderr);
    assert.match(g.stdout, /^# BragDoc: a guide for coding agents\n\n\*\*No live data here:\*\*/);
    assert.ok(g.stdout.includes('The data home on this machine is `~/.bragdoc`.'));
    assert.equal(g.stdout, agentGuide({ guide: readGuide(), url: DEFAULT_URL, home: '~/.bragdoc' }));
    const s = run('--snippet');
    assert.equal(s.stdout, snippet(readGuide()));
    assert.equal(fs.existsSync(h.dataDir), false, 'read-only: nothing is created');
    assert.equal(run('--print').status, 2);
  });
});

describe('the agent routes, with live data', () => {
  test('/llms.txt, /llms-full.txt and /agent-guide.md show this server, its data home and its projects', async () => {
    const s = storeHome();
    cleanups.push(s.cleanup);
    s.services.projects.create({ name: 'Importer' });
    s.services.projects.create({ name: 'Old thing', status: 'done' });
    s.services.achievements.create({ title: 'Shipped it' });
    const app = createApp({ dataDir: s.home, store: s.store, webDist: null });
    const get = (p: string) => app.request(p, { headers: { host: 'localhost:5050' } });

    const llms = await get('/llms.txt');
    assert.equal(llms.status, 200);
    assert.match(llms.headers.get('content-type') ?? '', /^text\/plain; charset=utf-8/);
    assert.equal(llms.headers.get('cache-control'), 'no-store');
    const t = await llms.text();
    assert.match(t, /^# BragDoc\n\n> BragDoc \(npm: `@bragdoc\/local`\)/);
    assert.ok(t.includes('Served at http://localhost:5050, version '));
    assert.ok(t.includes(`Data home: \`${s.home}\`. 1 achievement, 0 tracked repos.`));
    assert.match(t, /- `[0-9A-Z]{26}`: Importer/);
    assert.doesNotMatch(t, /Old thing/);
    assert.match(t, /straight onto the board/);
    assert.match(t, /## The rules\n\n- \*\*Call `bragdoc_get_context` first\*\*/);
    assert.ok(!t.includes('localhost:2724'), 'URLs use the port the agent came in on');

    const full = await (await get('/llms-full.txt')).text();
    assert.ok(full.startsWith(t));
    assert.match(full, /## File-format reference/);

    const guide = await get('/agent-guide.md');
    assert.match(guide.headers.get('content-type') ?? '', /^text\/markdown/);
    const g = await guide.text();
    assert.match(g, /^# BragDoc: a guide for coding agents\n\n\*\*This BragDoc, right now:\*\*/);
    assert.match(g, /\| `externalKey` \|/);
    // the Host check applies here too
    assert.equal((await app.request('/llms.txt', { headers: { host: 'evil.example.com' } })).status, 403);
  });
});
