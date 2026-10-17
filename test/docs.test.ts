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
import { ROOT } from './fixture.ts';

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
const released = () => {
  const [major = 0, minor = 0] = VERSION.split('.').map(Number);
  return major > 0 || minor >= 1;
};

describe('docs site', () => {
  test("website/src/site.mjs's DEFAULT_PORT is server/port.ts's", async () => {
    const site = await load('website/src/site.mjs');
    assert.equal(site.DEFAULT_PORT, DEFAULT_PORT);
    assert.equal(site.LOCAL_URL, `http://localhost:${DEFAULT_PORT}`);
    assert.equal(site.PACKAGE, JSON.parse(read('package.json')).name);
  });

  // Pages write the port out (code blocks can't interpolate it), so every localhost/127.0.0.1 port must be the default.
  test(`every localhost:<port> on the site is ${DEFAULT_PORT}`, () => {
    const bad: string[] = [];
    for (const f of prose()) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/(?:localhost|127\.0\.0\.1):(\d+)/g)) {
        if (Number(m[1]) !== DEFAULT_PORT) bad.push(`${path.relative(ROOT, f)}: ${m[0]}`);
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
  test('agents/mcp.md lists exactly the MCP tools the server registers', { skip: !fs.existsSync(path.join(ROOT, 'server', 'mcp')) && 'no server/mcp yet (PR9)' }, () => {
    const registered = new Set(files(path.join(ROOT, 'server', 'mcp'), /\.ts$/).flatMap((f) => [...fs.readFileSync(f, 'utf8').matchAll(/['"`](bragdoc_[a-z_]+)['"`]/g)].map((m) => m[1]!)));
    const documented = new Set([...read('website/src/content/docs/agents/mcp.md').matchAll(/\|\s*`(bragdoc_[a-z_]+)`/g)].map((m) => m[1]!));
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
  });
});
