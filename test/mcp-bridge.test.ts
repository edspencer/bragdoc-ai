// server/mcp/bridge.ts and `bragdoc mcp`: the stdio bridge forwards to a real server's /mcp (so the server stays the
// one writer), in both protocol eras, with the token from runtime.json and the client's name; it says clearly when
// BragDoc isn't running, and picks up a rotated token. Adapted from Hallway's test/mcp-bridge.test.ts.
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { startServer } from '../server/index.ts';
import { clientHeader, headerValue, headersFor, runBridge, sseMessages } from '../server/mcp/bridge.ts';
import { Runtime } from '../server/runtime.ts';
import { openStore } from '../server/store/index.ts';
import { ROOT, tmpHome } from './fixture.ts';

const cleanups: (() => void | Promise<void>)[] = [];
after(async () => {
  for (const c of cleanups.reverse()) await c();
});

const CLI = ['--import', 'tsx', path.join(ROOT, 'server', 'cli.ts')];

async function server() {
  const h = tmpHome('bragdoc-bridge-');
  const runtime = new Runtime(h.dataDir);
  const store = openStore(h.dataDir);
  const s = await startServer(0, { dataDir: h.dataDir, webDist: null, runtime, store });
  cleanups.push(async () => {
    await s.close();
    h.cleanup();
  });
  return { ...h, ...s, runtime, store };
}

