// Jev as the judge's model (SPEC R21, R25; D82). Never a real call: the cloud paths answer through an injected egress
// fetchImpl, with a response recorded from the real endpoint (fixtures/jev/systemone-answer.json), and the end-to-end
// runs go to the fake model server's /systemone. Covered: the adapter (boolean → noul on the wire, the answer back),
// what's sent (no path, id or local URL; no prose asked for), the verdict (no why, quote or from; confidence either
// way), Jev's own consent (declined, revoked, the OpenRouter one revoked, its OpenRouter connection deleted), where
// Jev may be used, the Test button and models list, and the unhappy paths: a refused key, rate limiting, the endpoint
// down, malformed answers.
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { ConfigStore } from '../server/config.ts';
import { Egress, readNetworkLog } from '../server/egress.ts';
import { EventBus } from '../server/events.ts';
import { initHome } from '../server/home.ts';
import { createAppWithContext } from '../server/index.ts';
import { jevModel, decide } from '../server/ai/decide.ts';
import { checkAnswer, jevAnswer } from '../server/ai/judge/index.ts';
import { JEV_NO_PROJECT, jevPreview, judgeJevRequest } from '../server/ai/prompts/judge-jev.ts';
import { DEFAULT_GUIDANCE } from '../server/ai/prompts/judge-screenshot.ts';
import { readActivity } from '../server/ai/activity.ts';
import { JEV_MODEL } from '../shared/ai/connections.ts';
import { consentStatement } from '../shared/ai/consent.ts';
import { probabilityOnly } from '../shared/judge.ts';
import { chipLabel } from '../src/settings/ai/words.ts';
import { aiHome, fakeNetwork, withoutGlobalFetch } from './ai-fixture.ts';
import { startFakeLlm } from './fixtures/fake-llm/server.ts';
import { rmTmp, tmpDir } from './fixture.ts';

const RECORDED = JSON.parse(fs.readFileSync(new URL('./fixtures/jev/systemone-answer.json', import.meta.url), 'utf8'));
const KEY = 'sk-or-v1-test-0000000000000000000000000000wxyz';
const PROFILE = { name: 'Alex Marlowe', aliases: ['Alex', 'AM'], notMe: ['Alex P'], role: 'a senior engineer' };
const ROOTS: string[] = [];
after(() => ROOTS.forEach(rmTmp));

const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } });

