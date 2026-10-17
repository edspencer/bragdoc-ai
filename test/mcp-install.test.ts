// `bragdoc mcp install claude [--stdio] [--print]`: as a child process with a throwaway HOME and a fake `claude` on
// PATH that records what it was asked to do. Never the real Claude Code, never a real home.
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Runtime } from '../server/runtime.ts';
import { ROOT, tmpHome } from './fixture.ts';

const cleanups: (() => void)[] = [];
after(() => cleanups.forEach((c) => c()));

const CLI = ['--import', 'tsx', path.join(ROOT, 'server', 'cli.ts')];

/**
 * A home with a fake `claude`: each run appends its arguments (one per line, then `--end--`) to calls.log. With
 * FAKE_EXISTS=1 the first `mcp add` fails with "already exists", as the real one does.
 */
function setup({ fake = true, ran = true } = {}) {
  const h = tmpHome('bragdoc-install-');
  cleanups.push(h.cleanup);
  const bin = path.join(h.home, 'bin');
  fs.mkdirSync(bin);
  const log = path.join(h.home, 'calls.log');
  if (fake) {
    fs.writeFileSync(
      path.join(bin, 'claude'),
      `#!/bin/sh
for a in "$@"; do printf '%s\\n' "$a" >> "${log}"; done
echo --end-- >> "${log}"
if [ "$FAKE_EXISTS" = 1 ] && [ "$2" = add ] && [ ! -e "${log}.removed" ]; then echo "MCP server bragdoc already exists in user config" >&2; exit 1; fi
if [ "$2" = remove ]; then touch "${log}.removed"; fi
if [ "$FAKE_FAIL" = 1 ]; then echo "something broke" >&2; exit 3; fi
echo "Added HTTP MCP server bragdoc"
`,
      { mode: 0o755 },
    );
  }
  let token: string | null = null;
  if (ran) {
    const rt = new Runtime(h.dataDir);
    rt.write({ pid: process.pid, port: 5123, url: 'http://localhost:5123', version: '0.0.0', startedAt: new Date().toISOString() });
    token = rt.mcpToken();
  }
  const run = (args: string[], env: Record<string, string> = {}) =>
    spawnSync(process.execPath, [...CLI, 'mcp', 'install', 'claude', ...args], { cwd: ROOT, encoding: 'utf8', env: { ...h.env, PATH: `${bin}:/usr/bin:/bin`, ...env } });
  const calls = () =>
    fs.existsSync(log)
      ? fs
          .readFileSync(log, 'utf8')
          .split('--end--\n')
          .filter(Boolean)
          .map((c) => c.trimEnd().split('\n'))
      : [];
  return { ...h, run, calls, token };
}

describe('bragdoc mcp install claude', () => {
  test('registers the HTTP endpoint at user scope with the token and X-BragDoc-Client, on the port it last ran on', () => {
    const t = setup();
    const r = t.run([]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^Registered BragDoc MCP server with Claude Code \(user scope\): http:\/\/127\.0\.0\.1:5123\/mcp\./);
    assert.doesNotMatch(r.stdout, new RegExp(t.token!), 'the token is never printed');
    assert.deepEqual(t.calls(), [
      ['mcp', 'add', '--transport', 'http', '--scope', 'user', 'bragdoc', 'http://127.0.0.1:5123/mcp', '--header', `Authorization: Bearer ${t.token}`, '--header', 'X-BragDoc-Client: claude-code'],
    ]);
    // nothing of ours was written into the home: claude does its own config
    assert.deepEqual(fs.readdirSync(t.home).sort(), ['.bragdoc', 'bin', 'calls.log']);
  });

  test('--port overrides it; an existing registration is replaced', () => {
    const t = setup();
    const r = t.run(['--port', '2724'], { FAKE_EXISTS: '1' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^Replaced the BragDoc MCP server/);
    const calls = t.calls();
    assert.equal(calls.length, 3);
    assert.equal(calls[0]![7], 'http://127.0.0.1:2724/mcp');
    assert.deepEqual(calls[1], ['mcp', 'remove', '--scope', 'user', 'bragdoc']);
    assert.deepEqual(calls[2], calls[0]);
  });

  test("--stdio registers `bragdoc mcp`, which needs no token (and so works before BragDoc's first run)", () => {
    const t = setup({ ran: false });
    // from source there's no built CLI to point at: it says so rather than registering something that can't start
    const src = t.run(['--stdio']);
    assert.equal(src.status, 1);
    assert.match(src.stderr, /--stdio needs a build/);
    const built = path.join(ROOT, 'dist', 'server', 'cli.js');
    if (!fs.existsSync(built)) return; // `npm run build` first for the rest
    const r = spawnSync(process.execPath, [built, 'mcp', 'install', 'claude', '--stdio', '--data-dir', t.dataDir], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...t.env, PATH: `${path.join(t.home, 'bin')}:/usr/bin:/bin` },
    });
    assert.equal(r.status, 0, r.stderr);
    const [call] = t.calls();
    assert.deepEqual(call!.slice(0, 6), ['mcp', 'add', '--scope', 'user', 'bragdoc', '--']);
    assert.deepEqual(call!.slice(7), [fs.realpathSync(built), 'mcp', '--data-dir', t.dataDir]);
    assert.match(r.stdout, /as the stdio bridge/);
  });

  test("before BragDoc's first run there's no token: it says how to get one, and runs nothing", () => {
    const t = setup({ ran: false });
    const r = t.run([]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /hasn't run with .* yet, so it has no MCP token\. Start it once/);
    assert.deepEqual(t.calls(), []);
  });

  test('no claude on PATH: the command to run by hand', () => {
    const t = setup({ fake: false });
    const r = t.run([]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /`claude` command isn't installed here/);
    assert.ok(r.stderr.includes(`claude mcp add --transport http --scope user bragdoc http://127.0.0.1:5123/mcp --header 'Authorization: Bearer ${t.token}'`));
  });

  test('claude fails: its message and the command (token hidden)', () => {
    const t = setup();
    const r = t.run([], { FAKE_FAIL: '1' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /`claude mcp add` failed \(exit 3\):\nsomething broke/);
    assert.match(r.stderr, /--header 'Authorization: Bearer <token>'/);
    assert.ok(!r.stderr.includes(t.token!));
  });

  test('--print shows Claude Code, Claude Desktop, Cursor and generic config, and runs nothing', () => {
    const t = setup();
    const r = t.run(['--print']);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(t.calls(), []);
    assert.match(r.stdout, /^BragDoc's MCP server: http:\/\/127\.0\.0\.1:5123\/mcp/);
    assert.match(r.stdout, /# Claude Desktop/);
    const cursor = JSON.parse(r.stdout.slice(r.stdout.indexOf('{', r.stdout.indexOf('# Cursor')), r.stdout.indexOf('\n}\n', r.stdout.indexOf('# Cursor')) + 2));
    assert.deepEqual(cursor, { mcpServers: { bragdoc: { url: 'http://127.0.0.1:5123/mcp', headers: { Authorization: `Bearer ${t.token}`, 'X-BragDoc-Client': 'cursor' } } } });
    // with no token yet, a placeholder
    const fresh = setup({ ran: false });
    const p = fresh.run(['--print']);
    assert.equal(p.status, 0);
    assert.match(p.stdout, /No token yet/);
    assert.match(p.stdout, /Bearer <token>/);
  });
});
