// AI keys (SPEC R17): in secrets.yaml (0600) under ai.<connection>.apiKey, never in GET /api/ai, config.yaml, the
// network log or a backup; the API shows only hasKey and the last four characters; forgetting removes it; a broken
// secrets.yaml is never overwritten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { Secrets, SecretsError } from '../server/secrets.ts';
import { takeSnapshot } from '../server/store/backups.ts';
import { aiHome, CONSENT, fakeNetwork } from './ai-fixture.ts';

const KEY = 'sk-or-v1-0123456789abcdefSECRETwxyz';

test('a key is stored 0600, used, shown only as its last four characters, and never written anywhere else', async () => {
  const net = fakeNetwork();
  const home = aiHome({ ai: { enabled: true, connections: { or: { kind: 'openrouter' } } }, fetchImpl: net.impl });
  try {
    await home.req('POST', '/api/ai/connections/or/consent', CONSENT);
    const before = (await home.req('GET', '/api/ai')).body.connections[0];
    assert.deepEqual([before.hasKey, before.keyHint, before.needsKey, before.blocked.code], [false, null, true, 'no_key']);
    assert.equal((await home.req('POST', '/api/ai/connections/or/test', { model: 'm' })).body.error.code, 'no_key', 'no key: nothing sent');
    assert.equal(net.calls.length, 0);

    const put = await home.req('PUT', '/api/ai/connections/or/key', { key: `  ${KEY}\n` });
    assert.deepEqual(put.body, { id: 'or', hasKey: true, keyHint: '…wxyz' });
    const file = path.join(home.dir, 'secrets.yaml');
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal(YAML.parse(fs.readFileSync(file, 'utf8')).ai.or.apiKey, KEY, 'trimmed');

    const status = await home.req('GET', '/api/ai');
    assert.equal(status.body.connections[0].keyHint, '…wxyz');
    assert.equal(status.body.connections[0].blocked, null);
    const r = await home.req('POST', '/api/ai/connections/or/test', { model: 'm' });
    assert.equal(r.body.ok, true);
    assert.equal(net.calls[0]!.headers.authorization, `Bearer ${KEY}`, 'sent to its host');

    takeSnapshot(home.dir);
    const everywhere = [JSON.stringify(status.body), JSON.stringify(r.body), fs.readFileSync(path.join(home.dir, 'config.yaml'), 'utf8'), ...readAll(path.join(home.dir, 'logs')), ...readAll(path.join(home.dir, 'backups'))];
    for (const text of everywhere) assert.ok(!text.includes('SECRET'), 'the key is nowhere but secrets.yaml');
    assert.ok(readAll(path.join(home.dir, 'backups')).length > 0, 'a snapshot was taken');

    // forget: gone from the file, not just blanked
    const del = await home.req('DELETE', '/api/ai/connections/or/key');
    assert.deepEqual(del.body, { id: 'or', hasKey: false, keyHint: null });
    assert.ok(!fs.readFileSync(file, 'utf8').includes('apiKey'));
  } finally {
    home.close();
  }
});