describe('the adapter (decide.ts)', () => {
  test("puts the SDK's boolean on the wire as Jev's noul, to /systemone, and reads the recorded answer back", async () => {
    const sent: { url: string; init: RequestInit }[] = [];
    const fetch = (async (url: string, init: RequestInit) => {
      sent.push({ url, init });
      return json(RECORDED);
    }) as never;
    const r = await decide({
      baseURL: 'https://openrouter.ai/api/v1/',
      model: JEV_MODEL,
      apiKey: KEY,
      fetch,
      state: { message: 'Priya: Huge thanks Sam, the checkout rewrite cut page load in half!' },
      questions: {
        keep: { type: 'boolean', instructions: 'Is this a win worth saving for the user?', criteria: { true: 'praise', false: 'not' } },
        project: { type: 'choice', instructions: 'Which project?', criteria: { Checkout: 'Checkout', none: 'none' } },
      },
      signal: new AbortController().signal,
    });
    assert.equal(sent.length, 1);
    assert.equal(sent[0]!.url, 'https://openrouter.ai/api/v1/systemone');
    const body = JSON.parse(sent[0]!.init.body as string);
    assert.equal(body.model, 'typesafe/jev-1.14');
    assert.deepEqual(body.questions.keep, { type: 'noul', instructions: 'Is this a win worth saving for the user?', criteria: { true: 'praise', false: 'not' } });
    assert.equal(body.questions.project.type, 'choice');
    assert.deepEqual(body.state, { message: 'Priya: Huge thanks Sam, the checkout rewrite cut page load in half!' });
    assert.equal(new Headers(sent[0]!.init.headers).get('authorization'), `Bearer ${KEY}`);
    assert.deepEqual(r.answers.keep, { type: 'boolean', probability: 0.93 });
    assert.deepEqual(r.answers.project, { type: 'choice', choice: 'Checkout' }, 'the distribution is not passed on');
    assert.deepEqual([r.tokensIn, r.tokensOut, r.cost], [396, 47, 0.000016632]);
  });

  test("an answer that isn't one per question as asked is the SDK's InvalidResponseDataError; an HTTP failure an APICallError with no request body on it", async () => {
    const ask = (answer: unknown, status = 200) =>
      decide({ baseURL: 'https://openrouter.ai/api/v1', model: JEV_MODEL, apiKey: KEY, fetch: (async () => (typeof answer === 'string' ? new Response(answer, { status }) : json(answer, status))) as never, state: { text: 'secret words' }, questions: { keep: { type: 'boolean', instructions: 'x?' } }, signal: new AbortController().signal });
    for (const bad of [{ answers: { keep: { type: 'noul', noul: 1.7 } } }, { answers: { keep: { type: 'choice', choice: 'yes' } } }, { answers: {} }, 'Sure! Here you go'])
      await assert.rejects(ask(bad), (e: Error) => e.name === 'AI_InvalidResponseDataError', JSON.stringify(bad));
    await assert.rejects(ask({ answers: { keep: { type: 'refusal' } } }), (e: Error) => e.name === 'AI_DecisionRefusalError');
    await assert.rejects(ask({ error: { message: 'User not found.', code: 401 } }, 401), (e: Error & { statusCode?: number; requestBodyValues?: unknown }) => {
      assert.equal(e.statusCode, 401);
      assert.equal(e.requestBodyValues, undefined);
      assert.doesNotMatch(JSON.stringify(e), /secret words/);
      return true;
    });
  });

  test("a choice outside the options becomes the fallback (no project), never sinking the yes/no; without one it's bad_output", async () => {
    const ask = (fallbacks?: Record<string, string>) =>
      decide({
        baseURL: 'https://openrouter.ai/api/v1',
        model: JEV_MODEL,
        apiKey: KEY,
        fetch: (async () => json({ answers: { keep: { type: 'noul', noul: 0.9 }, project: { type: 'choice', choice: 'Made-up Project', probabilities: { 'Made-up Project': 0.7, x: 0.2 } } } })) as never,
        state: { text: 't' },
        questions: { keep: { type: 'boolean', instructions: 'x?' }, project: { type: 'choice', instructions: 'which?', criteria: { A: 'A', [JEV_NO_PROJECT]: 'none' } } },
        ...(fallbacks ? { fallbacks } : {}),
        signal: new AbortController().signal,
      });
    const r = await ask({ project: JEV_NO_PROJECT });
    assert.deepEqual([r.answers.keep, r.answers.project], [{ type: 'boolean', probability: 0.9 }, { type: 'choice', choice: JEV_NO_PROJECT }]);
    await assert.rejects(ask(), (e: Error) => e.name === 'AI_InvalidResponseDataError');
  });

  test('takes only the question types Jev answers here', () => {
    assert.deepEqual(jevModel({ baseURL: 'https://openrouter.ai/api/v1', model: JEV_MODEL, apiKey: null, fetch: (async () => json({})) as never }).supportedQuestionTypes, ['boolean', 'choice']);
  });
});