describe('bragdoc mcp (a real child process)', () => {
  for (const era of ['legacy', 'auto'] as const)
    test(`an SDK stdio client (${era === 'legacy' ? '2025 handshake' : '2026-07-28'}) reaches the tools and writes through the server`, async () => {
      const s = await server();
      const transport = new StdioClientTransport({ command: process.execPath, args: [...CLI, 'mcp'], env: s.env as Record<string, string>, cwd: ROOT, stderr: 'pipe' });
      const client = new Client({ name: 'claude-code', version: '1' }, era === 'auto' ? { versionNegotiation: { mode: 'auto' } } : {});
      await client.connect(transport);
      cleanups.push(() => client.close());
      const tools = (await client.listTools()).tools.map((t) => t.name);
      assert.ok(tools.includes('bragdoc_get_context'));
      const r = (await client.callTool({ name: 'bragdoc_add_achievement', arguments: { title: `Via the bridge (${era})` } })) as { isError?: boolean; structuredContent?: { achievement: { id: string } } };
      assert.ok(!r.isError, JSON.stringify(r));
      // written by the server's store: its in-memory copy already has it, named for the client either way (the bridge
      // sends a 2025 client's initialize name as X-BragDoc-Client)
      const a = s.store.get('achievement', r.structuredContent!.achievement.id)!;
      assert.equal(a.source, 'mcp');
      assert.equal(a.sourceAgent, 'Claude Code');
      // its requests are in the network log, as loopback, like every other outbound request
      const log = fs.readFileSync(path.join(s.dataDir, 'logs', 'network.jsonl'), 'utf8');
      assert.match(log, /"purpose":"mcp\.bridge".*"host":"127\.0\.0\.1:\d+","path":"\/mcp","outcome":"ok","status":200/);
    });

  test('a token rotated while it runs: it reads runtime.json again and carries on', async () => {
    const s = await server();
    const transport = new StdioClientTransport({ command: process.execPath, args: [...CLI, 'mcp'], env: s.env as Record<string, string>, cwd: ROOT, stderr: 'pipe' });
    const client = new Client({ name: 'rotation-test', version: '1' });
    await client.connect(transport);
    cleanups.push(() => client.close());
    s.runtime.rotate();
    assert.ok((await client.listTools()).tools.length > 0);
  });

  test("without a server it exits 1 and says how to start one; a stale runtime.json is the same", () => {
    const h = tmpHome('bragdoc-bridge-none-');
    cleanups.push(h.cleanup);
    const run = () => spawnSync(process.execPath, [...CLI, 'mcp'], { input: '', encoding: 'utf8', env: h.env, cwd: ROOT });
    let r = run();
    assert.equal(r.status, 1);
    assert.match(r.stderr, /^bragdoc mcp: BragDoc isn't running: run `bragdoc` or `bragdoc service install`, then reconnect\. \(No runtime\.json/);
    assert.equal(r.stdout, '');
    // runtime.json from a server that's gone (a pid nothing has)
    fs.mkdirSync(h.dataDir, { recursive: true });
    fs.writeFileSync(path.join(h.dataDir, 'runtime.json'), JSON.stringify({ pid: 2 ** 22 + 12345, port: 1, url: 'http://localhost:1', version: '0', startedAt: '', mcpToken: 'a'.repeat(43) }));
    r = run();
    assert.equal(r.status, 1);
    assert.match(r.stderr, /BragDoc isn't running/);
    assert.doesNotMatch(r.stderr, /No runtime\.json/);
    assert.equal(fs.existsSync(path.join(h.dataDir, 'logs')), false, 'nothing was sent, so nothing was logged');
  });

  test('usage: unknown subcommands and flags exit 2', () => {
    const h = tmpHome('bragdoc-bridge-usage-');
    cleanups.push(h.cleanup);
    for (const args of [['mcp', 'frobnicate'], ['mcp', '--stdio'], ['mcp', 'install'], ['mcp', 'install', 'cursor'], ['mcp', 'install', 'claude', '--dry-run'], ['mcp', 'extra', 'args']]) {
      const r = spawnSync(process.execPath, [...CLI, ...args], { input: '', encoding: 'utf8', env: h.env, cwd: ROOT });
      assert.equal(r.status, 2, `${args.join(' ')}: ${r.stderr}`);
    }
  });
});

/** A bridge on in-memory streams, its output parsed. */
function harness(fetch: Parameters<typeof runBridge>[0]['fetch'], token: () => string | null = () => 't1') {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const out: string[] = [];
  stdout.on('data', (d) => out.push(...String(d).trim().split('\n').filter(Boolean)));
  const done = runBridge({ base: 'http://127.0.0.1:1', token, notRunning: "BragDoc isn't running", stdin, stdout, stderr: new PassThrough(), fetch });
  return { stdin, done, msgs: () => out.map((l) => JSON.parse(l)) };
}

describe('runBridge', () => {
  test('a server that goes away: each request gets a JSON-RPC error saying so; bad JSON is a parse error', async () => {
    const h = harness(async () => {
      throw new TypeError('fetch failed', { cause: new Error('connect ECONNREFUSED 127.0.0.1:1') });
    });
    h.stdin.write('{"jsonrpc":"2.0","id":7,"method":"tools/list","params":{}}\n');
    h.stdin.write('not json\n');
    h.stdin.end();
    await h.done;
    const msgs = h.msgs();
    assert.equal(msgs.find((m) => m.id === 7)?.error.code, -32603);
    assert.match(msgs.find((m) => m.id === 7)?.error.message, /BragDoc isn't running \(connect ECONNREFUSED/);
    assert.equal(msgs.find((m) => m.id === null)?.error.code, -32700);
  });

  test('sends the token and the client name; a 401 re-reads the token once, then says the token was refused', async () => {
    const seen: Record<string, string>[] = [];
    let tokenNow = 't1';
    const h = harness(
      async (_url, init) => {
        const headers = init.headers as Record<string, string>;
        seen.push(headers);
        if (headers.authorization !== 'Bearer t2') return new Response('{"error":{"code":"unauthorized","message":"no"}}', { status: 401 });
        return Response.json({ jsonrpc: '2.0', id: JSON.parse(String(init.body)).id, result: {} });
      },
      () => tokenNow,
    );
    h.stdin.write('{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"clientInfo":{"name":"claude-code","version":"1"}}}\n');
    await new Promise((r) => setTimeout(r, 30));
    tokenNow = 't2';
    h.stdin.write('{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n');
    await new Promise((r) => setTimeout(r, 30));
    tokenNow = 'bad';
    // t2 still works: no re-read needed
    h.stdin.write('{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n');
    h.stdin.end();
    await h.done;
    const msgs = h.msgs();
    assert.match(msgs.find((m) => m.id === 0)?.error.message, /refused the MCP token in runtime\.json/);
    assert.deepEqual(msgs.find((m) => m.id === 1)?.result, {});
    assert.deepEqual(msgs.find((m) => m.id === 2)?.result, {});
    assert.equal(seen[0]!.authorization, 'Bearer t1');
    assert.equal(seen[0]!['x-bragdoc-client'], 'claude-code');
    assert.deepEqual(seen.map((s) => s.authorization), ['Bearer t1', 'Bearer t1', 'Bearer t2', 'Bearer t2']);
  });

  test('forwards SSE responses message by message, and cancels a request on notifications/cancelled', async () => {
    let aborted = false;
    const h = harness((async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.id === 1) {
        const sse = 'event: message\ndata: {"jsonrpc":"2.0","method":"notifications/progress","params":{}}\n\n: keep-alive\n\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n\n';
        return new Response(sse, { headers: { 'content-type': 'text/event-stream' } });
      }
      return new Promise((_, rej) =>
        init.signal!.addEventListener('abort', () => {
          aborted = true;
          rej(new Error('aborted'));
        }),
      );
    }) as Parameters<typeof runBridge>[0]['fetch']);
    h.stdin.write('{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"bragdoc_get_context"}}\n');
    h.stdin.write('{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"bragdoc_get_context"}}\n');
    await new Promise((r) => setTimeout(r, 50));
    h.stdin.write('{"jsonrpc":"2.0","method":"notifications/cancelled","params":{"requestId":2}}\n');
    h.stdin.end();
    await h.done;
    assert.ok(aborted);
    assert.deepEqual(
      h.msgs().map((m) => m.method ?? m.id),
      ['notifications/progress', 1],
    );
  });

  test('a non-JSON-RPC answer (a 403 from the Host check) becomes an error naming the status and message', async () => {
    const h = harness(async () => Response.json({ error: { code: 'forbidden_host', message: 'This address is not one BragDoc answers to.' } }, { status: 403 }));
    h.stdin.write('{"jsonrpc":"2.0","id":3,"method":"tools/list","params":{}}\n');
    h.stdin.end();
    await h.done;
    assert.match(h.msgs()[0].error.message, /^BragDoc answered HTTP 403: This address is not one BragDoc answers to\.$/);
  });
});

describe('the HTTP binding headers', () => {
  test('protocol version from _meta, else the negotiated one; method; name (Base64 when not header-safe)', () => {
    const modern = headersFor({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'bragdoc_get_context', _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' } } }, null);
    assert.equal(modern['mcp-protocol-version'], '2026-07-28');
    assert.equal(modern['mcp-method'], 'tools/call');
    assert.equal(modern['mcp-name'], 'bragdoc_get_context');
    const legacy = headersFor({ jsonrpc: '2.0', id: 2, method: 'resources/read', params: { uri: 'bragdoc://context' } }, '2025-11-25');
    assert.equal(legacy['mcp-protocol-version'], '2025-11-25');
    assert.equal(legacy['mcp-name'], 'bragdoc://context');
    assert.equal(headersFor({ jsonrpc: '2.0', id: 0, method: 'initialize', params: {} }, '2025-11-25')['mcp-protocol-version'], undefined);
    assert.equal(headerValue('naïve'), `=?base64?${Buffer.from('naïve').toString('base64')}?=`);
    assert.equal(clientHeader('claude-code'), 'claude-code');
    assert.equal(clientHeader('evil\r\nX-Injected: 1'), 'evilX-Injected 1');
    assert.equal(clientHeader(42), null);
  });

  test('sseMessages joins multi-line data and skips comments', async () => {
    const body = new Response('data: a\ndata: b\n\n:ping\n\nid: 3\ndata: c\r\n\r\n').body!;
    const got: string[] = [];
    for await (const m of sseMessages(body)) got.push(m);
    assert.deepEqual(got, ['a\nb', 'c']);
  });
});
