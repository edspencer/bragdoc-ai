// One BragDoc session for test/ai-lazy.test.ts, run as a child process under the loader hook: boot a server on a
// throwaway data home, use a sample of the app (the board, Found, Settings, the AI settings themselves), then stop.
// AI_LAZY_MODE=off leaves AI off (the SDK must never be resolved); `on` turns it on and makes one test call against
// the fake model server at AI_LAZY_FAKE (the control: the hook does see the SDK load). AI_LAZY_SERVER names the
// server module to boot (default: the source; PR30 points it at a packed build's dist/server/index.js).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const serverModule = process.env.AI_LAZY_SERVER ?? path.resolve(import.meta.dirname, '../../../server/index.ts');
const { startServer } = (await import(pathToFileURL(serverModule).href)) as typeof import('../../../server/index.ts');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-lazy-'));
const dataDir = path.join(home, '.bragdoc');
const on = process.env.AI_LAZY_MODE === 'on';
const { port, close } = await startServer(0, { dataDir, webDist: null, homedir: home, env: { PATH: '' } });
const base = `http://127.0.0.1:${port}`;
const call = async (method: string, p: string, body?: unknown) => {
  const res = await fetch(base + p, { method, headers: { 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, body: await res.text() };
};
const out: Record<string, number> = {};
try {
  for (const p of ['/api/health', '/api/meta', '/api/settings', '/api/achievements', '/api/found', '/api/found/count', '/api/projects', '/api/sources', '/api/network-log', '/api/problems', '/api/folio?from=2026-01-01&to=2026-12-31', '/api/ai'])
    out[`GET ${p}`] = (await call('GET', p)).status;
  out['POST /api/achievements'] = (await call('POST', '/api/achievements', { title: 'Shipped the thing', happenedAt: '2026-10-01' })).status;
  // the AI settings, with AI off: adding a connection, a key and consent load nothing; a test is refused before anything
  out['POST /api/ai/connections'] = (await call('POST', '/api/ai/connections', { kind: 'ollama', baseUrl: process.env.AI_LAZY_FAKE ?? 'http://127.0.0.1:9' })).status;
  out['POST /api/ai/connections (cloud)'] = (await call('POST', '/api/ai/connections', { kind: 'openrouter' })).status;
  out['PUT …/key'] = (await call('PUT', '/api/ai/connections/openrouter/key', { key: 'sk-or-lazy-000000000000000000' })).status;
  out['POST …/consent'] = (await call('POST', '/api/ai/connections/openrouter/consent', { version: 1 })).status;
  out['PUT /api/ai/features/tidy'] = (await call('PUT', '/api/ai/features/tidy', { enabled: true })).status;
  if (on) out['PUT /api/ai'] = (await call('PUT', '/api/ai', { enabled: true })).status;
  out['POST …/test'] = (await call('POST', '/api/ai/connections/ollama/test', { model: 'qwen3.5:4b' })).status;
  out['GET …/models'] = (await call('GET', '/api/ai/connections/ollama/models')).status;
} finally {
  await close();
  fs.rmSync(home, { recursive: true, force: true });
}
process.stdout.write(JSON.stringify(out));