describe('what Jev is sent (prompts/judge-jev.ts)', () => {
  const input = 'The message to judge, in #payments:\n  Jordan Kim: Amazing work Alex, p95 is down 40%.';
  test('the state: who you are, your instructions verbatim, the input; a yes/no and a project choice; never a path, an id or a URL', () => {
    const r = judgeJevRequest('screenshots', { profile: PROFILE, projects: ['Ledger Platform', 'Checkout v2', 'ledger platform'], instructions: '# What counts\nShipping things.', input });
    assert.deepEqual(Object.keys(r.state), ['user', 'user_instructions', 'screenshot']);
    assert.match(r.state.user!, /Alex Marlowe \(also written "Alex", "AM"\), a senior engineer\.\n"Alex P" is a different person/);
    assert.equal(r.state.user_instructions, '# What counts\nShipping things.');
    assert.equal(r.state.screenshot, input);
    assert.equal(r.questions.keep!.type, 'boolean');
    assert.deepEqual(Object.keys(r.questions.project!.criteria), ['Ledger Platform', 'Checkout v2', JEV_NO_PROJECT], 'deduplicated, plus none');
    const all = JSON.stringify(r);
    assert.doesNotMatch(all, /\/(?:tmp|home|Users|var)\/|https?:|127\.0\.0\.1|[0-9A-HJKMNP-TV-Z]{26}/);
    // no prose is asked for: nothing that would need a "why"
    assert.doesNotMatch(all, /\bwhy\b|explain|reason/i);
  });

  test('a PR is asked notable-or-routine; no instructions → the default guidance; no projects → no project question', () => {
    const r = judgeJevRequest('github', { profile: null, projects: [], instructions: null, input: 'Repository: altimetry-example/ledger\nTitle: Bump zod' });
    assert.deepEqual(Object.keys(r.state), ['user', 'user_instructions', 'pull_request']);
    assert.equal(r.state.user_instructions, DEFAULT_GUIDANCE);
    assert.match(r.questions.keep!.instructions, /merged pull request/);
    assert.equal(r.questions.project, undefined);
  });

  test('the preview renders exactly what is sent', () => {
    const r = judgeJevRequest('screenshots', { profile: PROFILE, projects: ['Checkout v2'], instructions: null, input });
    const p = jevPreview(r);
    assert.deepEqual(JSON.parse(p.prompt), r.state);
    assert.match(p.system, /never with a reason/);
    assert.match(p.system, /keep \(yes or no, answered as a probability\)/);
    assert.match(p.system, /Checkout v2: Checkout v2/);
  });
});

describe('the verdict from Jev', () => {
  const prepared = { kind: 'screenshots' as const, input: { text: 'x', target: 'Amazing work Alex', from: 'quote' as const, author: 'Jordan Kim', truncated: false }, inputHash: `sha256:${'0'.repeat(64)}`, projects: new Map([['checkout v2', '01JPROJECT0000000000000000']]) };
  test('keep at P ≥ 0.5, confidence how sure either way, the chosen project, and no why, quote or from', () => {
    const v = checkAnswer(jevAnswer({ keep: { type: 'boolean', probability: 0.93 }, project: { type: 'choice', choice: 'Checkout v2' } }), prepared);
    assert.deepEqual(v, { keep: true, confidence: 0.93, suggestedProjects: ['01JPROJECT0000000000000000'], inputHash: prepared.inputHash });
    const no = checkAnswer(jevAnswer({ keep: { type: 'boolean', probability: 0.07 }, project: { type: 'choice', choice: JEV_NO_PROJECT } }), prepared);
    assert.deepEqual(no, { keep: false, confidence: 0.93, suggestedProjects: [], inputHash: prepared.inputHash }, '"probably not, 93%", never "7%"');
    assert.equal(checkAnswer(jevAnswer({ keep: { type: 'boolean', probability: 0.5 } }), prepared).keep, true, '0.5 keeps');
  });

  test('probabilityOnly() tells a Jev verdict from a chat model one', () => {
    assert.equal(probabilityOnly({ by: 'typesafe/jev-1.14 on openrouter.ai' }), true);
    assert.equal(probabilityOnly({ by: 'qwen3.5:4b on this computer' }), false);
    assert.equal(probabilityOnly({ by: 'typesafe/jev-router on openrouter.ai' }), false, 'a chat model that gives a why');
    assert.equal(probabilityOnly(null), false);
  });
});

