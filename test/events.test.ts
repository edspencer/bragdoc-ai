// server/events.ts and GET /api/events: the bus, the per-key debounce, and the SSE stream (hello, typed change events
// with ids, the heartbeat), in process and over a real socket. Adapted from Hallway's test/events.test.ts.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import type { ServerEvent } from '../shared/api.ts';
import { EventBus, sseHandler } from '../server/events.ts';
import { createApp, startServer } from '../server/index.ts';
import { rmTmp, tmpDir } from './fixture.ts';

describe('the bus', () => {
  test('emit reaches every subscriber; unsubscribe stops it; a throwing listener is contained', () => {
    const bus = new EventBus();
    const got: ServerEvent[] = [];
    bus.subscribe(() => {
      throw new Error('boom');
    });
    const off = bus.subscribe((e) => got.push(e));
    bus.emit({ type: 'config' });
    off();
    bus.emit({ type: 'config' });
    assert.deepEqual(got, [{ type: 'config' }]);
    assert.equal(bus.size, 1);
  });

  test('emitSoon debounces per key: a burst becomes one event, other keys are separate', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const bus = new EventBus();
    const got: ServerEvent[] = [];
    bus.subscribe((e) => got.push(e));
    for (let i = 0; i < 5; i++) {
      if (i) t.mock.timers.tick(39);
      bus.emitSoon('net', { type: 'network' }, 40);
    }
    bus.emitSoon('cfg', { type: 'config' }, 40);
    t.mock.timers.tick(39);
    assert.deepEqual(got, []);
    t.mock.timers.tick(1);
    assert.deepEqual(got, [{ type: 'network' }, { type: 'config' }]);
    bus.emitSoon('n', { type: 'notices' }, 10_000);
    bus.flush();
    assert.equal(got.length, 3);
  });
});

/** Read an SSE response's frames as they arrive. */
function sseReader(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  return {
    async next(timeout = 2000): Promise<string> {
      const deadline = Date.now() + timeout;
      for (;;) {
        const i = buf.indexOf('\n\n');
        if (i >= 0) {
          const frame = buf.slice(0, i);
          buf = buf.slice(i + 2);
          return frame;
        }
        const left = deadline - Date.now();
        if (left <= 0) throw new Error('no SSE frame in time');
        const r = await Promise.race([reader.read(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('no SSE frame in time')), left))]);
        if (r.done) throw new Error('stream ended');
        buf += dec.decode(r.value, { stream: true });
      }
    },
    cancel: () => reader.cancel(),
  };
}

describe('GET /api/events', () => {
  test('hello, then change events with incrementing ids, then a ping when quiet', async () => {
    const bus = new EventBus();
    const app = new Hono();
    app.get('/api/events', sseHandler(bus, 100));
    const res = await app.request('/api/events');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /^text\/event-stream/);
    const s = sseReader(res);
    assert.match(await s.next(), /^event: hello\ndata: \{"t":\d+\}$/);
    bus.emit({ type: 'config' });
    bus.emit({ type: 'network' });
    assert.equal(await s.next(), 'event: change\ndata: {"type":"config"}\nid: 1');
    assert.equal(await s.next(), 'event: change\ndata: {"type":"network"}\nid: 2');
    assert.equal(await s.next(), ': ping');
    await s.cancel();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(bus.size, 0, 'a closed stream unsubscribes');
  });

  test('through the app: same-origin (or no Origin) streams; a config edit arrives as a change event', async () => {
    const dir = tmpDir('bragdoc-sse-');
    try {
      const app = createApp({ dataDir: dir, webDist: null });
      const res = await app.request('http://localhost:2724/api/events', { headers: { host: 'localhost:2724', origin: 'http://localhost:2724' } });
      assert.equal(res.status, 200);
      const s = sseReader(res);
      assert.match(await s.next(), /^event: hello/);
      fs.writeFileSync(path.join(dir, 'config.yaml'), 'allowedHosts: [x.example]\n');
      await app.request('/api/meta'); // config is re-read on use: this request notices the edit
      assert.equal(await s.next(), 'event: change\ndata: {"type":"config"}\nid: 1');
      await s.cancel();
    } finally {
      rmTmp(dir);
    }
  });

  test('over a real socket, a foreign Host or Origin never gets a stream; closing the server ends open streams', async () => {
    const dir = tmpDir('bragdoc-sse-');
    const { port, close } = await startServer(0, { dataDir: dir, webDist: null });
    try {
      const base = `http://127.0.0.1:${port}/api/events`;
      assert.equal((await fetch(base, { headers: { origin: 'https://evil.example' } })).status, 403);
      const ok = await fetch(base);
      assert.equal(ok.status, 200);
      const s = sseReader(ok);
      assert.match(await s.next(), /^event: hello/);
      const t0 = Date.now();
      await close();
      assert.ok(Date.now() - t0 < 2000, 'an open stream does not hold the server open');
    } finally {
      rmTmp(dir);
    }
  });
});
