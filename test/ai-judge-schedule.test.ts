// When the judge runs by itself (SPEC R22, PR25; D75–D77): the schedule on a fake clock, against the fake model server
// (never a real model) and a fake OCR. Turning the judge on starts nothing; arrivals are gathered into one run; the
// window (across midnight), the power (battery waits, unknown runs), the cloud tick, the backoff, and a run that stops
// after the item in progress when its conditions stop holding. Also: the power readings, the agreement counts, and
// "Dismiss these N" with its Undo.
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ConfigStore } from '../server/config.ts';
import { Egress } from '../server/egress.ts';
import { EventBus } from '../server/events.ts';
import { initHome } from '../server/home.ts';
import { createAppWithContext } from '../server/index.ts';
import { readActivity } from '../server/ai/activity.ts';
import { backoffMs, inWindow, windowOpens, type Clock } from '../server/ai/judge/schedule.ts';
import type { Ocr, OcrResult } from '../server/ocr/index.ts';
import { onAC, parsePmset, readSysPower, type PowerState } from '../server/platform/power.ts';
import { ALLOWED_BINS } from '../server/proc.ts';
import { startFakeLlm } from './fixtures/fake-llm/server.ts';
import { aiHome, CONSENT, fakeNetwork } from './ai-fixture.ts';
import { rmTmp, tmpDir } from './fixture.ts';

const ROOTS: string[] = [];
after(() => ROOTS.forEach(rmTmp));

const PRAISE = (n: number) => `Jordan Kim 9:10 AM\nAmazing work Alex, p95 is down ${n}% since the batching went out.`;
const quoteOf = (n: number) => `Amazing work Alex, p95 is down ${n}% since the batching went out.`;

/** A clock the test moves by hand: timers fire in order as it advances, with the promises they start let run. */
function fakeClock(start: Date): Clock & { advance(ms: number): Promise<void>; set(d: Date): Promise<void> } {
  let t = start.getTime();
  let n = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const settle = async () => {
    for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
  };
  const c = {
    now: () => t,
    setTimeout(fn: () => void, ms: number) {
      timers.set(++n, { at: t + ms, fn });
      return n;
    },
    clearTimeout(h: unknown) {
      timers.delete(h as number);
    },
    async advance(ms: number) {
      const end = t + ms;
      for (;;) {
        const next = [...timers].filter(([, x]) => x.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]);
        t = Math.max(t, next[1].at);
        next[1].fn();
        await settle();
      }
      t = end;
      await settle();
    },
    set: (d: Date) => c.advance(d.getTime() - t),
  };
  return c;
}

function fakeOcr(texts: Map<string, string>): Ocr {
  return {
    async read(input: { bytes: Uint8Array } | { path: string }): Promise<OcrResult> {
      const bytes = 'bytes' in input ? input.bytes : new Uint8Array(fs.readFileSync(input.path));
      const sha = crypto.createHash('sha256').update(bytes).digest('hex');
      return { engine: 'tesseract', text: texts.get(sha) ?? '', sha256: sha, ms: 1, cached: false, skipped: [] };
    },
    async engines() {
      return [{ name: 'tesseract' as const, ok: true }];
    },
    queued: () => 0,
    async close() {},
  };
}