/** A data home with a profile, an OpenRouter connection (cloud, consented, keyed) and a Jev through it as the judge's model. */
async function cloudRig(answer: (url: URL, body: any) => Response | Promise<Response> = () => json({ ...RECORDED, answers: { keep: { type: 'noul', noul: 0.93 } } }), opts: { jevConsent?: boolean } = {}) {
  const net = fakeNetwork(answer);
  const home = aiHome({ ai: { enabled: true, connections: { or: { kind: 'openrouter' }, jev: { kind: 'jev', via: 'or' } }, features: { judge: { enabled: true, model: { connection: 'jev', model: JEV_MODEL } } } }, fetchImpl: net.impl });
  ROOTS.push(path.dirname(home.dir));
  fs.writeFileSync(path.join(home.dir, 'profile.yaml'), 'name: Alex Marlowe\naliases: [Alex]\n');
  assert.equal((await home.req('POST', '/api/ai/connections/or/consent', { version: 1 })).status, 200);
  assert.equal((await home.req('PUT', '/api/ai/connections/or/key', { key: KEY })).status, 200);
  if (opts.jevConsent !== false) assert.equal((await home.req('POST', '/api/ai/connections/jev/consent', { version: 2 })).status, 200);
  let shots = 0;
  const shot = (quote: string) => home.ctx.services.found.add({ source: 'screenshots', externalKey: `screenshot:${String(++shots).padStart(64, 'a')}`, title: quote.slice(0, 40), quote: { text: quote, from: 'Jordan Kim', where: '#payments' }, files: [{ path: path.join(home.dir, 'gone.png'), title: 'gone.png' }], matchedRules: ['Says your name: "Alex"'] }).candidate!;
  return { home, net, shot };
}