test('other secrets (a GitHub token, keys this build doesn’t know) are kept; removing a connection forgets its key', async () => {
  const home = aiHome({ ai: { enabled: true, connections: { or: { kind: 'openrouter' }, ant: { kind: 'anthropic' } } } });
  try {
    const file = path.join(home.dir, 'secrets.yaml');
    fs.writeFileSync(file, 'github:\n  token: ghp_example\nfuture:\n  thing: 1\n', { mode: 0o600 });
    await home.req('PUT', '/api/ai/connections/or/key', { key: KEY });
    await home.req('PUT', '/api/ai/connections/ant/key', { key: 'sk-ant-0000000000000000abcd' });
    await home.req('DELETE', '/api/ai/connections/or');
    const doc = YAML.parse(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(doc.github, { token: 'ghp_example' });
    assert.deepEqual(doc.future, { thing: 1 });
    assert.deepEqual(Object.keys(doc.ai), ['ant'], "or's key went with it");
    assert.equal(home.ctx.secrets.githubToken(), 'ghp_example');
  } finally {
    home.close();
  }
});

test('a key is for its host: pointing the connection elsewhere forgets the key along with the consent', async () => {
  const home = aiHome({ ai: { enabled: true } });
  try {
    await home.req('POST', '/api/ai/connections', { kind: 'openai-compatible', id: 'c', baseUrl: 'https://llm.example.com/v1' });
    await home.req('POST', '/api/ai/connections/c/consent', CONSENT);
    await home.req('PUT', '/api/ai/connections/c/key', { key: KEY });
    const samehost = await home.req('PUT', '/api/ai/connections/c', { baseUrl: 'https://llm.example.com/v2' });
    assert.deepEqual([samehost.body.connections[0].hasKey, samehost.body.connections[0].consent.current], [true, true], 'same host: both stay');
    const moved = await home.req('PUT', '/api/ai/connections/c', { baseUrl: 'https://proxy.example.net/v1' });
    assert.deepEqual([moved.body.connections[0].hasKey, moved.body.connections[0].consent], [false, null]);
  } finally {
    home.close();
  }
});

test('a broken secrets.yaml is never overwritten: saving a key says why, and GET /api/ai says so', async () => {
  const home = aiHome({ ai: { enabled: true, connections: { or: { kind: 'openrouter' } } } });
  try {
    const file = path.join(home.dir, 'secrets.yaml');
    const broken = 'ai: [this is: not, valid\n';
    fs.writeFileSync(file, broken, { mode: 0o600 });
    const r = await home.req('PUT', '/api/ai/connections/or/key', { key: KEY });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'secrets_invalid');
    assert.match(r.body.error.message, /isn't valid YAML.*won't overwrite it/);
    assert.equal(fs.readFileSync(file, 'utf8'), broken);
    assert.equal((await home.req('DELETE', '/api/ai/connections/or/key')).status, 409);
    assert.equal((await home.req('DELETE', '/api/ai/connections/or')).status, 409, "removing it would leave a key a new connection of that id inherits");
    assert.equal((await home.req('GET', '/api/ai')).body.connections.length, 1, 'nothing was removed');
    assert.equal(fs.readFileSync(file, 'utf8'), broken);
    const s = (await home.req('GET', '/api/ai')).body;
    assert.match(s.secretsProblem, /isn't valid YAML/);
    assert.equal(s.connections[0].hasKey, false);
    // a file that parses but whose ai: isn't a mapping is refused too, never rewritten
    fs.writeFileSync(file, 'ai: oops\n');
    assert.equal((await home.req('PUT', '/api/ai/connections/or/key', { key: KEY })).body.error.code, 'secrets_invalid');
    assert.equal(fs.readFileSync(file, 'utf8'), 'ai: oops\n');
    assert.match((await home.req('GET', '/api/ai')).body.secretsProblem, /should be a mapping/);
  } finally {
    home.close();
  }
});

test('keys are checked: one token, not too short; Jev has none of its own (it uses its OpenRouter connection’s)', async () => {
  const home = aiHome({ ai: { enabled: true, connections: { or: { kind: 'openrouter' }, jev: { kind: 'jev', via: 'or' } } } });
  try {
    for (const key of ['short', 'has a space in it', '']) assert.equal((await home.req('PUT', '/api/ai/connections/or/key', { key })).status, 400, key);
    assert.equal((await home.req('PUT', '/api/ai/connections/or/key', { key: KEY, extra: 1 })).status, 400, 'strict body');
    assert.equal((await home.req('PUT', '/api/ai/connections/nope/key', { key: KEY })).status, 404);
    assert.equal((await home.req('PUT', '/api/ai/connections/jev/key', { key: KEY })).status, 400);
    await home.req('PUT', '/api/ai/connections/or/key', { key: KEY });
    const jev = (await home.req('GET', '/api/ai')).body.connections.find((c: { id: string }) => c.id === 'jev');
    assert.deepEqual([jev.hasKey, jev.keyHint, jev.host, jev.class], [true, '…wxyz', 'openrouter.ai', 'internet']);
    assert.equal(new Secrets(home.dir).aiKey('jev', home.config.get().ai.connections), KEY);
  } finally {
    home.close();
  }
});

test('Secrets: aiKeyHint never gives away much of a short key; a broken file reads as no key, with the reason', () => {
  const home = aiHome();
  try {
    const s = new Secrets(home.dir);
    s.setAiKey('a', 'abcdefgh12');
    assert.deepEqual(s.aiKeyHint('a'), { hasKey: true, keyHint: '…' });
    fs.writeFileSync(s.file, '- not\n- a mapping\n');
    assert.throws(() => s.aiKey('a'), SecretsError);
    assert.deepEqual(s.aiKeyHint('a').hasKey, false);
    assert.match(s.aiKeyHint('a').error!, /mapping/);
  } finally {
    home.close();
  }
});

function readAll(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true, recursive: true }).filter((e) => e.isFile()).map((e) => fs.readFileSync(path.join(e.parentPath, e.name), 'utf8'));
}
