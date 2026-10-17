// `npm run smoke:pack`: check the npm package as a user gets it. Packs it (prepack builds it), checks what's in the
// tarball, installs it globally into a temp prefix, then runs the installed `bragdoc` from a temp directory with a
// throwaway HOME and BRAGDOC_HOME: --version, --help, a usage error, and the server (on a free port: the startup
// line, the data home it creates, /api/health, the build info /api/meta reports, the web app's index.html and one of
// its scripts, the favicon, a client route, the Host check). Cleans up after itself. Linux and macOS (D14).
//
// Adapted from Hallway's scripts/smoke-pack.mjs. Later PRs extend it: `import --dry-run` (PR12). PR9 added `guide` (the
// shipped AGENT-GUIDE.md, byte for byte), and MCP: initialize + tools/list over HTTP with the token, a 401 without it,
// and the same through the `bragdoc mcp` stdio bridge.
//
// SMOKE_PACK_KEEP=<dir> copies the tarball there before cleaning up (CI uploads it, and the release workflow publishes
// exactly the tarball this checked).
import { execFileSync, spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-smoke-')));
const prefix = path.join(tmp, 'prefix');
const home = path.join(tmp, 'home');
const data = path.join(tmp, 'data');
const work = path.join(tmp, 'work'); // run from somewhere unrelated, so nothing depends on the cwd
for (const d of [prefix, home, data, work]) fs.mkdirSync(d);
// BRAGDOC_HOME is set, so the data home is `data`, not <home>/.bragdoc; it doesn't exist yet, as on a first run
fs.rmdirSync(data);

const step = (s) => console.log(`smoke:pack: ${s}`);
// npm sets npm_execpath when it runs this script: use that npm, with this Node
const npm = (args, opts) => (process.env.npm_execpath ? execFileSync(process.execPath, [process.env.npm_execpath, ...args], opts) : execFileSync('npm', args, opts));
let server;

// the installed bin, run as a user would: a fresh HOME and data home, none of this checkout's environment. XDG_* would
// otherwise point a real ~/.config at the run; PORT/HOST are what a dev shell (or this box) may export.
const env = { ...process.env, HOME: home, BRAGDOC_HOME: data };
for (const k of Object.keys(env)) if (/^(XDG_|BRAGDOC_(?!HOME$)|npm_)/.test(k)) delete env[k];
for (const k of ['PORT', 'HOST', 'NODE_OPTIONS', 'GH_TOKEN', 'GITHUB_TOKEN']) delete env[k];
const bin = path.join(prefix, 'bin', 'bragdoc');
const installed = path.join(prefix, 'lib', 'node_modules', ...pkg.name.split('/'));
const run = (...args) => execFileSync(bin, args, { cwd: work, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
function fails(args, status, pattern) {
  try {
    run(...args);
  } catch (e) {
    assert.equal(e.status, status, `bragdoc ${args.join(' ')}: exit ${e.status}`);
    assert.match(e.stderr, pattern);
    return;
  }
  assert.fail(`bragdoc ${args.join(' ')} should have failed`);
}

async function get(base, p, type) {
  const res = await fetch(base + p);
  assert.equal(res.status, 200, `GET ${p}: ${res.status} ${await res.clone().text()}`);
  assert.match(res.headers.get('content-type') ?? '', type, `GET ${p}: content-type`);
  return res;
}

/** A GET with a chosen Host header (fetch can't set one). */
const statusWithHost = (url, host) =>
  new Promise((resolve, reject) => {
    http.get(url, { headers: { host } }, (res) => (res.resume(), resolve(res.statusCode))).on('error', reject);
  });

/** Every file under `dir`, relative, skipping node_modules (the dependencies are theirs, not ours). */
const ownFiles = (dir) =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)))
    .filter((f) => !f.split(path.sep).includes('node_modules'));

