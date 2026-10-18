// The AI settings API and config.yaml's `ai:` section (SPEC R17): defaults all off, an upgrade from 0.1 changes nothing
// until you act, connections as a map keyed by id, features validated as a whole, a broken config.yaml never
// overwritten (D53), and a `{ type: 'ai' }` event after each change.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { ServerEvent } from '../shared/api.ts';
import { CONFIG_TEMPLATE, ConfigStore, parseConfig } from '../server/config.ts';
import { aiHome } from './ai-fixture.ts';

test('the starter config.yaml has the ai: section, every value off; it parses to the defaults', () => {
  assert.match(CONFIG_TEMPLATE, /^ai:\n {2}enabled: false/m);
  const r = parseConfig(CONFIG_TEMPLATE);
  assert.ok(r.ok);
  const ai = r.config.ai;
  assert.equal(ai.enabled, false);
  assert.deepEqual(ai.connections, {});
  assert.equal(ai.text, null);
  assert.equal(ai.vision, null);
  assert.deepEqual(ai.features, {
    judge: { enabled: false, screenshots: true, github: false, model: null, when: { onArrival: false, everyHours: null, onlyBetween: null, onlyOnAC: true }, backgroundCloud: false, maxPerRun: 50 },
    tidy: { enabled: false, model: null },
    draft: { enabled: false, model: null },
  });
  assert.equal(r.config.schemaVersion, 1, 'the keys are new and optional: still version 1 (D23)');
});

test('an upgrade from 0.1: a config.yaml without ai: reads as AI off, and stays byte for byte until you change a setting', async () => {
  const v01 = CONFIG_TEMPLATE.slice(0, CONFIG_TEMPLATE.indexOf('\n# AI is off')) + '\n';
  assert.doesNotMatch(v01, /^ai:/m);
  const home = aiHome();
  try {
    const file = path.join(home.dir, 'config.yaml');
    fs.writeFileSync(file, v01);
    const s = (await home.req('GET', '/api/ai')).body;
    assert.equal(s.enabled, false);
    assert.equal(s.readiness.judge.reason, 'ai_off');
    assert.equal(fs.readFileSync(file, 'utf8'), v01, 'reading changed nothing');
    // a non-AI change elsewhere leaves it without an ai: section too
    home.config.update({ mcp: { writeTo: 'found' } });
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /^ai:/m);
    // a 0.1 build reading a 0.2 file: the ai: keys are unknown to it and stripped on read, never an error
    assert.ok(parseConfig(CONFIG_TEMPLATE).ok);
  } finally {
    home.close();
  }
});

test('connections: ids from the kind, a map in config.yaml, edits and removal', async () => {
  const home = aiHome();
  try {
    const events: ServerEvent[] = [];
    home.bus.subscribe((e) => events.push(e));
    const a = await home.req('POST', '/api/ai/connections', { kind: 'ollama' });
    const b = await home.req('POST', '/api/ai/connections', { kind: 'ollama', baseUrl: 'http://127.0.0.1:11500', contextTokens: 16384, name: 'Shared runner' });
    assert.deepEqual([a.status, a.body.connection.id, b.body.connection.id], [201, 'ollama', 'ollama-2']);
    assert.deepEqual([a.body.connection.baseUrl, a.body.connection.contextTokens], ['http://127.0.0.1:11434', 8192], 'the preset and the default context');
    assert.deepEqual([b.body.connection.name, b.body.connection.contextTokens], ['Shared runner', 16384]);
    assert.ok(events.some((e) => e.type === 'ai'), 'open tabs hear about it');
    assert.equal((await home.req('POST', '/api/ai/connections', { kind: 'ollama', id: 'ollama' })).body.error.code, 'exists');
    assert.equal((await home.req('POST', '/api/ai/connections', { kind: 'ollama', id: 'Bad Id' })).status, 400);
    assert.equal((await home.req('POST', '/api/ai/connections', { kind: 'openai-compatible' })).status, 400, 'a custom server needs its address');
    assert.equal((await home.req('POST', '/api/ai/connections', { kind: 'jev' })).status, 400, 'Jev needs its OpenRouter connection');
    assert.equal((await home.req('POST', '/api/ai/connections', { kind: 'ollama', via: 'x' })).status, 400);
    assert.equal((await home.req('POST', '/api/ai/connections', { kind: 'telepathy' })).status, 400);
    const yaml = fs.readFileSync(path.join(home.dir, 'config.yaml'), 'utf8');
    assert.match(yaml, /connections:\n {4}ollama:\n {6}kind: ollama\n {4}ollama-2:/, 'a map keyed by id');

    // pick a model, give the judge its own, then remove the connection: both slots let go of it
    await home.req('PUT', '/api/ai', { text: { connection: 'ollama-2', model: 'qwen3.5:4b' } });
    await home.req('PUT', '/api/ai/features/judge', { model: { connection: 'ollama-2', model: 'gemma4:e4b' } });
    assert.equal((await home.req('PUT', '/api/ai', { text: { connection: 'nope', model: 'm' } })).status, 400);
    const edited = await home.req('PUT', '/api/ai/connections/ollama-2', { name: null, contextTokens: 4096 });
    assert.deepEqual([edited.body.connections[1].name, edited.body.connections[1].contextTokens], [null, 4096]);
    assert.equal((await home.req('PUT', '/api/ai/connections/ollama-2', { kind: 'openai' })).status, 400, 'the kind never changes');
    const gone = await home.req('DELETE', '/api/ai/connections/ollama-2');
    assert.deepEqual(gone.body.connections.map((c: { id: string }) => c.id), ['ollama']);
    assert.equal(gone.body.text, null);
    assert.equal(gone.body.features.judge.model, null);
    assert.equal((await home.req('DELETE', '/api/ai/connections/ollama-2')).status, 404);
  } finally {
    home.close();
  }
});

