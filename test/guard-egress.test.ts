// A static guard (SPEC R4, D9): no code in server/ or shared/ may open a network connection or start a process, except
// server/egress.ts (the one real fetch, and the loopback probe's node:net) and server/proc.ts (the one child_process
// import), and they may import only
// the reviewed modules in ALLOWED_IMPORTS. If this fails, you've added
// a way for BragDoc to talk to the network, or to run something, behind the user's back: send the request through
// ctx.egress.egressFetch(), or the command through proc.run(). Never widen ALLOWED to make this pass without the
// review that a new way out deserves. The technique and the exact-count allow-list are Local Review's fsguard.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './fixture.ts';

const SCANNED = ['server', 'shared'].map((d) => path.join(ROOT, d));

/** Network and process modules, by name: never imported, required or even named in a string outside the allow-list. */
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
  'worker_threads',
  'vm',
  'inspector',
  'undici',
  'node-fetch',
  'cross-fetch',
  'axios',
  'got',
  'ky',
  'ws',
  'eventsource',
  'socket.io-client',
  'execa',
  'cross-spawn',
];

/**
 * Every module server/ and shared/ may import. Anything else (a new npm package, a Node built-in not listed) fails the
 * guard until someone has checked it can't reach the network or start a process, and added it here with that reason.
 * Packages wrap the network too (an API client, `open`, an MCP stdio client): that's why this is an allow-list.
 */
const ALLOWED_IMPORTS: Record<string, string> = {
  hono: 'the HTTP framework (inbound only)',
  '@hono/node-server': "binds the inbound server (its node:http use is the listening socket, not egress)",
  yaml: 'parses config.yaml; writes the data files (comment-preserving)',
  'js-yaml': 'parses the data files (PR3, D25)',
  chokidar: 'watches the data home for hand edits (fs events only; its one dependency, readdirp, is fs only)',
  minisearch: 'the in-memory search index (pure JS; its `fetch` is a SearchableMap method)',
  'file-type': "sniffs an evidence file's type from its bytes (strtok3/token-types: buffers and fs only)",
  zod: 'validation',
  'node:fs': 'files',
  'node:path': 'paths',
  'node:os': 'homedir, constants',
  'node:url': 'fileURLToPath',
  'node:crypto': 'tokens, hashes',
  'node:tty': "banner.ts: WriteStream#getColorDepth for Node's own colour rules (no I/O)",
  '@modelcontextprotocol/server':
    "the MCP server (PR9): createMcpHandler answers web-standard Requests handed to it, McpServer registers tools; it opens no connection and fetches nothing (its own deps: @modelcontextprotocol/core and zod)",
  'node:readline': "the stdio bridge (server/mcp/bridge.ts) reads stdin a line at a time",
  'node:stream': 'types only (Readable, Writable) for the bridge\'s injectable stdin/stdout',
};
/** Allowed in one file only. */
const ALLOWED_IMPORTS_IN: Record<string, string> = {
  'node:child_process': 'server/proc.ts',
  'node:net': 'server/egress.ts', // loopbackAccepts (D48): does anything accept a TCP connection on 127.0.0.1?
};

const RULES: Record<string, { on: 'code' | 'strings'; re: RegExp }> = {
  // the global fetch, called or passed around: `fetch(`, `x = fetch`; not a method or key named fetch (`app.fetch`,
  // `{ fetch: … }`) or an identifier that merely contains it (`egressFetch`)
  fetch: { on: 'code', re: /(?<![\w$.])fetch\b(?!\s*:)/g },
  // the global object or Reflect, through which fetch and friends can be reached by name (`globalThis?.fetch`,
  // `const { fetch: f } = globalThis`, `Reflect.get(globalThis, 'fetch')`)
  globalObject: { on: 'code', re: /\b(?:globalThis|Reflect)\b|\b(?:global|window|self)\s*(?:\?\.|\.|\[)/g },
  // browser-style sockets and streams, which Node also has as globals
  socket: { on: 'code', re: /\b(?:WebSocket|EventSource|XMLHttpRequest|WebTransport)\b/g },
  // code from strings, and node's internals: ways round every rule here
  dynamicCode: { on: 'code', re: /\beval\s*\(|\bnew\s+Function\b|\bprocess\s*\.\s*(?:binding|_linkedBinding|dlopen)\b|\bcreateRequire\b|\bmodule\s*\.\s*require\b/g },
  // a banned module named in any string, however it's then used (`require(cond ? 'http' : 'fs')`)
  bannedName: {
    on: 'strings',
    re: new RegExp(`^(?:node:)?(?:${BANNED_MODULES.map((m) => m.replace(/[.]/g, '\\.')).join('|')})(?:/.*)?$`, 'gm'),
  },
};

/** Exact counts per file (relative to the repo). Anything not listed must be zero. */
const ALLOWED: Record<string, Record<string, number>> = {
  'server/egress.ts': {
    globalObject: 1, // the one real network call: realFetch = (url, init) => globalThis.fetch(url, init)
    bannedName: 1, // import net from 'node:net' (loopbackAccepts, D48: a TCP connect to 127.0.0.1 only)
  },
  'server/proc.ts': {
    bannedName: 1, // import { execFile, spawn } from 'node:child_process'
  },
  'server/commands/mcp.ts': {
    bannedName: 1, // `claude mcp add --transport http …`: the word is an argument to claude, run through proc.ts
  },
  'shared/ulid.ts': {
    globalObject: 1, // globalThis.crypto.getRandomValues(bytes): shared/ runs in the browser too, so no node:crypto
  },
};

function files(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : /\.(?:[cm]?[jt]sx?)$/.test(e.name) ? [p] : [];
  });
}

