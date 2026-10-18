// Local or cloud is decided by host, never by kind, and cloud needs consent before anything is sent (SPEC R17, R19).
// Consent is per connection, checked on every call: two connections on one host are revoked one at a time.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { consentCurrent, consentStatement, CONSENT as STATEMENTS } from '../shared/ai/consent.ts';
import { hostClass } from '../shared/ai/hosts.ts';
import { isCloud } from '../shared/ai/connections.ts';
import { EgressDenied } from '../server/egress.ts';
import { aiHome, CONSENT, fakeNetwork } from './ai-fixture.ts';

describe('hostClass: where a URL goes, by its host', () => {
  const cases: [string, string][] = [
    ['http://127.0.0.1:11434', 'this-computer'],
    ['http://127.8.9.10/', 'this-computer'],
    ['http://localhost:1234/v1', 'this-computer'],
    ['http://ollama.localhost/', 'this-computer'],
    ['http://[::1]:8080/', 'this-computer'],
    ['http://[::ffff:127.0.0.1]/', 'this-computer'],
    ['http://2130706433/', 'this-computer'], // 127.0.0.1 written as a number: the URL parser normalises it
    ['http://192.168.1.5:11434', 'your-network'],
    ['http://10.0.0.7/', 'your-network'],
    ['http://172.16.0.1/', 'your-network'],
    ['http://172.31.255.255/', 'your-network'],
    ['http://169.254.10.20/', 'your-network'],
    ['http://[fd00::1]/', 'your-network'],
    ['http://[fe80::1]/', 'your-network'],
    ['http://[::ffff:192.168.1.5]/', 'your-network'],
    ['http://host.docker.internal:11434', 'your-network'],
    ['http://studio.local:1234/v1', 'your-network'],
    ['http://172.32.0.1/', 'internet'],
    ['http://172.15.0.1/', 'internet'],
    ['https://llm.example.com/v1', 'internet'],
    ['https://openrouter.ai/api/v1', 'internet'],
    ['http://203.0.113.5:11434', 'internet'],
    ['http://192.168.1.5.nip.example/', 'internet'], // a name that merely contains an address is still a name
    ['http://[2001:db8::1]/', 'internet'],
    ['not a url', 'internet'],
  ];
  for (const [url, want] of cases) test(`${url} → ${want}`, () => assert.equal(hostClass(url), want));

  test('the kind never makes a connection local: a hosted OpenAI-compatible server, or Ollama on the internet, is cloud', () => {
    assert.equal(isCloud({ kind: 'openai-compatible', baseUrl: 'https://llm.example.com/v1' }), true);
    assert.equal(isCloud({ kind: 'ollama', baseUrl: 'https://ollama.example.com' }), true);
    assert.equal(isCloud({ kind: 'ollama' }), false, 'the preset is loopback');
    assert.equal(isCloud({ kind: 'openai-compatible', baseUrl: 'http://192.168.1.5:8080/v1' }), false);
    assert.equal(isCloud({ kind: 'anthropic', baseUrl: 'http://127.0.0.1:9999/v1' }), false, 'a fixed-host kind pointed at this computer');
    assert.equal(isCloud({ kind: 'openai-compatible' }), true, 'no address: never trusted as local');
  });
});

describe('consent statements', () => {
  test('each covers what every feature sends, the provider and how to revoke', () => {
    for (const [name, s] of Object.entries(STATEMENTS)) {
      assert.ok(s.version >= 1, name);
      assert.ok(s.sends.judge?.length && s.sends.test?.length, name);
      assert.ok(s.notes.some((n) => /Revoke/.test(n)), `${name}: how to revoke`);
      assert.ok(s.notes.some((n) => /makers see nothing/.test(n)), name);
    }
    assert.equal(consentStatement('ollama'), STATEMENTS.custom, 'a local-runner kind on the internet gets the unknown-provider statement');
    assert.equal(STATEMENTS.custom.policyUrl, null);
  });

  test('consent counts for its host and its version only', () => {
    assert.equal(consentCurrent('openrouter', { version: 1, host: 'openrouter.ai' }, 'openrouter.ai'), true);
    assert.equal(consentCurrent('openrouter', { version: 1, host: 'openrouter.ai' }, 'llm.example.com'), false, 'pointed elsewhere');
    assert.equal(consentCurrent('openrouter', { version: 0, host: 'openrouter.ai' }, 'openrouter.ai'), false, 'an older statement');
    assert.equal(consentCurrent('openrouter', null, 'openrouter.ai'), false);
    assert.equal(consentCurrent('openrouter', { version: 1 }, 'openrouter.ai'), false, 'a consent that names no host covers none');
  });
});