describe('Judge now with Jev (cloud, through egress)', () => {
  test('one decision per candidate to openrouter.ai/api/v1/systemone, logged as the judge’s; the verdict has no why; nothing else changes', async () => {
    const { home, net, shot } = await cloudRig();
    const c = shot('Amazing work Alex, p95 is down 40% since the batching went out.');
    await withoutGlobalFetch(() => home.ctx.judge.judgePending({ trigger: 'now' }));
    const v = home.ctx.services.found.get(c.id).verdict!;
    assert.equal(home.ctx.services.found.get(c.id).status, 'pending');
    assert.deepEqual([v.keep, v.confidence, v.why, v.quote, v.from, v.by], [true, 0.93, undefined, undefined, undefined, 'typesafe/jev-1.14 on openrouter.ai']);
    assert.equal(net.calls.length, 1);
    assert.equal(net.calls[0]!.url, 'https://openrouter.ai/api/v1/systemone');
    assert.equal(net.calls[0]!.body.questions.keep.type, 'noul');
    assert.equal(net.calls[0]!.headers.authorization, `Bearer ${KEY}`);
    assert.equal(net.calls[0]!.headers['user-agent'], 'BragDoc');
    assert.match(net.calls[0]!.body.state.screenshot, /The message to judge, in #payments:\n {2}Jordan Kim: Amazing work Alex/);
    assert.doesNotMatch(JSON.stringify(net.calls[0]!.body), new RegExp(`${c.id}|${home.dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|gone\\.png`));
    const log = home.log().filter((e) => e.feature === 'judge');
    assert.deepEqual(log.map((e) => [e.outcome, e.where, e.model, e.purpose, e.host, e.path]), [['ok', 'internet', JEV_MODEL, 'ai.judge', 'openrouter.ai', '/api/v1/systemone']]);
    const act = readActivity(home.dir).entries.filter((e) => e.feature === 'judge');
    assert.deepEqual([act.length, act[0]!.counts], [1, { win: 1 }]);
    home.close();
  });

  test('the preview shows the questions and the state, and sends nothing', async () => {
    const { home, net, shot } = await cloudRig();
    const c = shot('Thanks Alex, the fix saved us hours');
    const r = await home.req('GET', `/api/ai/judge/preview?candidate=${c.id}`);
    assert.equal(r.status, 200);
    assert.match(r.body.system, /^Sent to Jev/);
    assert.match(JSON.parse(r.body.prompt).screenshot, /Thanks Alex, the fix saved us hours/);
    assert.equal(r.body.model, JEV_MODEL);
    assert.equal(net.calls.length, 0);
    home.close();
  });

  test("consent declined: Jev's own consent is needed even with OpenRouter allowed, and nothing is sent", async () => {
    const { home, net, shot } = await cloudRig(undefined, { jevConsent: false });
    shot('Amazing work Alex');
    const st = (await home.req('GET', '/api/ai')).body;
    assert.equal(st.connections.find((x: { id: string }) => x.id === 'jev').blocked.code, 'not_consented');
    const r = await home.req('POST', '/api/ai/judge/run', {});
    assert.deepEqual([r.status, r.body.error.code], [409, 'not_consented']);
    assert.equal(net.calls.length, 0);
    assert.equal((await home.req('POST', '/api/ai/connections/jev/consent', { version: 1 })).body.error.code, 'stale_consent', 'version 2: the statement grew');
    home.close();
  });

  test("revoking Jev stops it while OpenRouter stays allowed; revoking OpenRouter doesn't stop Jev; deleting OpenRouter takes Jev's consent", async () => {
    const { home, net, shot } = await cloudRig();
    shot('Amazing work Alex');
    assert.equal((await home.req('DELETE', '/api/ai/connections/jev/consent')).status, 200);
    assert.equal((await home.req('POST', '/api/ai/judge/run', {})).body.error.code, 'not_consented');
    assert.equal((await home.req('POST', '/api/ai/connections/jev/consent', { version: 2 })).status, 200);
    assert.equal((await home.req('DELETE', '/api/ai/connections/or/consent')).status, 200);
    await withoutGlobalFetch(() => home.ctx.judge.judgePending({ trigger: 'now' }));
    assert.equal(net.calls.length, 1, 'Jev has a consent of its own');
    assert.equal((await home.req('DELETE', '/api/ai/connections/or')).status, 200);
    const jev = home.config.get().ai.connections.jev!;
    assert.deepEqual([jev.via, jev.consent ?? null], ['or', null]);
    assert.equal((await home.req('POST', '/api/ai/connections', { kind: 'openrouter', id: 'or' })).status, 201);
    assert.equal((await home.req('GET', '/api/ai')).body.connections.find((x: { id: string }) => x.id === 'jev').blocked.code, 'not_consented', 'a new OpenRouter under the same id asks again');
    home.close();
  });

  test("consent is asked again: Jev pointed at another OpenRouter, that OpenRouter's key replaced, an older statement; none to give with nothing to go through", async () => {
    const { home } = await cloudRig();
    const jevConsent = () => home.config.get().ai.connections.jev!.consent ?? null;
    const blocked = async () => (await home.req('GET', '/api/ai')).body.connections.find((x: { id: string }) => x.id === 'jev').blocked?.code ?? null;
    // the first key on the OpenRouter connection was set before; a new one may be another account
    assert.equal((await home.req('PUT', '/api/ai/connections/or/key', { key: `${KEY}-2` })).status, 200);
    assert.equal(jevConsent(), null);
    assert.equal(await blocked(), 'not_consented');
    assert.equal((await home.req('POST', '/api/ai/connections/jev/consent', { version: 2 })).status, 200);
    // through another OpenRouter connection
    assert.equal((await home.req('POST', '/api/ai/connections', { kind: 'openrouter', id: 'or2' })).status, 201);
    assert.equal((await home.req('PUT', '/api/ai/connections/jev', { via: 'or2' })).status, 200);
    assert.equal(jevConsent(), null, 'another OpenRouter connection: consent again');
    // a consent to version 1 (before the statement grew) isn't current
    home.config.update({ ai: { connections: { jev: { via: 'or', consent: { at: '2026-10-18T00:00:00.000Z', version: 1, host: 'openrouter.ai' } } } } });
    assert.equal(await blocked(), 'not_consented');
    // nothing to go through: no host, so no consent to give
    home.config.update({ ai: { connections: { jev: { via: 'gone' } } } });
    const r = await home.req('POST', '/api/ai/connections/jev/consent', { version: 2 });
    assert.deepEqual([r.status, r.body.error.code], [409, 'no_model']);
    // a Jev has no address or context size of its own
    assert.equal((await home.req('PUT', '/api/ai/connections/jev', { baseUrl: 'https://llm.example.com/v1' })).status, 400);
    assert.equal((await home.req('POST', '/api/ai/connections', { kind: 'jev', via: 'or', contextTokens: 4096 })).status, 400);
    home.close();
  });

  test('the unhappy paths: a refused key and rate limiting stop the run; a malformed answer fails its item; the endpoint down is unreachable', async () => {
    const cases: [string, (url: URL) => Response | Promise<Response>, { error: string; failed?: number }][] = [
      ['invalid key', () => json({ error: { message: 'User not found.', code: 401 } }, 401), { error: 'key_refused' }],
      ['rate limited', () => json({ error: { message: 'Rate limit exceeded', code: 429 } }, 429), { error: 'rate_limited' }],
      ['out of credit', () => json({ error: { message: 'Insufficient credits', code: 402 } }, 402), { error: 'quota' }],
      ['down', () => Promise.reject(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } })), { error: 'unreachable' }],
      ['5xx', () => json({ error: { message: 'upstream error', code: 502 } }, 502), { error: 'failed', failed: 2 }],
      ['malformed', () => json({ answers: { keep: { type: 'noul', noul: 'likely' } } }), { error: 'bad_output', failed: 2 }],
    ];
    for (const [name, answer, want] of cases) {
      const { home, shot } = await cloudRig(answer);
      shot('Amazing work Alex');
      shot('Great job Alex on the incident review');
      const r = await withoutGlobalFetch(() => home.ctx.judge.judgePending({ trigger: 'now' }));
      assert.equal(r.error, want.error, name);
      if (want.failed) assert.equal(r.counts.failed, want.failed, `${name}: each item fails on its own`);
      else assert.equal(r.done, 0, `${name}: the run stops at the first`);
      assert.ok(home.ctx.services.found.list().every((c) => !c.verdict), `${name}: no verdict is made up`);
      const said = home.log().filter((e) => e.feature === 'judge').map((e) => JSON.stringify(e)).join('\n');
      assert.doesNotMatch(said, new RegExp(KEY), name);
      home.close();
    }
  });
});