/**
 * Split a source file into `code` (comments removed; string, template-text and regex contents blanked, so a log field
 * `'fetch'` or a header name `'sec-fetch-site'` isn't a hit, but `${fetch(u)}` inside a template is) and `strings` (the
 * contents of every string literal, one per line). A small lexer rather than regexes: a regex strip is fooled by a
 * glob like '**' + '/*.yaml' in a string opening a "comment" that hides everything up to the next one.
 */
export function lex(src: string): { code: string; strings: string; withStrings: string } {
  let code = '';
  let withStrings = ''; // `code`, but with quoted strings left in (for finding imports)
  const strings: string[] = [];
  const braces: number[] = []; // for each open `${`, the brace depth it started at
  let depth = 0;
  let i = 0;
  const emit = (t: string) => {
    code += t;
    withStrings += t;
  };
  const regexCanStart = () => {
    const prev = code.replace(/\s+$/, '');
    return prev === '' || /[(,=:[!&|?{};+\-*%<>~^]$/.test(prev) || /\b(?:return|typeof|case|of|in|void|yield|await)$/.test(prev);
  };
  const template = () => {
    // at the opening backtick (or just after a `}` closing a `${`): read template text up to `${` or the closing `
    let text = '';
    for (;;) {
      const c = src[i];
      if (c === undefined) break;
      if (c === '\\') {
        text += src.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (c === '`') {
        i++;
        emit('`');
        strings.push(text);
        return;
      }
      if (c === '$' && src[i + 1] === '{') {
        i += 2;
        emit('${');
        strings.push(text);
        braces.push(depth);
        depth++;
        return;
      }
      text += c;
      i++;
    }
    strings.push(text);
  };
  while (i < src.length) {
    const c = src[i]!;
    const n = src[i + 1];
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? src.length : end + 2;
      emit(' ');
    } else if (c === '"' || c === "'") {
      let text = '';
      i++;
      while (i < src.length && src[i] !== c && src[i] !== '\n') {
        if (src[i] === '\\') {
          text += src[i + 1] ?? '';
          i += 2;
        } else text += src[i++];
      }
      i++;
      code += c + c;
      withStrings += c + text + c;
      strings.push(text);
    } else if (c === '`') {
      i++;
      emit('`');
      template();
    } else if (c === '{') {
      depth++;
      emit(c);
      i++;
    } else if (c === '}') {
      depth--;
      i++;
      if (braces.length && braces[braces.length - 1] === depth) {
        braces.pop();
        emit('}');
        template();
      } else emit(c);
    } else if (c === '/' && regexCanStart()) {
      // a regex literal: skip to its unescaped closing / (outside a [class]), then its flags
      let inClass = false;
      i++;
      while (i < src.length && src[i] !== '\n') {
        const r = src[i]!;
        if (r === '\\') i += 2;
        else {
          if (r === '[') inClass = true;
          else if (r === ']') inClass = false;
          else if (r === '/' && !inClass) break;
          i++;
        }
      }
      i++;
      while (/[a-z]/i.test(src[i] ?? '')) i++;
      emit('/re/');
    } else {
      emit(c);
      i++;
    }
  }
  return { code, strings: strings.join('\n'), withStrings };
}

/** Every module a file imports, re-exports from, requires or import()s (from the lexed code + its strings). */
function importsOf(src: string): string[] {
  const out: string[] = [];
  // not a keyword that is itself a string's contents: `z.enum(['user', 'import']).describe('…')` is no import
  const re = /(?<!['"])\b(?:from|import|require)\s*\(?\s*(['"])([^'"\n]+)\1/g;
  for (const m of lex(src).withStrings.matchAll(re)) out.push(m[2]!);
  return out;
}

function hits(source: string): Record<string, number> {
  const { code, strings } = lex(source);
  return Object.fromEntries(Object.entries(RULES).map(([k, { on, re }]) => [k, (on === 'code' ? code : strings).match(re)?.length ?? 0]));
}

test('no code in server/ or shared/ reaches the network or starts a process outside egress.ts and proc.ts', () => {
  const all = SCANNED.flatMap(files);
  assert.ok(all.some((f) => f.endsWith(path.join('server', 'egress.ts'))), 'scanning the right directories');
  assert.ok(all.some((f) => f.endsWith(path.join('shared', 'api.ts'))));
  const problems: string[] = [];
  for (const f of all) {
    const rel = path.relative(ROOT, f).split(path.sep).join('/');
    const src = fs.readFileSync(f, 'utf8');
    for (const [rule, n] of Object.entries(hits(src))) {
      const allowed = ALLOWED[rel]?.[rule] ?? 0;
      if (n !== allowed) problems.push(`${rel}: ${n} × ${rule} (allowed ${allowed})`);
    }
    for (const spec of importsOf(src)) {
      if (spec.startsWith('.')) continue;
      const pkg = spec.startsWith('node:') ? spec.split('/')[0]! : spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]!;
      if (ALLOWED_IMPORTS[pkg] || ALLOWED_IMPORTS_IN[pkg] === rel) continue;
      problems.push(`${rel}: imports ${spec}, which isn't in ALLOWED_IMPORTS`);
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
  assert.deepEqual(caught('globalThis.fetch(url)'), ['globalObject']);
  assert.deepEqual(caught('globalThis?.fetch(url)'), ['globalObject']);
  assert.deepEqual(caught("globalThis['fetch'](url)"), ['globalObject']);
  assert.deepEqual(caught('const { fetch: f } = globalThis'), ['globalObject']);
  assert.deepEqual(caught("Reflect.get(globalThis, 'fetch')"), ['globalObject']);
  assert.deepEqual(caught('const f = fetch; f(url)'), ['fetch']);
  assert.deepEqual(caught('const u = `${base}/x ${fetch(u)}`'), ['fetch']);
  assert.deepEqual(caught("import http from 'node:http'"), ['bannedName']);
  assert.deepEqual(caught("const net = await import('node:net')"), ['bannedName']);
  assert.deepEqual(caught("import { lookup } from 'node:dns/promises'"), ['bannedName']);
  assert.deepEqual(caught("import { request } from 'undici'"), ['bannedName']);
  assert.deepEqual(caught("const m = require(x ? 'https' : 'fs')"), ['bannedName']);
  assert.deepEqual(caught("export { fetch as f } from 'node-fetch'"), ['fetch', 'bannedName']);
  assert.deepEqual(caught("import { spawn } from 'node:child_process'"), ['bannedName']);
  assert.deepEqual(caught("import { Worker } from 'node:worker_threads'"), ['bannedName']);
  assert.deepEqual(caught("new WebSocket('ws://x')"), ['socket']);
  assert.deepEqual(caught("new EventSource('/x')"), ['socket']);
  assert.deepEqual(caught("process.binding('tcp_wrap')"), ['dynamicCode']);
  assert.deepEqual(caught("eval('x')"), ['dynamicCode']);
  assert.deepEqual(caught("createRequire(import.meta.url)('http')"), ['dynamicCode', 'bannedName']);
  // the reviewer's bypass: a glob in a string must not open a comment that hides what follows
  assert.deepEqual(caught("const W = '**/*.yaml';\nawait fetch('https://t.example');\nimport {spawn} from 'node:child_process';\n/** doc */"), ['fetch', 'bannedName']);
  assert.deepEqual(caught('const u = `${base}//x`; fetch(u)'), ['fetch']);
  assert.deepEqual(caught("const re = /['\"]/; fetch(u)"), ['fetch'], 'a quote in a regex is not a string');
  // not caught: mentions in comments, methods and keys named fetch, identifiers containing it, unrelated strings
  assert.deepEqual(
    caught(
      "// fetch('https://x') in a comment\n/* import http from 'node:http' */\nserve({ fetch: app.fetch });\nctx.egress.egressFetch({ purpose: 'x' }, u);\nconst prefetch = 1; const s = 'https is required';\nconst via = 'fetch'; c.req.header('sec-fetch-site');\nconst msg = `fetch failed: ${e}`;",
    ),
    [],
  );
});

test('a new import is caught until it is reviewed into ALLOWED_IMPORTS', () => {
  assert.deepEqual(importsOf("const W = '**/*.yaml';\nimport open from 'open';\n/** doc */"), ['open'], 'a glob in a string hides nothing');
  assert.deepEqual(importsOf("import { execa } from 'execa';\nimport x from './y.js';\nconst o = await import('@octokit/rest');\nexport * from 'open';"), ['execa', './y.js', '@octokit/rest', 'open']);
  assert.deepEqual(importsOf("z.enum(['user', 'import']).optional().describe('Who set it')"), [], "a string 'import' is not an import");
  for (const p of ['execa', '@octokit/rest', 'open', 'simple-git', 'node:http']) assert.ok(!ALLOWED_IMPORTS[p], p);
});

test('no runtime dependency is a known network client', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> };
  const deps = Object.keys(pkg.dependencies ?? {});
  assert.deepEqual(deps.filter((d) => BANNED_MODULES.includes(d)), []);
});