async function rig({ when = {}, judge = {}, start = new Date(2026, 9, 18, 12, 0), scenario, slowMs }: { when?: Record<string, unknown>; judge?: Record<string, unknown>; start?: Date; scenario?: string; slowMs?: number } = {}) {
  const fake = await startFakeLlm({ ...(scenario ? { scenario: scenario as never } : {}), ...(slowMs ? { slowMs } : {}) });
  const root = tmpDir('bragdoc-sched-');
  ROOTS.push(root);
  const dir = path.join(root, '.bragdoc');
  initHome(dir);
  fs.writeFileSync(path.join(dir, 'profile.yaml'), 'name: Alex Marlowe\naliases: [Alex]\n');
  const bus = new EventBus();
  const config = new ConfigStore(dir, { onChange: () => bus.emit({ type: 'config' }) });
  config.load();
  config.update({ ai: { enabled: true, connections: { local: { kind: 'ollama', baseUrl: fake.url } }, features: { judge: { enabled: true, model: { connection: 'local', model: 'qwen3.5:4b' }, ...judge, when } } } });
  const texts = new Map<string, string>();
  const clock = fakeClock(start);
  const pw = { state: 'ac' as PowerState };
  const egress = new Egress({ dataDir: dir, config: () => config.get() });
  const { app, ctx } = createAppWithContext({ dataDir: dir, webDist: null, config, bus, egress, ocr: fakeOcr(texts), scheduleClock: clock, power: async () => pw.state });
  let n = 0;
  const stop = ctx.judgeSchedule.start();
  await clock.advance(0);
  return {
    dir,
    app,
    ctx,
    config,
    fake,
    clock,
    pw,
    shot() {
      const i = ++n;
      const bytes = Buffer.from(`picture ${i}`);
      const sha = crypto.createHash('sha256').update(bytes).digest('hex');
      const file = path.join(root, `shot-${i}.png`);
      fs.writeFileSync(file, bytes);
      texts.set(sha, PRAISE(i));
      return ctx.services.found.add({ source: 'screenshots', externalKey: `screenshot:${sha}`, title: `Praise ${i}`, quote: { text: quoteOf(i), from: 'Jordan Kim' }, files: [{ path: file, title: `shot-${i}.png` }], matchedRules: ['Says your name: "Alex"'] }).candidate!;
    },
    /** The judge's runs in the activity log, newest first. */
    runs: () => readActivity(dir).entries.filter((e) => e.feature === 'judge'),
    judged: () => ctx.services.found.list().filter((c) => c.verdict).length,
    async req(method: string, p: string, body?: unknown) {
      const res = await app.request(p, { method, headers: { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      const t = await res.text();
      return { status: res.status, body: t ? JSON.parse(t) : null };
    },
    /** Wait (in real time) for the run the schedule started to end. */
    async settle() {
      for (let i = 0; i < 200 && ctx.judge.status().running; i++) await new Promise((r) => setTimeout(r, 20));
      await ctx.judgeSchedule.idle();
    },
    async close() {
      stop();
      ctx.judge.cancel();
      await ctx.judge.idle();
      ctx.judge.close();
      await fake.close();
    },
  };
}

describe('the window and the backoff (pure)', () => {
  test('a window across midnight, and when it opens next', () => {
    const w = { from: '19:00', to: '08:00' };
    assert.equal(inWindow(new Date(2026, 9, 18, 18, 59), w), false);
    assert.equal(inWindow(new Date(2026, 9, 18, 19, 0), w), true);
    assert.equal(inWindow(new Date(2026, 9, 19, 2, 30), w), true);
    assert.equal(inWindow(new Date(2026, 9, 19, 8, 0), w), false);
    assert.equal(inWindow(new Date(2026, 9, 19, 12, 0), { from: '09:00', to: '17:00' }), true);
    assert.equal(inWindow(new Date(2026, 9, 19, 17, 0), { from: '09:00', to: '17:00' }), false);
    assert.equal(inWindow(new Date(2026, 9, 19, 3, 0), { from: '10:00', to: '10:00' }), true, 'from = to: all day');
    assert.deepEqual(windowOpens(new Date(2026, 9, 18, 18, 58), w), new Date(2026, 9, 18, 19, 0));
    assert.deepEqual(windowOpens(new Date(2026, 9, 19, 9, 0), w), new Date(2026, 9, 19, 19, 0));
    assert.deepEqual(windowOpens(new Date(2026, 9, 19, 20, 0), w), new Date(2026, 9, 20, 19, 0));
  });

  test('the backoff: 15 minutes, doubling, at most 6 hours', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((f) => backoffMs(f) / 60_000), [15, 30, 60, 120, 240, 360, 360]);
  });
});

describe('power', () => {
  const sys = (supplies: Record<string, Record<string, string>>) => {
    const d = tmpDir('bragdoc-power-');
    ROOTS.push(d);
    for (const [name, files] of Object.entries(supplies)) {
      fs.mkdirSync(path.join(d, name));
      for (const [f, v] of Object.entries(files)) fs.writeFileSync(path.join(d, name, f), `${v}\n`);
    }
    return d;
  };

  test('macOS: pmset -g batt', () => {
    assert.equal(parsePmset("Now drawing from 'AC Power'\n -InternalBattery-0 (id=1234)\t100%; charged; 0:00 remaining present: true\n"), 'ac');
    assert.equal(parsePmset("Now drawing from 'Battery Power'\n -InternalBattery-0 (id=1234)\t81%; discharging; 4:12 remaining present: true\n"), 'battery');
    assert.equal(parsePmset("Now drawing from 'UPS Power'\n"), 'unknown');
    assert.equal(parsePmset(''), 'unknown');
  });

  test('Linux: /sys/class/power_supply', () => {
    // a laptop, plugged in / unplugged
    assert.equal(readSysPower(sys({ AC: { type: 'Mains', online: '1' }, BAT0: { type: 'Battery', status: 'Charging' } })), 'ac');
    assert.equal(readSysPower(sys({ AC: { type: 'Mains', online: '0' }, BAT0: { type: 'Battery', status: 'Discharging' } })), 'battery');
    // USB-C charging
    assert.equal(readSysPower(sys({ ucsi: { type: 'USB', online: '1' }, BAT0: { type: 'Battery', status: 'Charging' } })), 'ac');
    // a battery and no supply to ask: its status says
    assert.equal(readSysPower(sys({ BAT0: { type: 'Battery', status: 'Discharging' } })), 'battery');
    assert.equal(readSysPower(sys({ BAT0: { type: 'Battery', status: 'Full' } })), 'ac');
    // a desktop with a wireless mouse: the mouse's battery isn't the computer's
    assert.equal(readSysPower(sys({ hidpp_battery_0: { type: 'Battery', scope: 'Device', status: 'Discharging' } })), 'unknown');
    // nothing at all (a container), or no such folder
    assert.equal(readSysPower(sys({})), 'unknown');
    assert.equal(readSysPower('/nonexistent/power_supply'), 'unknown');
  });

  test('onAC: pmset only on macOS (absent → unknown), the folder on Linux, unknown elsewhere', async () => {
    assert.ok((ALLOWED_BINS as readonly string[]).includes('pmset'));
    const empty = tmpDir('bragdoc-nopmset-');
    ROOTS.push(empty);
    assert.equal(await onAC({ platform: 'darwin', env: { PATH: empty } }), 'unknown', 'no pmset on PATH');
    // a fake pmset on PATH answers on battery
    fs.writeFileSync(path.join(empty, 'pmset'), "#!/bin/sh\necho \"Now drawing from 'Battery Power'\"\n", { mode: 0o755 });
    assert.equal(await onAC({ platform: 'darwin', env: { PATH: empty } }), 'battery');
    assert.equal(await onAC({ platform: 'linux', sysDir: sys({ AC: { type: 'Mains', online: '1' } }) }), 'ac');
    assert.equal(await onAC({ platform: 'linux', env: { BRAGDOC_POWER_SUPPLY_DIR: sys({ AC: { type: 'Mains', online: '0' }, BAT0: { type: 'Battery', status: 'Discharging' } }) } }), 'battery');
    assert.equal(await onAC({ platform: 'win32' }), 'unknown');
  });
});

describe('the schedule', () => {
  test('turning the judge on starts no background run: candidates wait for Judge now', async () => {
    const r = await rig();
    try {
      for (let i = 0; i < 3; i++) r.shot();
      await r.clock.advance(3 * 60 * 60 * 1000);
      assert.equal(r.runs().length, 0);
      assert.equal(r.judged(), 0);
      assert.equal(r.fake.requests.filter((q) => q.path.endsWith('/api/chat')).length, 0, 'nothing was sent');
      const st = (await r.req('GET', '/api/ai/judge/status')).body;
      assert.deepEqual([st.schedule.background, st.schedule.hold.code, st.waiting], [false, 'off', 3]);
    } finally {
      await r.close();
    }
  });

  test('as they arrive: 5 arrivals → 1 run, 30 s after the last', async () => {
    const r = await rig({ when: { onArrival: true } });
    try {
      for (let i = 0; i < 5; i++) {
        r.shot();
        await r.clock.advance(5_000);
      }
      assert.equal(r.runs().length, 0, 'still gathering');
      assert.equal(r.ctx.judgeSchedule.status().arrivalsWaiting, true);
      await r.clock.advance(30_000);
      await r.settle();
      const runs = r.runs();
      assert.deepEqual([runs.length, runs[0]!.trigger, runs[0]!.counts], [1, 'arrival', { win: 5 }]);
      assert.equal(r.ctx.services.found.list().filter((c) => c.status === 'pending').length, 5, 'the judge keeps and dismisses nothing');
      // the verdicts it wrote are store changes too, but not arrivals: no second run
      await r.clock.advance(10 * 60_000);
      await r.settle();
      assert.equal(r.runs().length, 1);
      // an Undo brings a candidate back: not an arrival either
      const one = r.ctx.services.found.list()[0]!;
      r.ctx.services.found.dismiss(one.id);
      r.ctx.services.found.undo(one.id);
      await r.clock.advance(60_000);
      assert.equal(r.runs().length, 1);
    } finally {
      await r.close();
    }
  });

  test('only between, across midnight: an arrival at 18:58 waits for 19:00', async () => {
    const r = await rig({ when: { onArrival: true, onlyBetween: { from: '19:00', to: '08:00' } }, start: new Date(2026, 9, 18, 18, 58) });
    try {
      r.shot();
      await r.clock.advance(45_000);
      const st = (await r.req('GET', '/api/ai/judge/status')).body.schedule;
      assert.equal(st.hold.code, 'window');
      assert.equal(st.hold.until, new Date(2026, 9, 18, 19, 0).toISOString());
      assert.equal(st.arrivalsWaiting, true);
      assert.equal(r.runs().length, 0);
      await r.clock.set(new Date(2026, 9, 18, 19, 0, 31));
      await r.settle();
      assert.deepEqual(r.runs().map((x) => x.trigger), ['arrival']);
    } finally {
      await r.close();
    }
  });

  test('every N hours, with the window: the run waits for it, then the next is N hours on', async () => {
    const r = await rig({ when: { everyHours: 3, onlyBetween: { from: '13:00', to: '14:00' } } });
    try {
      r.shot();
      await r.clock.advance(30 * 60_000);
      assert.equal(r.runs().length, 0, 'outside the window');
      await r.clock.set(new Date(2026, 9, 18, 13, 1));
      await r.settle();
      assert.deepEqual(r.runs().map((x) => x.trigger), ['schedule']);
      const next = r.ctx.judgeSchedule.status().nextRunAt!;
      assert.ok(Date.parse(next) - r.clock.now() > 2.9 * 60 * 60_000, 'the next one is about 3 hours on');
    } finally {
      await r.close();
    }
  });

  test('on battery it waits; plugged in it runs; unknown counts as plugged in', async () => {
    const r = await rig({ when: { onArrival: true } });
    try {
      r.pw.state = 'battery';
      await r.clock.advance(30_000); // a tick reads the power
      r.shot();
      await r.clock.advance(60_000);
      const st = (await r.req('GET', '/api/ai/judge/status')).body.schedule;
      assert.deepEqual([st.power, st.hold.code], ['battery', 'battery']);
      assert.equal(r.runs().length, 0);
      // Judge now ignores the conditions: you asked
      assert.equal((await r.req('POST', '/api/ai/judge/run', {})).status, 202);
      await r.settle();
      assert.deepEqual(r.runs().map((x) => x.trigger), ['now']);
      r.shot();
      r.pw.state = 'unknown';
      await r.clock.advance(60_000);
      await r.settle();
      assert.deepEqual(r.runs().map((x) => x.trigger), ['arrival', 'now'], 'newest first');
    } finally {
      await r.close();
    }
  });

  test('"only on power" unticked: battery doesn\'t hold it', async () => {
    const r = await rig({ when: { onArrival: true, onlyOnAC: false } });
    try {
      r.pw.state = 'battery';
      r.shot();
      await r.clock.advance(60_000);
      await r.settle();
      assert.equal(r.runs().length, 1);
    } finally {
      await r.close();
    }
  });

  test('unplugged mid-run: it stops after the item in progress, and the rest wait', async () => {
    const r = await rig({ when: { onArrival: true }, scenario: 'slow', slowMs: 300 });
    try {
      for (let i = 0; i < 4; i++) r.shot();
      await r.clock.advance(31_000);
      assert.ok(r.ctx.judge.status().running, 'a run started');
      // wait until it's on its second item, then pull the plug
      for (let i = 0; i < 200 && (r.ctx.judge.status().running?.done ?? 0) < 1; i++) await new Promise((x) => setTimeout(x, 10));
      r.pw.state = 'battery';
      await r.clock.advance(5_000); // the run's own power check: no tick needed
      await r.settle();
      const run = r.runs()[0]!;
      assert.equal(run.outcome, 'cancelled');
      assert.equal(run.error, 'battery');
      const judged = r.judged();
      assert.ok(judged >= 1 && judged <= 2, `it judged the item in progress and stopped (${judged})`);
      assert.equal(r.ctx.judgeSchedule.status().hold?.code, 'battery');
      // plugged back in, the rest are judged (they were arrivals held back)
      r.pw.state = 'ac';
      await r.clock.advance(30_000);
      await r.settle();
      assert.equal(r.judged(), 4);
    } finally {
      await r.close();
    }
  });

  test('AI switched off mid-run: nothing more is written', async () => {
    const r = await rig({ when: { onArrival: true }, scenario: 'slow', slowMs: 300 });
    try {
      for (let i = 0; i < 4; i++) r.shot();
      await r.clock.advance(31_000);
      for (let i = 0; i < 200 && (r.ctx.judge.status().running?.done ?? 0) < 1; i++) await new Promise((x) => setTimeout(x, 10));
      r.config.update({ ai: { enabled: false } });
      const at = r.judged();
      await r.settle();
      assert.equal(r.judged(), at, 'no verdict written after AI went off');
      await r.clock.advance(60 * 60_000);
      assert.equal(r.runs().length, 1, 'and no new run');
      assert.equal(r.ctx.judgeSchedule.status().hold?.code, 'not-ready');
    } finally {
      await r.close();
    }
  });

  test('the runner down: the run fails, background runs back off (15 min, then 30), and a good run clears it', async () => {
    const r = await rig({ when: { everyHours: 1 }, scenario: 'down' });
    try {
      r.shot();
      await r.clock.advance(30_000);
      await r.settle();
      let st = r.ctx.judgeSchedule.status();
      assert.equal(r.runs()[0]!.error, 'unreachable');
      assert.equal(st.backoff?.failures, 1);
      assert.equal(Date.parse(st.backoff!.until) - r.clock.now(), 15 * 60_000);
      assert.equal(st.lastRun?.error, 'unreachable');
      // state survives a restart: it's in cache/ai/judge.json
      const saved = JSON.parse(fs.readFileSync(path.join(r.dir, 'cache', 'ai', 'judge.json'), 'utf8'));
      assert.equal(saved.failures, 1);
      // the hour comes round, but the backoff holds it… then it tries again, fails again: 30 minutes
      await r.clock.advance(60 * 60_000 + 30_000);
      await r.settle();
      st = r.ctx.judgeSchedule.status();
      assert.equal(r.runs().length, 2);
      assert.equal(st.backoff?.failures, 2);
      const left = Date.parse(st.backoff!.until) - r.clock.now();
      assert.ok(left <= 30 * 60_000 && left > 29 * 60_000, `30 minutes (${left})`);
    } finally {
      await r.close();
    }
  });

  test('a good run after failures clears the backoff', async () => {
    const r = await rig({ when: { everyHours: 1 } });
    try {
      r.config.update({ ai: { connections: { local: { baseUrl: `${r.fake.url}/s/down` } } } });
      r.shot();
      await r.clock.advance(30_000);
      await r.settle();
      assert.equal(r.ctx.judgeSchedule.status().backoff?.failures, 1);
      assert.equal(r.ctx.judgeSchedule.status().hold?.code, 'backoff');
      r.config.update({ ai: { connections: { local: { baseUrl: r.fake.url } } } });
      assert.equal((await r.req('POST', '/api/ai/judge/run', {})).status, 202, 'Judge now ignores the backoff');
      await r.settle();
      assert.equal(r.ctx.judgeSchedule.status().backoff, null);
      assert.equal(r.judged(), 1);
    } finally {
      await r.close();
    }
  });

  test('switching background judging off forgets gathered arrivals, and stops a background run', async () => {
    const r = await rig({ when: { onArrival: true } });
    try {
      r.shot();
      await r.clock.advance(5_000);
      r.config.update({ ai: { features: { judge: { when: { onArrival: false } } } } });
      await r.clock.advance(5 * 60_000);
      assert.equal(r.runs().length, 0);
      assert.equal(r.ctx.judgeSchedule.status().arrivalsWaiting, false);
    } finally {
      await r.close();
    }
  });

  test('arrivals while AI is off are never gathered: switching it back on starts nothing', async () => {
    const r = await rig({ when: { onArrival: true } });
    try {
      r.config.update({ ai: { enabled: false } });
      for (let i = 0; i < 3; i++) r.shot();
      await r.clock.advance(60_000);
      assert.equal(r.ctx.judgeSchedule.status().arrivalsWaiting, false);
      r.config.update({ ai: { enabled: true } });
      await r.clock.advance(10 * 60_000);
      assert.equal(r.runs().length, 0);
      assert.equal(r.ctx.judge.status().waiting, 3, 'they wait for Judge now');
    } finally {
      await r.close();
    }
  });

  test('60 waiting with maxPerRun 50: one run takes 50, newest first', async () => {
    const r = await rig({ when: { everyHours: 1 } });
    try {
      for (let i = 0; i < 60; i++) r.shot();
      await r.clock.advance(30_000);
      await r.settle();
      const run = r.runs()[0]!;
      assert.equal(run.items, 50);
      assert.equal(r.judged(), 50);
      assert.equal(r.ctx.judge.status().waiting, 10);
    } finally {
      await r.close();
    }
  });
});

describe('a cloud model', () => {
  test('without "also in the background" there is no background run, and Judge now still works', async () => {
    const answer = { keep: true, confidence: 0.9, quote: '', from: '', why: 'Specific praise for your work.', projects: [] };
    const net = fakeNetwork((u, b) => {
      const json = (v: unknown) => new Response(JSON.stringify(v), { status: 200, headers: { 'content-type': 'application/json' } });
      return json({ id: 'c1', object: 'chat.completion', created: 0, model: b?.model, choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(answer) }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 3 } });
    });
    const h = aiHome({ ai: { enabled: true }, fetchImpl: net.impl });
    const clock = fakeClock(new Date(2026, 9, 18, 12, 0));
    // the same app, with the fake clock and power
    const { ctx, app } = createAppWithContext({ dataDir: h.dir, webDist: null, config: h.config, bus: h.bus, egress: (h.ctx as unknown as { egress: Egress }).egress, scheduleClock: clock, power: async () => 'ac' });
    const req = async (method: string, p: string, body?: unknown) => {
      const res = await app.request(p, { method, headers: { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      const t = await res.text();
      return { status: res.status, body: t ? JSON.parse(t) : null };
    };
    const stop = ctx.judgeSchedule.start();
    try {
      fs.writeFileSync(path.join(h.dir, 'profile.yaml'), 'name: Alex Marlowe\naliases: [Alex]\n');
      assert.equal((await req('POST', '/api/ai/connections', { kind: 'openrouter' })).status, 201);
      assert.equal((await req('POST', '/api/ai/connections/openrouter/consent', CONSENT)).status, 200);
      assert.equal((await req('PUT', '/api/ai/connections/openrouter/key', { key: 'sk-or-test-0000' })).status, 200);
      assert.equal((await req('PUT', '/api/ai/features/judge', { enabled: true, model: { connection: 'openrouter', model: 'google/gemini-flash' }, when: { onArrival: true } })).status, 200);
      await clock.advance(0);
      ctx.services.found.add({ source: 'screenshots', externalKey: `screenshot:${'a'.repeat(64)}`, title: 'Praise', quote: { text: 'Amazing work Alex on the ledger.', from: 'Jordan Kim' }, files: [], matchedRules: ['Says your name'] });
      await clock.advance(5 * 60_000);
      const st = (await req('GET', '/api/ai/judge/status')).body.schedule;
      assert.deepEqual([st.cloud, st.hold.code], [true, 'cloud']);
      assert.equal(net.calls.length, 0, 'nothing sent in the background');
      // Judge now still works
      assert.equal((await req('POST', '/api/ai/judge/run', {})).status, 202);
      await ctx.judge.idle();
      assert.equal(net.calls.length, 1);
      // the extra tick: now arrivals go in the background too
      assert.equal((await req('PUT', '/api/ai/features/judge', { backgroundCloud: true })).status, 200);
      ctx.services.found.add({ source: 'screenshots', externalKey: `screenshot:${'b'.repeat(64)}`, title: 'Praise 2', quote: { text: 'Amazing work Alex on the batching.', from: 'Jordan Kim' }, files: [], matchedRules: ['Says your name'] });
      await clock.advance(31_000);
      await ctx.judgeSchedule.idle();
      await ctx.judge.idle();
      assert.equal(net.calls.length, 2);
    } finally {
      stop();
      ctx.judge.close();
      h.close();
    }
  });
});

describe('agreement, and Dismiss these N', () => {
  test('a keep or dismiss of a judged candidate counts; Undo takes it back; an unjudged one never counts', async () => {
    const r = await rig();
    try {
      const a = r.shot();
      const b = r.shot();
      const c = r.shot();
      const d = r.shot();
      await r.ctx.judge.judgePending({ trigger: 'now' });
      // make b and c "probably not"
      for (const x of [b, c]) r.ctx.services.found.setVerdict(x.id, { ...r.ctx.services.found.get(x.id).verdict!, keep: false });
      const unjudged = r.shot();
      assert.equal((await r.req('POST', `/api/found/${a.id}/keep`, {})).status, 200); // agrees (a win, kept)
      assert.equal((await r.req('POST', `/api/found/${d.id}/dismiss`)).status, 200); // disagrees (a win, dismissed)
      assert.equal((await r.req('POST', `/api/found/${unjudged.id}/dismiss`)).status, 200); // no verdict: not counted
      let st = (await r.req('GET', '/api/ai/judge/status')).body;
      assert.deepEqual(st.agreement, { agreed: 1, of: 2 });
      // Dismiss these N: both "probably not" in one request: two more agreements
      const bulk = await r.req('POST', '/api/found/dismiss', { ids: [b.id, c.id] });
      assert.equal(bulk.status, 200);
      assert.deepEqual(bulk.body, { done: [b.id, c.id], skipped: [] });
      assert.deepEqual(r.ctx.judgeStats.get(), { agreed: 3, of: 4 });
      for (const x of [b, c]) assert.ok(!r.ctx.services.found.get(x.id).verdict, 'a dismissed one keeps no verdict');
      // Undo brings them all back, verdicts and all, and the counts go back down
      const undo = await r.req('POST', '/api/found/undo', { ids: [b.id, c.id] });
      assert.deepEqual(undo.body.done, [b.id, c.id]);
      for (const x of [b, c]) {
        const back = r.ctx.services.found.get(x.id);
        assert.deepEqual([back.status, back.verdict?.keep], ['pending', false]);
      }
      assert.deepEqual(r.ctx.judgeStats.get(), { agreed: 1, of: 2 });
      // counts only, on disk
      const file = fs.readFileSync(path.join(r.dir, 'cache', 'ai', 'judge-stats.json'), 'utf8');
      assert.deepEqual(JSON.parse(file), { agreed: 1, of: 2 });
      // one decided meanwhile is skipped, the rest still go
      st = (await r.req('POST', '/api/found/dismiss', { ids: [b.id, a.id, 'nope'] })).body;
      assert.deepEqual(st.done, [b.id]);
      assert.deepEqual(st.skipped.map((s: { id: string }) => s.id), [a.id, 'nope']);
      // bad bodies
      assert.equal((await r.req('POST', '/api/found/dismiss', {})).status, 400);
      assert.equal((await r.req('POST', '/api/found/dismiss', { ids: [] })).status, 400);
      assert.equal((await r.req('POST', '/api/found/dismiss', { ids: Array.from({ length: 501 }, (_, i) => `x${i}`) })).status, 400);
    } finally {
      await r.close();
    }
  });

  test('Keep takes the union of the rules\' and the judge\'s suggested projects', async () => {
    const r = await rig();
    try {
      const p1 = r.ctx.services.projects.create({ name: 'Ledger', color: '#3366ff' });
      const p2 = r.ctx.services.projects.create({ name: 'Billing', color: '#33aa66' });
      const c = r.shot();
      r.ctx.store.write('found', c.id, () => ({ patch: { suggestedProjects: [p1.id] } }), { mustExist: true });
      r.ctx.services.found.setVerdict(c.id, { keep: true, confidence: 0.8, why: 'x', suggestedProjects: [p2.id, p1.id], by: 'm on this computer', at: new Date().toISOString() } as never);
      const k = await r.req('POST', `/api/found/${c.id}/keep`, {});
      const ach = r.ctx.store.get('achievement', k.body.achievementId)!;
      assert.deepEqual(ach.projects, [p1.id, p2.id]);
    } finally {
      await r.close();
    }
  });
});