describe('a cloud connection sends nothing until you consent', () => {
  test('a custom https://llm.example.com/v1 is internet: refused until consent, allowed after, refused after revoke', async () => {
    const net = fakeNetwork();
    const home = aiHome({ ai: { enabled: true }, fetchImpl: net.impl });
    try {
      const add = await home.req('POST', '/api/ai/connections', { kind: 'openai-compatible', id: 'custom', baseUrl: 'https://llm.example.com/v1/' });
      assert.equal(add.status, 201);
      const c = add.body.connection;
      assert.equal(c.class, 'internet');
      assert.equal(c.cloud, true);
      assert.equal(c.baseUrl, 'https://llm.example.com/v1');
      assert.equal(c.consentVersion, 1);
      assert.equal(c.consent, null);
      assert.equal(c.blocked.code, 'not_consented');
      // before consent: the test and the model list are refused, nothing is sent, nothing even reaches the log
      const t = await home.req('POST', '/api/ai/connections/custom/test', { model: 'model-a' });
      assert.equal(t.status, 409);
      assert.equal(t.body.error.code, 'not_consented');
      assert.equal((await home.req('GET', '/api/ai/connections/custom/models')).body.error.code, 'not_consented');
      assert.equal(net.calls.length, 0);
      assert.deepEqual(home.log(), []);
      assert.deepEqual((await home.req('GET', '/api/ai')).body.egressHosts, []);
      // consent to a stale statement: refused
      assert.equal((await home.req('POST', '/api/ai/connections/custom/consent', { version: 99 })).body.error.code, 'stale_consent');
      // after consent: the host joins the allow-list, and the test goes out as an internet line to that host only
      const ok = await home.req('POST', '/api/ai/connections/custom/consent', CONSENT);
      assert.equal(ok.status, 200);
      assert.deepEqual(ok.body.egressHosts, ['llm.example.com']);
      assert.equal(ok.body.connections[0].consent.current, true);
      const r = await home.req('POST', '/api/ai/connections/custom/test', { model: 'model-a' });
      assert.equal(r.body.ok, true, JSON.stringify(r.body));
      assert.equal(r.body.where, 'internet');
      assert.deepEqual(home.log().map((e) => [e.host, e.where, e.feature, e.outcome]), [['llm.example.com', 'internet', 'test', 'ok']]);
      // revoke: off the list at once, and the next call is refused before anything is sent
      const rev = await home.req('DELETE', '/api/ai/connections/custom/consent');
      assert.deepEqual(rev.body.egressHosts, []);
      assert.equal((await home.req('POST', '/api/ai/connections/custom/test', { model: 'model-a' })).body.error.code, 'not_consented');
      assert.equal(net.calls.length, 1);
    } finally {
      home.close();
    }
  });

  test('pointing a consented connection at another host asks again', async () => {
    const home = aiHome({ ai: { enabled: true } });
    try {
      await home.req('POST', '/api/ai/connections', { kind: 'openai-compatible', id: 'custom', baseUrl: 'https://llm.example.com/v1' });
      await home.req('POST', '/api/ai/connections/custom/consent', CONSENT);
      const same = await home.req('PUT', '/api/ai/connections/custom', { baseUrl: 'https://llm.example.com/v2', name: 'Mine' });
      assert.equal(same.body.connections[0].consent.current, true, 'same host: consent stands');
      const moved = await home.req('PUT', '/api/ai/connections/custom', { baseUrl: 'https://other.example.net/v1' });
      assert.equal(moved.body.connections[0].consent, null, 'another host: asked again');
      assert.equal(moved.body.connections[0].blocked.code, 'not_consented');
      // and by hand: a consent written for one host doesn't cover another
      home.config.update({ ai: { connections: { custom: { consent: { at: '2026-10-18T00:00:00Z', version: 1, host: 'llm.example.com' } } } } });
      assert.equal((await home.req('GET', '/api/ai')).body.connections[0].consent.current, false);
      home.config.update({ ai: { connections: { custom: { consent: { at: '2026-10-18T00:00:00Z', version: 1, host: null } } } } });
      assert.equal((await home.req('GET', '/api/ai')).body.connections[0].consent.current, false, 'hand-written without a host: covers none');
    } finally {
      home.close();
    }
  });

  test('http://192.168.1.5:11434 is local (your network): no consent, plain http allowed, logged as your network', async () => {
    const net = fakeNetwork();
    const home = aiHome({ ai: { enabled: true }, fetchImpl: net.impl });
    try {
      const add = await home.req('POST', '/api/ai/connections', { kind: 'ollama', baseUrl: 'http://192.168.1.5:11434' });
      assert.equal(add.body.connection.class, 'your-network');
      assert.equal(add.body.connection.cloud, false);
      assert.equal(add.body.connection.blocked, null);
      assert.equal(add.body.connection.consentVersion, null);
      assert.equal((await home.req('POST', '/api/ai/connections/ollama/consent', CONSENT)).body.error.code, 'not_cloud');
      const r = await home.req('POST', '/api/ai/connections/ollama/test', { model: 'qwen3.5:4b' });
      assert.equal(r.body.ok, true);
      assert.deepEqual(home.log().map((e) => [e.host, e.where]), [['192.168.1.5:11434', 'your-network']]);
    } finally {
      home.close();
    }
  });

  test('plain http to the internet is never allowed: refused when you add it, and by egress if written by hand', async () => {
    const net = fakeNetwork();
    const home = aiHome({ ai: { enabled: true }, fetchImpl: net.impl });
    try {
      for (const baseUrl of ['http://example.com/v1', 'http://203.0.113.5:11434']) {
        const r = await home.req('POST', '/api/ai/connections', { kind: 'openai-compatible', baseUrl });
        assert.equal(r.status, 400, baseUrl);
        assert.equal(r.body.error.code, 'plain_http');
        assert.match(r.body.error.message, /only https leaves this computer/);
      }
      for (const baseUrl of ['ftp://192.168.1.5/', 'https://me:pw@llm.example.com/', 'nonsense', 'https://llm.example.com/v1?key=x'])
        assert.equal((await home.req('POST', '/api/ai/connections', { kind: 'openai-compatible', baseUrl })).status, 400, baseUrl);
      // a hand edit that consents to plain http on the internet: egress still refuses before sending
      home.config.update({ ai: { connections: { bad: { kind: 'openai-compatible', baseUrl: 'http://example.com/v1', consent: { at: '2026-10-18T00:00:00Z', version: 1, host: 'example.com' } } } } });
      const t = await home.req('POST', '/api/ai/connections/bad/test', { model: 'm' });
      assert.equal(t.body.ok, false);
      assert.match(t.body.error.message, /only https leaves this computer/);
      assert.equal(net.calls.length, 0);
      assert.equal(home.log()[0]!.outcome, 'denied');
    } finally {
      home.close();
    }
  });

  test('two connections share a host: revoking one refuses it, and the other still works', async () => {
    const net = fakeNetwork();
    const home = aiHome({ ai: { enabled: true }, fetchImpl: net.impl });
    try {
      await home.req('POST', '/api/ai/connections', { kind: 'openrouter', id: 'or' });
      await home.req('POST', '/api/ai/connections', { kind: 'openai-compatible', id: 'or2', baseUrl: 'https://openrouter.ai/api/v1' });
      for (const id of ['or', 'or2']) {
        await home.req('POST', `/api/ai/connections/${id}/consent`, CONSENT);
        await home.req('PUT', `/api/ai/connections/${id}/key`, { key: `sk-or-${id}-0000000000000000` });
      }
      // a provider built for `or` holds on to its fetch (as one mid-run would)
      const held = home.ctx.egress.fetchFor({ purpose: 'ai.test', feature: 'test', model: 'm', connectionId: 'or' });
      assert.equal((await home.req('DELETE', '/api/ai/connections/or/consent')).body.egressHosts.join(), 'openrouter.ai', 'the host stays: or2 still has consent');
      assert.equal((await home.req('POST', '/api/ai/connections/or/test', { model: 'm' })).body.error.code, 'not_consented');
      await assert.rejects(held('https://openrouter.ai/api/v1/models'), (e: unknown) => e instanceof EgressDenied && e.code === 'not_consented', 'refused on its next request, mid-run');
      const other = await home.req('POST', '/api/ai/connections/or2/test', { model: 'm' });
      assert.equal(other.body.ok, true, JSON.stringify(other.body));
      assert.equal(net.calls.length, 1, 'only or2 sent anything');
      assert.equal(home.log().find((e) => e.outcome === 'denied')!.error!.includes('allow it first'), true);
    } finally {
      home.close();
    }
  });

  test('turning AI off takes every AI host off the allow-list at once', async () => {
    const home = aiHome({ ai: { enabled: true, connections: { ollama: { kind: 'ollama', baseUrl: 'http://192.168.1.5:11434' } } } });
    try {
      assert.ok(home.ctx.egress.allowList().includes('192.168.1.5'));
      const off = await home.req('PUT', '/api/ai', { enabled: false });
      assert.deepEqual(off.body.egressHosts, []);
      assert.ok(!home.ctx.egress.allowList().includes('192.168.1.5'));
      // and by hand
      fs.writeFileSync(path.join(home.dir, 'config.yaml'), 'ai:\n  enabled: true\n  connections:\n    o: { kind: ollama, baseUrl: "http://192.168.1.9:11434" }\n');
      assert.ok(home.ctx.egress.allowList().includes('192.168.1.9'));
    } finally {
      home.close();
    }
  });
});