try {
  step('npm pack');
  const out = npm(['pack', '--json', '--pack-destination', tmp], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  // prepack's build output comes first; the JSON starts at a line that is just "["
  const packed = JSON.parse(out.slice(out.search(/^\[$/m))).at(-1);
  const tarball = path.join(tmp, packed.filename);
  const files = packed.files.map((f) => f.path);
  step(`${packed.filename}: ${files.length} files, ${(packed.size / 1024).toFixed(1)} kB packed, ${(packed.unpackedSize / 1024).toFixed(1)} kB unpacked`);
  for (const f of ['package.json', 'LICENSE', 'README.md', 'AGENT-GUIDE.md', 'dist/build-info.json', 'dist/server/cli.js', 'dist/web/index.html', 'dist/web/favicon.svg'])
    assert.ok(files.includes(f), `the package includes ${f}`);
  for (const f of files) {
    assert.ok(!/^(src|server|shared|test|e2e|scripts|website|docs|public|tools|brand|\.github|\.changeset)\//.test(f), `the package shouldn't include ${f}`);
    assert.ok(!f.endsWith('.map'), `the package shouldn't include a source map: ${f}`);
  }
  if (process.env.SMOKE_PACK_KEEP) {
    fs.mkdirSync(process.env.SMOKE_PACK_KEEP, { recursive: true });
    fs.copyFileSync(tarball, path.join(process.env.SMOKE_PACK_KEEP, packed.filename));
  }

  step(`installing ${packed.filename} into a temp prefix`);
  // with the throwaway HOME too, and none of this shell's npm settings: a ~/.npmrc or npm_config_* (include=dev, a
  // registry) could hide a missing dependency or slip a devDependency in. The cache stays in the temp dir.
  npm(['install', '--global', '--prefix', prefix, '--no-audit', '--no-fund', tarball], {
    env: { ...env, NODE_ENV: 'production', npm_config_cache: path.join(tmp, 'npm-cache') },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const deps = fs.existsSync(path.join(installed, 'node_modules')) ? fs.readdirSync(path.join(installed, 'node_modules')) : [];
  for (const dev of Object.keys(pkg.devDependencies)) {
    const top = dev.startsWith('@') ? dev.split('/')[0] : dev;
    // a scope can hold runtime dependencies too (@hono/node-server), so for a scoped name check the package itself
    const there = dev.startsWith('@') ? fs.existsSync(path.join(installed, 'node_modules', dev)) : deps.includes(top);
    assert.ok(!there, `${dev} is a build-time dependency; it shouldn't be installed`);
  }

  step('no source maps, and no comment pointing at one');
  for (const f of ownFiles(installed)) {
    assert.ok(!f.endsWith('.map'), `installed a source map: ${f}`);
    if (/\.(js|mjs|cjs|css|d\.ts)$/.test(f)) assert.doesNotMatch(fs.readFileSync(path.join(installed, f), 'utf8'), /^[ \t]*(\/\/|\/\*)[#@] sourceMappingURL=/m, f);
  }

  step('build info');
  const info = JSON.parse(fs.readFileSync(path.join(installed, 'dist', 'build-info.json'), 'utf8'));
  assert.equal(info.version, pkg.version);
  assert.equal(info.name, pkg.name);
  assert.ok(!Number.isNaN(Date.parse(info.builtAt)), `builtAt is a date: ${info.builtAt}`);
  // only the release workflow's build may say it's official
  if (process.env.BRAGDOC_OFFICIAL_BUILD !== '1') assert.equal(info.official, false, 'a build outside the release workflow is unofficial');
  else assert.equal(info.official, true, "the release workflow's build is official");

  step('--version, --help, usage errors');
  assert.equal(run('--version').trim(), pkg.version);
  assert.match(run('--help'), /^Usage: bragdoc \[command\]/);
  fails(['frobnicate'], 2, /unknown command 'frobnicate'/);
  fails(['--port', 'nope'], 2, /--port must be a port number/);

  step('guide');
  {
    // the shipped AGENT-GUIDE.md around the live-facts marker, byte for byte (its reference is already generated)
    const [head, tail] = fs.readFileSync(path.join(installed, 'AGENT-GUIDE.md'), 'utf8').split('<!-- live facts -->');
    const out = run('guide');
    assert.ok(out.startsWith(head) && out.endsWith(tail.trimEnd() + '\n'), 'bragdoc guide prints AGENT-GUIDE.md');
    assert.match(out, /\*\*No live data here:\*\*/);
    assert.match(out, /\| `externalKey` \|/, 'with the file-format reference');
    assert.match(run('guide', '--snippet'), /^When I ask you to note, log or remember something I did at work/);
  }

  // OCR (PR11, D47): the installed package reads a screenshot with what it ships (tesseract.js, its wasm, the English
  // data), with the network gone: a preload, which worker threads inherit, makes every fetch, socket and DNS lookup
  // throw. A package that tried to download its language data would fail here.
  step('dev ocr, with no network');
  const noNet = path.join(tmp, 'no-network.mjs');
  fs.writeFileSync(
    noNet,
    `import net from 'node:net'; import dns from 'node:dns'; import http from 'node:http'; import https from 'node:https';
const no = (what) => () => { throw new Error('smoke:pack: no network (' + what + ')'); };
globalThis.fetch = no('fetch'); net.Socket.prototype.connect = no('socket'); net.connect = net.createConnection = no('net.connect');
dns.lookup = no('dns'); http.request = http.get = no('http'); https.request = https.get = no('https');\n`,
  );
  const fixture = path.join(root, 'test', 'fixtures', 'screenshots', 'praise.png');
  const ocrOut = execFileSync(process.execPath, ['--import', noNet, bin, 'dev', 'ocr', fixture, '--engine', 'tesseract', '--name', 'Alex Marlowe', '--json'], { cwd: work, env, encoding: 'utf8' });
  const [ocrResult] = JSON.parse(ocrOut);
  assert.equal(ocrResult.engine, 'tesseract', ocrOut);
  assert.match(ocrResult.text, /@Alex Marlowe ran the dual-write plan beautifully/, ocrOut);
  assert.equal(ocrResult.rules.pass, true, ocrOut);
  assert.deepEqual(fs.readdirSync(work), [], 'dev ocr wrote nothing into the current directory (tesseract.js caches there by default)');

  step('serve');
  server = spawn(bin, ['--port', '0'], { cwd: work, env, stdio: ['ignore', 'pipe', 'inherit'] });
  let printed = '';
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`the server didn't start: ${printed}`)), 30000);
    server.stdout.on('data', (d) => {
      printed += d;
      // "BragDoc on <url>" is the first line on stdout, always (banner.ts)
      const m = printed.match(/^BragDoc on (http:\/\/localhost:\d+)\nData home: .*\n/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    });
    server.on('exit', (code) => reject(new Error(`the server exited (${code}): ${printed}`)));
  });
  step(`serving on ${base}`);
  assert.ok(printed.includes(`Data home: ${data}`), `the data home: ${printed}`);
  for (const f of ['config.yaml', '.gitignore', 'runtime.json']) assert.ok(fs.existsSync(path.join(data, f)), `the data home has ${f}`);

  assert.deepEqual(await (await get(base, '/api/health', /json/)).json(), { ok: true, version: pkg.version });
  const meta = await (await get(base, '/api/meta', /json/)).json();
  assert.equal(meta.version, pkg.version);
  assert.deepEqual(meta.build, info, '/api/meta reports dist/build-info.json');
  const html = await (await get(base, '/', /html/)).text();
  assert.equal(html, fs.readFileSync(path.join(installed, 'dist', 'web', 'index.html'), 'utf8'));
  const asset = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  assert.ok(asset, 'index.html loads a script from /assets/');
  await get(base, asset, /javascript/);
  await get(base, '/favicon.svg', /^image\/svg\+xml/);
  await get(base, '/some/client/route', /html/);
  assert.equal(await statusWithHost(`${base}/api/health`, 'evil.example'), 403, 'a foreign Host is refused');

  step('MCP over HTTP: initialize, tools/list; no token is a 401');
  const token = JSON.parse(fs.readFileSync(path.join(data, 'runtime.json'), 'utf8')).mcpToken;
  const rpc = (body, headers = {}) =>
    fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-11-25', authorization: `Bearer ${token}`, ...headers },
      body: JSON.stringify(body),
    });
  /** A JSON-RPC result from a JSON or an SSE response. */
  const result = async (res) => {
    assert.equal(res.status, 200, `/mcp: ${res.status} ${await res.clone().text()}`);
    const text = await res.text();
    const json = (res.headers.get('content-type') ?? '').includes('text/event-stream') ? text.match(/^data: (.*)$/m)?.[1] : text;
    return JSON.parse(json).result;
  };
  const init = await result(await rpc({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } } }));
  assert.equal(init.serverInfo.name, 'bragdoc');
  assert.equal(init.serverInfo.version, pkg.version);
  const listed = (await result(await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }))).tools.map((t) => t.name);
  assert.ok(listed.includes('bragdoc_get_context') && listed.includes('bragdoc_add_achievement'), `tools/list: ${listed}`);
  assert.equal((await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, { authorization: '' })).status, 401);

  step('MCP through the stdio bridge (bragdoc mcp)');
  const bridged = execFileSync(bin, ['mcp'], {
    cwd: work,
    env,
    encoding: 'utf8',
    input: [{ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } } }, { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }]
      .map((m) => JSON.stringify(m))
      .join('\n') + '\n',
  })
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));
  assert.ok(bridged.find((m) => m.id === 1)?.result.tools.some((t) => t.name === 'bragdoc_get_context'), `bragdoc mcp: ${JSON.stringify(bridged).slice(0, 300)}`);

  server.kill();
  await new Promise((r) => server.once('exit', r));
  server = null;
  step('bragdoc mcp with BragDoc stopped: exit 1, and says so');
  fails(['mcp'], 1, /BragDoc isn't running: run `bragdoc` or `bragdoc service install`/);

  step('ok');
} finally {
  server?.kill();
  fs.rmSync(tmp, { recursive: true, force: true });
}