describe('where Jev may be used', () => {
  test('the judge only: never the text slot, Tidy or Draft; and only one of Jev’s models (not typesafe/jev-router)', async () => {
    const { home } = await cloudRig();
    const bad = async (m: string, p: string, b: unknown) => {
      const r = await home.req(m, p, b);
      assert.equal(r.status, 400, `${p} ${JSON.stringify(b)}`);
      return r.body.error.message as string;
    };
    assert.match(await bad('PUT', '/api/ai', { text: { connection: 'jev', model: JEV_MODEL } }), /judge only/);
    assert.match(await bad('PUT', '/api/ai/features/tidy', { model: { connection: 'jev', model: JEV_MODEL } }), /judge only/);
    assert.match(await bad('PUT', '/api/ai/features/draft', { model: { connection: 'jev', model: JEV_MODEL } }), /judge only/);
    assert.match(await bad('PUT', '/api/ai/features/judge', { model: { connection: 'jev', model: 'typesafe/jev-router' } }), /jev-router is a chat model/);
    assert.equal((await home.req('PUT', '/api/ai/features/judge', { model: { connection: 'jev', model: 'typesafe/jev-1.15' } })).status, 200, 'a later Jev');
    // a Jev in the text slot by a hand edit of config.yaml: Tidy refuses plainly, before anything is sent
    home.config.update({ ai: { text: { connection: 'jev', model: JEV_MODEL }, features: { tidy: { enabled: true } } } });
    const g = home.ctx.ai.readiness('tidy').gate;
    assert.deepEqual([g?.code, /only judges Found candidates/.test(g?.message ?? '')], ['no_model', true]);
    await assert.rejects(home.ctx.ai.object({ feature: 'test', purpose: 'ai.test', slot: { connection: 'jev', model: JEV_MODEL }, system: 's', prompt: 'p', schema: z.object({ ok: z.boolean() }) }), /can't write text/);
    home.close();
  });

  test('Test connection asks Jev one question about nothing of yours; its models are Jev’s, with no request', async () => {
    const { home, net } = await cloudRig(() => json({ answers: { ok: { type: 'noul', noul: 0.97 } }, usage: { input_tokens: 40, output_tokens: 3 } }));
    const t = await withoutGlobalFetch(() => home.req('POST', '/api/ai/connections/jev/test', {}));
    assert.deepEqual([t.status, t.body.ok, t.body.model, t.body.where], [200, true, JEV_MODEL, 'internet']);
    assert.deepEqual(net.calls[0]!.body.state, { text: 'BragDoc is checking that this connection works.' });
    const m = await home.req('GET', '/api/ai/connections/jev/models');
    assert.deepEqual(m.body.models, [{ name: JEV_MODEL, sizeBytes: null }]);
    assert.equal(net.calls.length, 1);
    const bad = await cloudRig(() => json({ error: { message: 'User not found.', code: 401 } }, 401));
    const t2 = await withoutGlobalFetch(() => bad.home.req('POST', '/api/ai/connections/jev/test', {}));
    assert.deepEqual([t2.body.ok, t2.body.error.code], [false, 'key_refused']);
    const t3 = await withoutGlobalFetch(() => home.req('POST', '/api/ai/connections/jev/test', { model: 'typesafe/jev-router' }));
    assert.deepEqual([t3.body.ok, t3.body.error.code], [false, 'model_missing']);
    assert.equal(net.calls.length, 1, 'jev-router is never sent to /systemone');
    home.close();
    bad.home.close();
  });

  test('the header chip counts the judge on Jev, with no text slot', () => {
    const conn = { id: 'jev', kind: 'jev' as const, class: 'internet' as const, host: 'openrouter.ai', blocked: null };
    const features = { judge: { enabled: true, model: { connection: 'jev', model: JEV_MODEL } }, tidy: { enabled: false, model: null }, draft: { enabled: false, model: null } } as never;
    assert.equal(chipLabel({ enabled: true, text: null, features, connections: [conn] }), 'AI · OpenRouter');
    const local = { id: 'ollama', kind: 'ollama' as const, class: 'this-computer' as const, host: '127.0.0.1', blocked: null };
    assert.equal(chipLabel({ enabled: true, text: { connection: 'ollama', model: 'qwen3.5:4b' }, features, connections: [local, conn] }), 'AI · OpenRouter', 'the judge sends to OpenRouter even with a local text slot');
    assert.equal(chipLabel({ enabled: true, text: null, features: { ...(features as object), judge: { enabled: false, model: { connection: 'jev', model: JEV_MODEL } } } as never, connections: [conn] }), 'AI · no model yet', 'a feature that is off does not count');
  });

  test("the consent statement says what's sent and to whom, and that Jev gives no reason", () => {
    const s = consentStatement('jev');
    assert.equal(s.version, 2);
    assert.match(s.provider!, /OpenRouter, for TypeSafe/);
    assert.ok(s.sends.judge!.some((x) => /screenshot/.test(x)) && s.sends.judge!.some((x) => /pull request/.test(x)));
    assert.ok(s.notes.some((x) => /OpenRouter, which passes it to TypeSafe AI/.test(x)));
    assert.ok(s.notes.some((x) => /never says why/.test(x)));
  });
});


describe('end to end against the fake model server', () => {
  async function fakeRig(scenario?: string) {
    const fake = await startFakeLlm(scenario ? { scenario: scenario as never } : {});
    const root = tmpDir('bragdoc-jev-');
    ROOTS.push(root);
    const dir = path.join(root, '.bragdoc');
    initHome(dir);
    fs.writeFileSync(path.join(dir, 'profile.yaml'), 'name: Alex Marlowe\naliases: [Alex]\n');
    const bus = new EventBus();
    const config = new ConfigStore(dir, { onChange: () => bus.emit({ type: 'config' }) });
    config.load();
    config.update({ ai: { enabled: true, connections: { or: { kind: 'openrouter', baseUrl: `${fake.url}/v1` }, jev: { kind: 'jev', via: 'or' } }, features: { judge: { enabled: true, github: true, model: { connection: 'jev', model: JEV_MODEL } } } } });
    const egress = new Egress({ dataDir: dir, config: () => config.get() });
    const { app, ctx } = createAppWithContext({ dataDir: dir, webDist: null, config, bus, egress });
    ctx.secrets.setAiKey('or', 'local-placeholder');
    let n = 0;
    return {
      dir,
      app,
      ctx,
      fake,
      shot: (quote: string) => ctx.services.found.add({ source: 'screenshots', externalKey: `screenshot:${String(++n).padStart(64, '0')}`, title: quote.slice(0, 40), quote: { text: quote, from: 'Jordan Kim', where: '#payments' }, files: [{ path: path.join(dir, `gone-${n}.png`), title: 'x.png' }], matchedRules: ['Says your name: "Alex"'] }).candidate!,
      pr: (title: string) => {
        const key = `github_pr:altimetry-example/ledger#${++n}`;
        return ctx.services.found.add({ source: 'github', externalKey: key, title, body: 'Adds retries.', happenedAt: '2026-10-14', evidence: [{ kind: 'github_pr', url: `https://github.com/altimetry-example/ledger/pull/${n}`, externalKey: key, title }], matchedRules: ['Merged'] }).candidate!;
      },
      close: async () => {
        ctx.judge.close();
        await fake.close();
      },
    };
  }

  test('screenshots and PRs: a win, sarcasm, a bump; the fake saw noul questions', async () => {
    const r = await fakeRig();
    try {
      const win = r.shot('Amazing work Alex, p95 is down 40% since the batching went out.');
      const trap = r.shot('Amazing work Alex, really loving the 3rd rollback today');
      const bump = r.pr('Bump zod from 4.1.3 to 4.1.5');
      const feat = r.pr('Blue/green deploys for the payments API');
      const s = await r.ctx.judge.judgePending({ trigger: 'now' });
      assert.deepEqual([s.outcome, s.counts], ['ok', { win: 2, 'probably-not': 2 }]);
      const v = (id: string) => r.ctx.services.found.get(id).verdict!;
      assert.deepEqual([v(win.id).keep, v(win.id).confidence, v(win.id).why, v(win.id).by], [true, 0.86, undefined, `${JEV_MODEL} on this computer`]);
      assert.deepEqual([v(trap.id).keep, v(trap.id).confidence], [false, 0.8]);
      assert.deepEqual([v(bump.id).keep, v(feat.id).keep, v(feat.id).impact], [false, true, undefined]);
      const reqs = r.fake.requests.filter((q) => q.path === '/v1/systemone');
      assert.equal(reqs.length, 4);
      assert.ok(reqs.every((q) => q.rule === 'jev' && (q.body as { questions: { keep: { type: string } } }).questions.keep.type === 'noul'));
      assert.ok(readNetworkLog(r.dir, { limit: 50 }).entries.filter((e) => e.feature === 'judge').every((e) => e.where === 'this-computer' && e.path === '/v1/systemone'));
    } finally {
      await r.close();
    }
  });

  for (const [scenario, error] of [['refused-key', 'key_refused'], ['rate-limited', 'rate_limited'], ['down', 'unreachable'], ['bad-json', 'bad_output']] as const)
    test(`the fake's ${scenario}: ${error}, and no verdict`, async () => {
      const r = await fakeRig(scenario);
      try {
        r.shot('Amazing work Alex');
        const s = await r.ctx.judge.judgePending({ trigger: 'now' });
        assert.equal(s.error, error);
        assert.ok(r.ctx.services.found.list().every((c) => !c.verdict));
      } finally {
        await r.close();
      }
    });

  test('AI off: nothing is sent to Jev', async () => {
    const r = await fakeRig();
    try {
      r.ctx.config.update({ ai: { enabled: false } });
      r.shot('Amazing work Alex');
      await assert.rejects(r.ctx.judge.judgePending({ trigger: 'now' }), /AI is off/);
      assert.equal(r.fake.requests.length, 0);
    } finally {
      await r.close();
    }
  });
});
