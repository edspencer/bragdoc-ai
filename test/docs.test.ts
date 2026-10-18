// The docs site (website/, a separate package) keeps copies of facts from the app, because Cloudflare builds it with
// website/ as its root and it can't import from ../server. These tests keep the copies in step (local-review's
// test/docs.test.ts), and hold the site to its own rules: every page in the sidebar, no page that still says
// "Coming in v0.1" once v0.1 is out.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_PORT } from '../server/port.ts';
import { withReference } from '../shared/schema/reference.ts';
import { aiReferenceBlocks, withAiReference } from '../scripts/ai-reference.ts';
import { PRESET_PORTS } from '../tools/docs-media/leaks.ts';
import { ROOT } from './fixture.ts';
import { SHOTS } from '../tools/docs-media/shots.ts';
import { referencedShots } from '../tools/docs-media/sync.ts';

const WEBSITE = path.join(ROOT, 'website');
const DOCS = path.join(WEBSITE, 'src', 'content', 'docs');
const BLOG = path.join(WEBSITE, 'src', 'content', 'blog');
// Plain .mjs files without types: imported by URL, so they type as `any`.
const load = (rel: string): Promise<any> => import(pathToFileURL(path.join(ROOT, rel)).href);
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function files(dir: string, ext: RegExp): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p, ext) : ext.test(e.name) ? [p] : [];
  });
}

/** Every page of prose the site renders: the docs, the blog, and the landing page's copy. */
const prose = () => [...files(DOCS, /\.mdx?$/), ...files(BLOG, /\.md$/), path.join(WEBSITE, 'src', 'components', 'landing', 'copy.ts')];

/** Everything in the repo that could read an env var: the server, shared code, scripts, tools and the build config. */
const envSources = () => [
  ...files(path.join(ROOT, 'server'), /\.ts$/),
  ...files(path.join(ROOT, 'shared'), /\.ts$/),
  ...files(path.join(ROOT, 'scripts'), /\.(ts|mjs|sh)$/),
  ...files(path.join(ROOT, 'tools'), /\.(ts|mjs|sh)$/),
  ...['vite.config.ts', 'playwright.config.ts'].map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f)),
];

const VERSION: string = JSON.parse(read('package.json')).version;
// the release script's own test of "is this a release", so the two can't drift
const { isReleased, STALE_PROSE } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'whats-new-release.mjs')).href);
const released = (): boolean => isReleased(VERSION);

