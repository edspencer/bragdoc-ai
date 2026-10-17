// A static guard (SPEC R4, D9): no code in server/ or shared/ may open a network connection or start a process, except
// server/egress.ts (the one real fetch) and server/proc.ts (the one child_process import). If this fails, you've added
// a way for BragDoc to talk to the network, or to run something, behind the user's back: send the request through
// ctx.egress.egressFetch(), or the command through proc.run(). Never widen ALLOWED to make this pass without the
// review that a new way out deserves. The technique and the exact-count allow-list are Local Review's fsguard.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './fixture.ts';

const SCANNED = ['server', 'shared'].map((d) => path.join(ROOT, d));

/** Network and process modules, as an import specifier, a require() or a dynamic import() names them. */
const BANNED_MODULES = [
  'http',
  'https',
  'http2',
  'net',
  'tls',
  'dgram',
  'dns',
  'child_process',
  'cluster',
  'undici',
  'node-fetch',
  'cross-fetch',
  'axios',
  'got',
  'ky',
  'ws',
  'eventsource',
  'socket.io-client',
];

/**
 * Each rule scans either the code with its quoted strings blanked out (`code`: so a log field `'fetch'` or a header
 * name `'sec-fetch-site'` isn't a hit), or the code as written (`all`: module names are strings).
 */
const RULES: Record<string, { on: 'code' | 'all'; re: RegExp }> = {
  // the global fetch, called or passed around: `fetch(`, `globalThis.fetch`, `x = fetch`; not a method or key named
  // fetch (`app.fetch`, `{ fetch: … }`) or an identifier that merely contains it (`egressFetch`)
  fetch: { on: 'code', re: /(?<![\w$.])fetch\b(?!\s*:)|\b(?:globalThis|global|window|self)\s*\.\s*fetch\b/g },
  fetchByName: { on: 'all', re: /\[\s*['"`]fetch['"`]\s*\]/g },
  // `node:http`, 'https', "undici", … anywhere as a whole string literal (import, export from, require, import())
  networkModule: {
    on: 'all',
    re: new RegExp(`['"\`](?:node:)?(?:${BANNED_MODULES.filter((m) => !['child_process', 'cluster'].includes(m)).map((m) => m.replace(/[.]/g, '\\.')).join('|')})(?:/[\\w/.-]*)?['"\`]`, 'g'),
  },
  childProcess: { on: 'all', re: /['"`](?:node:)?(?:child_process|cluster)['"`]/g },
  // browser-style sockets and streams, which Node also has as globals
  socket: { on: 'code', re: /\b(?:WebSocket|EventSource|XMLHttpRequest|WebTransport)\b/g },
  // reaching node's internals for a module the rules above would catch by name
  internals: { on: 'code', re: /\bprocess\s*\.\s*(?:binding|_linkedBinding|dlopen)\b|\bcreateRequire\b|\bmodule\s*\.\s*require\b/g },
};

/** Exact counts per file (relative to the repo). Anything not listed must be zero. */
const ALLOWED: Record<string, Record<string, number>> = {
  'server/egress.ts': {
    fetch: 1, // the default implementation: (url, init) => globalThis.fetch(url, init)
  },
  'server/proc.ts': {
    childProcess: 1, // import { execFile, spawn } from 'node:child_process'
  },
};

function files(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : /\.(?:[cm]?[jt]sx?)$/.test(e.name) ? [p] : [];
  });
}

/** Comments out: a comment may mention fetch( freely. */
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
/** '…' and "…" blanked (template literals stay: a `${fetch(u)}` inside one must still be seen). */
const stripStrings = (s: string) => s.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");

function hits(source: string): Record<string, number> {
  const all = stripComments(source);
  const code = stripStrings(all);
  return Object.fromEntries(Object.entries(RULES).map(([k, { on, re }]) => [k, (on === 'code' ? code : all).match(re)?.length ?? 0]));
}

test('no code in server/ or shared/ reaches the network or starts a process outside egress.ts and proc.ts', () => {
  const all = SCANNED.flatMap(files);
  assert.ok(all.some((f) => f.endsWith(path.join('server', 'egress.ts'))), 'scanning the right directories');
  assert.ok(all.some((f) => f.endsWith(path.join('shared', 'api.ts'))));
  const problems: string[] = [];
  for (const f of all) {
    const rel = path.relative(ROOT, f).split(path.sep).join('/');
    for (const [rule, n] of Object.entries(hits(fs.readFileSync(f, 'utf8')))) {
      const allowed = ALLOWED[rel]?.[rule] ?? 0;
      if (n !== allowed) problems.push(`${rel}: ${n} × ${rule} (allowed ${allowed})`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the guard catches the patterns it is meant to (a planted sample fails it)', () => {
  const caught = (code: string) =>
    Object.entries(hits(code))
      .filter(([, n]) => n > 0)
      .map(([k]) => k);
  // planted: each of these, in a file outside the allow-list, would fail the test above
  assert.deepEqual(caught("await fetch('https://telemetry.example.com')"), ['fetch']);
  assert.deepEqual(caught('globalThis.fetch(url)'), ['fetch']);
  assert.deepEqual(caught("globalThis['fetch'](url)"), ['fetchByName']);
  assert.deepEqual(caught('const u = `${fetch(x)}`'), ['fetch']);
  assert.deepEqual(caught('const f = fetch; f(url)'), ['fetch']);
  assert.deepEqual(caught("import http from 'node:http'"), ['networkModule']);
  assert.deepEqual(caught("import { request } from 'https'"), ['networkModule']);
  assert.deepEqual(caught("const net = await import('node:net')"), ['networkModule']);
  assert.deepEqual(caught("import tls from 'node:tls'"), ['networkModule']);
  assert.deepEqual(caught("import dgram from 'node:dgram'"), ['networkModule']);
  assert.deepEqual(caught("import { lookup } from 'node:dns/promises'"), ['networkModule']);
  assert.deepEqual(caught("import { request } from 'undici'"), ['networkModule']);
  assert.deepEqual(caught("export { fetch as f } from 'node-fetch'"), ['fetch', 'networkModule']);
  assert.deepEqual(caught("const cp = require('child_process')"), ['childProcess']);
  assert.deepEqual(caught("import { spawn } from 'node:child_process'"), ['childProcess']);
  assert.deepEqual(caught("new WebSocket('ws://x')"), ['socket']);
  assert.deepEqual(caught("new EventSource('/x')"), ['socket']);
  assert.deepEqual(caught("process.binding('tcp_wrap')"), ['internals']);
  assert.deepEqual(caught("createRequire(import.meta.url)('http')"), ['networkModule', 'internals']);
  // not caught: mentions in comments, methods and keys named fetch, identifiers containing it, unrelated strings
  assert.deepEqual(
    caught(
      "// fetch('https://x') in a comment\n/* import http from 'node:http' */\nserve({ fetch: app.fetch });\nctx.egress.egressFetch({ purpose: 'x' }, u);\nconst prefetch = 1; const s = 'https is required';\nconst via = 'fetch'; c.req.header('sec-fetch-site');",
    ),
    [],
  );
});

test('no runtime dependency is a known network client', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> };
  const deps = Object.keys(pkg.dependencies ?? {});
  assert.deepEqual(deps.filter((d) => BANNED_MODULES.includes(d)), []);
});