test('two tabs editing different connections: both edits survive (a map, merged on the file as it is)', async () => {
  const home = aiHome({ ai: { connections: { a: { kind: 'ollama' }, b: { kind: 'lmstudio' } } } });
  try {
    // two ConfigStores, as two requests racing would each see the file
    const other = new ConfigStore(home.dir);
    other.load();
    await home.req('PUT', '/api/ai/connections/a', { name: 'First' });
    other.update({ ai: { connections: { b: { name: 'Second' } } } });
    const s = (await home.req('GET', '/api/ai')).body;
    assert.deepEqual(s.connections.map((c: { name: string }) => c.name), ['First', 'Second']);
  } finally {
    home.close();
  }
});

test('features: a merge patch, validated as the whole feature; unknown settings and bad values are 400', async () => {
  const home = aiHome({ ai: { connections: { o: { kind: 'ollama' } } } });
  try {
    const r = await home.req('PUT', '/api/ai/features/judge', { enabled: true, when: { onlyBetween: { from: '19:00', to: '08:00' } } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.features.judge.when, { onArrival: false, everyHours: null, onlyBetween: { from: '19:00', to: '08:00' }, onlyOnAC: true });
    assert.equal(r.body.features.tidy.enabled, false, 'one feature on turns no other on');
    const bad: [string, unknown][] = [
      ['judge', { maxPerRun: 0 }],
      ['judge', { when: { everyHours: 2 } }],
      ['judge', { when: { onlyBetween: { from: '25:00', to: '08:00' } } }],
      ['judge', { surprise: true }],
      ['tidy', { github: true }],
      ['tidy', { model: { connection: 'nope', model: 'm' } }],
      ['tidy', { enabled: 'yes' }],
    ];
    for (const [f, body] of bad) assert.equal((await home.req('PUT', `/api/ai/features/${f}`, body)).status, 400, JSON.stringify(body));
    assert.equal((await home.req('PUT', '/api/ai/features/vision', { enabled: true })).status, 404);
    // null clears a setting back to its default
    const cleared = await home.req('PUT', '/api/ai/features/judge', { when: { onlyBetween: null } });
    assert.equal(cleared.body.features.judge.when.onlyBetween, null);
  } finally {
    home.close();
  }
});

test('a broken config.yaml: every AI write is 409 config_invalid and the file is never overwritten', async () => {
  const home = aiHome();
  try {
    const file = path.join(home.dir, 'config.yaml');
    const broken = 'ai:\n  enabled: [true\n';
    fs.writeFileSync(file, broken);
    for (const [m, p, b] of [
      ['PUT', '/api/ai', { enabled: true }],
      ['POST', '/api/ai/connections', { kind: 'ollama' }],
      ['PUT', '/api/ai/features/tidy', { enabled: true }],
    ] as const) {
      const r = await home.req(m, p, b);
      assert.equal(r.status, 409, p);
      assert.equal(r.body.error.code, 'config_invalid');
    }
    assert.equal(fs.readFileSync(file, 'utf8'), broken);
    assert.equal((await home.req('GET', '/api/ai')).body.enabled, false, 'the last good settings (AI off)');
  } finally {
    home.close();
  }
});

test('requests are checked strictly: unknown keys and bad JSON are 400', async () => {
  const home = aiHome();
  try {
    assert.equal((await home.req('PUT', '/api/ai', { enabled: true, extra: 1 })).status, 400);
    assert.equal((await home.req('PUT', '/api/ai', { enabled: 'yes' })).status, 400);
    const raw = await home.app.request('/api/ai', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{not json' });
    assert.equal(raw.status, 400);
    assert.equal((await home.req('POST', '/api/ai/connections/nope/consent', { version: 1 })).status, 404);
  } finally {
    home.close();
  }
});