describe('docs site', () => {
  test("website/src/site.mjs's DEFAULT_PORT is server/port.ts's", async () => {
    const site = await load('website/src/site.mjs');
    assert.equal(site.DEFAULT_PORT, DEFAULT_PORT);
    assert.equal(site.LOCAL_URL, `http://localhost:${DEFAULT_PORT}`);
    assert.equal(site.PACKAGE, JSON.parse(read('package.json')).name);
  });

  // Pages write the port out (code blocks can't interpolate it), so every localhost/127.0.0.1 port must be the default,
  // or a local model runner's preset address (Ollama 11434, LM Studio 1234, llama.cpp 8080: shared/ai/connections.ts).
  test(`every localhost:<port> on the site is ${DEFAULT_PORT}, or a model runner's preset`, () => {
    const bad: string[] = [];
    for (const f of prose()) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/(?:localhost|127\.0\.0\.1):(\d+)/g)) {
        if (!PRESET_PORTS.includes(m[1]!)) bad.push(`${path.relative(ROOT, f)}: ${m[0]}`);
      }
    }
    assert.deepEqual(bad, []);
  });

  test('every docs page is in the sidebar (website/src/sidebar.mjs), and every entry has a page', async () => {
    const { SIDEBAR } = await load('website/src/sidebar.mjs');
    const slugs: string[] = SIDEBAR.flatMap((g: any) => (g.items ?? [g]).map((i: any) => i.slug));
    assert.equal(new Set(slugs).size, slugs.length, 'a page is in the sidebar twice');
    // 404.md is Starlight's not-found page, never in the sidebar
    const pages = files(DOCS, /\.mdx?$/).map((f) => path.relative(DOCS, f).replace(/\.mdx?$/, '').split(path.sep).join('/')).filter((p) => p !== '404');
    assert.deepEqual(pages.filter((p) => !slugs.includes(p)).sort(), [], 'pages missing from the sidebar');
    assert.deepEqual(slugs.filter((s) => !pages.includes(s)).sort(), [], 'sidebar entries without a page');
  });

  test('every page has a title and a real description (llms.txt and search use them)', () => {
    for (const f of [...files(DOCS, /\.mdx?$/), ...files(BLOG, /\.md$/)]) {
      const front = /^---\n([\s\S]*?)\n---/.exec(fs.readFileSync(f, 'utf8'))?.[1] ?? '';
      const rel = path.relative(ROOT, f);
      assert.match(front, /^title: .+/m, `${rel}: no title`);
      const description = /^description: (.+)/m.exec(front)?.[1] ?? '';
      assert.ok(description.length >= 30, `${rel}: no real description`);
      assert.doesNotMatch(description, /\b(stub|todo|tbd)\b/i, `${rel}: placeholder description`);
    }
  });

  test('the data-folder page\'s reference tables match the schemas (npm run sync:reference)', () => {
    const page = read('website/src/content/docs/reference/data-folder.md');
    assert.equal(withReference(page), page, 'website/src/content/docs/reference/data-folder.md is stale: npm run sync:reference');
  });

  // The AI pages' tables (the recommended models, what the judge measured, each provider's consent statement) are
  // generated from the code the app runs on (scripts/ai-reference.ts, D83), so the docs and the consent dialog can't
  // disagree.
  test("the AI pages' generated tables match the code (npm run sync:reference)", () => {
    const pages = files(DOCS, /\.mdx?$/).filter((f) => aiReferenceBlocks(fs.readFileSync(f, 'utf8')).length);
    const blocks = pages.flatMap((f) => aiReferenceBlocks(fs.readFileSync(f, 'utf8')));
    for (const want of ['models', 'measured', 'consent-anthropic', 'consent-openai', 'consent-openrouter', 'consent-jev', 'consent-custom'])
      assert.ok(blocks.includes(want), `no docs page has the ai-reference block ${want}`);
    for (const f of pages) {
      const page = fs.readFileSync(f, 'utf8');
      assert.equal(withAiReference(page), page, `${path.relative(ROOT, f)} is stale: npm run sync:reference`);
    }
  });

  // Every BRAGDOC_* variable the code reads is documented. A few are for the project's own tests and CI, not users.
  test('every BRAGDOC_* environment variable is in reference/environment.md', () => {
    // The project's own test and capture plumbing, never set by someone running BragDoc
    const INTERNAL = new Set([
      'BRAGDOC_REAL_SERVICES', // CI's switch for the real launchd/systemd test (scripts/services-real.mjs)
      'BRAGDOC_E2E_FIREFOX', // playwright.config.ts: add the Firefox project
      'BRAGDOC_E2E_HOME', // playwright.config.ts: the e2e server's throwaway home
      'BRAGDOC_E2E_PORT', // playwright.config.ts: the e2e server's port
      'BRAGDOC_LEAK_EXTRA', // tools/docs-media: extra strings the capture rig's leak scan refuses
      'BRAGDOC_OFFICIAL_BUILD', // release.yml only: marks build-info.json official (D36)
      'BRAGDOC_BUILD_RUN_URL', // release.yml only: the run, passed into the Docker build (D36)
      'BRAGDOC_LIVE_AI', // scripts/eval/: the live evals' opt-in to calling a real model (never in CI; D68)
      'BRAGDOC_POWER_SUPPLY_DIR', // server/platform/power.ts: a stand-in for /sys/class/power_supply, for tests and QA (D75)
    ]);
    const used = new Set(envSources().flatMap((f) => [...fs.readFileSync(f, 'utf8').matchAll(/\bBRAGDOC_[A-Z][A-Z0-9_]*\b/g)].map((m) => m[0])));
    const page = read('website/src/content/docs/reference/environment.md');
    const missing = [...used].filter((v) => !INTERNAL.has(v) && !page.includes(`\`${v}\``)).sort();
    assert.deepEqual(missing, [], 'add these to website/src/content/docs/reference/environment.md');
    for (const v of ['PORT', 'BRAGDOC_HOME', 'BRAGDOC_DANGEROUSLY_ALLOW_OPEN']) assert.ok(page.includes(`\`${v}\``), `${v} isn't documented`);
  });

  // Every command the CLI dispatches has a section in the CLI reference, and every flag `serve` accepts is listed.
  test('reference/cli.md covers every bragdoc command and serve flag', () => {
    const page = read('website/src/content/docs/reference/cli.md');
    const cli = read('server/cli.ts');
    const commands = ['serve'];
    const index = path.join(ROOT, 'server', 'commands', 'index.ts');
    if (fs.existsSync(index)) {
      const block = /COMMANDS[^=]*=\s*\{([\s\S]*?)\}/.exec(fs.readFileSync(index, 'utf8'))?.[1] ?? '';
      commands.push(...[...block.matchAll(/^\s*'?([a-z][a-z-]*)'?\s*[,:]/gm)].map((m) => m[1]!));
      assert.ok(commands.length > 1, "couldn't read COMMANDS from server/commands/index.ts: has its shape changed?");
    }
    for (const c of commands) assert.match(page, new RegExp(`^## \`bragdoc ${c}\\b`, 'm'), `reference/cli.md has no "## \`bragdoc ${c}\`" section`);
    const serveFlags = /check\(cmd, flags, \[([^\]]*)\]/.exec(cli)?.[1] ?? '';
    const flags = [...serveFlags.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]!);
    assert.ok(flags.includes('port'), "couldn't find serve's flags in server/cli.ts");
    for (const f of flags) assert.ok(page.includes(`\`--${f}`), `reference/cli.md doesn't list serve's --${f}`);
  });

  // Screenshots come from the capture rig (tools/docs-media), so they can be re-shot in one command and are
  // leak-scanned: every one the site uses must be a shot in shots.ts, and committed (local-review's cross-check).
  test('every screenshot the site uses is a shot in tools/docs-media/shots.ts, and is committed', () => {
    const names = new Set(SHOTS.map((s) => s.name));
    const refs = referencedShots();
    assert.ok(refs.some((r) => r.dir === 'landing'), 'the landing page has no real capture');
    for (const r of refs) {
      assert.ok(names.has(r.name), `${r.from}: ${r.name} isn't a shot in shots.ts`);
      assert.ok(fs.existsSync(path.join(WEBSITE, 'src', 'assets', r.dir, `${r.name}.png`)), `${r.from}: website/src/assets/${r.dir}/${r.name}.png is missing (npm run docs:media:sync)`);
    }
    // nothing still pretends to be a mock-up
    assert.deepEqual(prose().filter((f) => /Mock-up/i.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f)), []);
  });

  // Every route the server registers is on the HTTP API page, as `METHOD /path` (a template like
  // `/api/achievements/:id/${action}` is expanded from the list it loops over).
  test('reference/http-api.md lists every HTTP route the server registers', () => {
    const page = read('website/src/content/docs/reference/http-api.md');
    const routes: string[] = [];
    for (const f of files(path.join(ROOT, 'server', 'routes'), /\.ts$/)) {
      const src = fs.readFileSync(f, 'utf8').replace(/^\s*(?:\/\/|\*).*$/gm, ''); // not the examples in comments
      for (const m of src.matchAll(/\bapp\.(get|post|put|patch|delete|all)\((['`])([^'`]+)\2/g)) {
        const method = m[1] === 'all' ? 'POST' : m[1]!.toUpperCase();
        const p = m[3]!;
        if (!p.includes('${')) routes.push(`${method} ${p}`);
        else {
          // the only templated route: archive / unarchive, from `for (const [action, archived] of [['archive', …], …])`
          const actions = [...(/for \(const \[action[^\]]*\] of \[([\s\S]*?)\] as const\)/.exec(src)?.[1] ?? '').matchAll(/\['([a-z]+)'/g)].map((a) => a[1]!);
          assert.ok(actions.length, `${path.relative(ROOT, f)}: can't expand ${p}`);
          for (const a of actions) routes.push(`${method} ${p.replace(/\$\{action\}/, a)}`);
        }
      }
    }
    assert.ok(routes.length > 60, `only found ${routes.length} routes: has registerRoutes' shape changed?`);
    const missing = routes.filter((r) => !page.includes(`\`${r}\``)).sort();
    assert.deepEqual(missing, [], 'add these to website/src/content/docs/reference/http-api.md');
  });

  // website/scripts/check-external.mjs is the CI enforcement of "the docs load nothing from elsewhere", so its parser
  // is pinned here: each of these must be caught, and none of the harmless ones flagged.
  test('check-external catches every kind of third-party load, and nothing harmless', async () => {
    const { fetchedUrls, isExternal } = await load('website/scripts/check-external.mjs');
    const ext = (file: string, text: string): string[] => fetchedUrls(file, text).filter(isExternal);
    const caught: [string, string][] = [
      ['a.html', '<img src="https://x.example/a.png">'],
      ['a.html', "<img src='https://x.example/a.png'>"],
      ['a.html', '<img src=https://x.example/a.png>'],
      ['a.html', '<img src="/local.png" srcset="/l.png 1x, https://x.example/a.png 2x">'],
      ['a.html', '<video poster="https://x.example/p.jpg"></video>'],
      ['a.html', '<svg><image href="https://x.example/i.png"/></svg>'],
      ['a.html', '<svg><use xlink:href="//x.example/s.svg#i"/></svg>'],
      ['a.html', '<script type="module" src="//cdn.example/a.js"></script>'],
      ['a.html', '<script>fetch("https://x.example/t")</script>'],
      ['a.html', '<script type="module">import "https://x.example/m.js"</script>'],
      ['a.html', '<link rel="stylesheet" href="https://fonts.example/css">'],
      ['a.html', '<link rel="preconnect" href="https://fonts.example">'],
      ['a.html', '<style>@font-face{src:url(https://x.example/f.woff2)}</style>'],
      ['a.html', '<div style="background:url(\'https://x.example/b.png\')"></div>'],
      ['a.html', '<iframe src="https://x.example/embed"></iframe>'],
      ['a.css', '@import "https://x.example/x.css";'],
      ['a.js', 'import x from "https://x.example/m.js";'],
      ['a.js', 'navigator.sendBeacon("https://x.example/b", d)'],
      ['a.svg', '<svg><image href="https://x.example/i.png"/></svg>'],
    ];
    for (const [file, text] of caught) assert.ok(ext(file, text).length > 0, `missed: ${text}`);
    const harmless: [string, string][] = [
      ['a.html', '<a href="https://github.com/x">GitHub</a>'],
      ['a.html', '<link rel="canonical" href="https://bragdoc.ai/"><link rel="alternate" href="https://bragdoc.ai/x.md">'],
      ['a.html', '<meta property="og:image" content="https://bragdoc.ai/og-image.png">'],
      ['a.html', '<img src="/_astro/a.webp" srcset="/_astro/a.webp 1x, /_astro/b.webp 2x">'],
      ['a.html', '<img src="data:image/png;base64,AAAA">'],
      ['a.html', '<script>const docs = "https://github.com/x"; location.href = docs;</script>'],
    ];
    for (const [file, text] of harmless) assert.deepEqual(ext(file, text), [], `flagged: ${text}`);
  });

  // Once the MCP server exists (PR9), the tools it registers and the tools the MCP page lists must be the same set.
  test('agents/mcp.mdx lists exactly the MCP tools the server registers', { skip: !fs.existsSync(path.join(ROOT, 'server', 'mcp')) && 'no server/mcp yet (PR9)' }, () => {
    const registered = new Set(files(path.join(ROOT, 'server', 'mcp'), /\.ts$/).flatMap((f) => [...fs.readFileSync(f, 'utf8').matchAll(/['"`](bragdoc_[a-z_]+)['"`]/g)].map((m) => m[1]!)));
    const documented = new Set([...read('website/src/content/docs/agents/mcp.mdx').matchAll(/\|\s*`(bragdoc_[a-z_]+)`/g)].map((m) => m[1]!));
    assert.deepEqual([...registered].sort(), [...documented].sort());
  });

  // The brand assets are copies of the repo's brand kit (website/scripts/sync-brand.mjs), committed because
  // Cloudflare builds from website/. Until brand/ exists on this branch (PR4), there is nothing to compare.
  test('the site\'s brand assets are the brand kit\'s (cd website && npm run sync-brand)', { skip: !fs.existsSync(path.join(ROOT, 'brand')) && 'no brand/ yet (PR4)' }, async () => {
    const { BRAND_COPIES } = await load('website/scripts/sync-brand.mjs');
    for (const [from, to] of Object.entries(BRAND_COPIES as Record<string, string>)) {
      assert.ok(fs.readFileSync(path.join(ROOT, 'brand', from)).equals(fs.readFileSync(path.join(WEBSITE, to))), `website/${to} differs from brand/${from}: npm run sync-brand`);
    }
  });

  // Before the first release, pages say "Coming in v0.1" where a feature isn't built, and the site says it isn't on
  // npm. Once package.json is 0.1.0 or later, neither may remain.
  test(`the site's "not released" notes match package.json (${VERSION})`, async () => {
    const site = await load('website/src/site.mjs');
    assert.equal(site.RELEASED, released(), `RELEASED in website/src/site.mjs should be ${released()} for version ${VERSION}`);
    if (!released()) return;
    const left = prose().filter((f) => /Coming in v0\.1\b/.test(fs.readFileSync(f, 'utf8')));
    assert.deepEqual(left.map((f) => path.relative(ROOT, f)), [], 'v0.1 is out: these pages still say "Coming in v0.1"');
    // the AI pages' `:::note[Coming in 0.2.0]` (D83), once 0.2.0 or later is out (What's new has its own release step)
    const [major = 0, minor = 0] = VERSION.split('.').map(Number);
    if (major > 0 || minor >= 2) {
      const ai = prose().filter((f) => path.basename(f) !== 'whats-new.md' && /Coming in 0\.2\.0/.test(fs.readFileSync(f, 'utf8')));
      assert.deepEqual(ai.map((f) => path.relative(ROOT, f)), [], `${VERSION} is out: these pages still say "Coming in 0.2.0"`);
    }
    // the components follow RELEASED by themselves, and scripts/whats-new-release.mjs takes the pages' `:::note[Not …]`
    // asides out (PR17); anything else saying "not on npm yet" would still say it. What's new is released by the same
    // script, a blog post is dated (it may say what was true that day), and the README and SECURITY.md ship on npm.
    const pages = [...files(DOCS, /\.mdx?$/).filter((f) => path.basename(f) !== 'whats-new.md'), path.join(ROOT, 'README.md'), path.join(ROOT, 'SECURITY.md')];
    const stale = pages.filter((f) => STALE_PROSE.test(fs.readFileSync(f, 'utf8')));
    assert.deepEqual(stale.map((f) => path.relative(ROOT, f)), [], `${VERSION} is out: these pages still say it isn't on npm or released`);
  });
});
