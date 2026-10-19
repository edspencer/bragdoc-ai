// Folio's Draft with AI (PR27, SPEC R24, R26) end to end, on a server of its own (turning AI on mustn't leak into the
// shared server's other specs) with the example data, against the fake model server (loopback only; its draft plants
// one invented number and one uncited bullet for the check to catch). With AI off there's no trace of it, and the
// markdown is v0.1's, byte for byte. Streaming, the flags, edit, Copy, Export (its filename), Draft again, Cancel
// (`slow`), the runner down (`down`), and an empty folio.
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { folioDoc, readSearch, toMarkdown, type FolioResponse } from '../shared/folio.ts';
import { startFakeLlm } from '../test/fixtures/fake-llm/server.ts';

interface Server {
  url: string;
  stop: () => Promise<void>;
}

async function serve(port: number): Promise<Server> {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-e2e-draft-')));
  const data = path.join(home, '.bragdoc');
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(data, 'profile.yaml'), 'name: Alex Marlowe\nrole: Staff engineer\n');
  const child: ChildProcess = spawn(process.execPath, ['dist/server/cli.js', 'serve', '--port', String(port), '--quiet'], {
    env: { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'), BRAGDOC_HOME: data, BRAGDOC_DEV: '', BRAGDOC_DANGEROUSLY_ALLOW_OPEN: '', PORT: '', PATH: path.dirname(process.execPath) },
    stdio: 'ignore',
  });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${url}/api/health`)).ok) break;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return {
    url,
    stop: async () => {
      if (child.exitCode === null) {
        const gone = new Promise((r) => child.once('exit', r));
        child.kill('SIGTERM');
        await gone;
      }
      fs.rmSync(home, { recursive: true, force: true });
    },
  };
}

/** The copy of a control that's on screen (Folio's actions are drawn twice: above the list on phones, beside it on desktop). */
const shown = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.describe.configure({ mode: 'serial' });

const AS_OF = '2026-10-18';
const FOLIO = '/folio?from=2026-04-18&to=2026-10-18';
let server: Server;
let fake: Awaited<ReturnType<typeof startFakeLlm>>;

const put = async (page: Page, p: string, data: unknown) => {
  const r = await page.request.fetch(server.url + p, { method: p.startsWith('/api/ai/connections') && !p.endsWith('/key') ? 'POST' : 'PUT', data });
  expect(r.ok(), `${p}: ${await r.text()}`).toBe(true);
};
/** Draft's model: the fake, behaving as `scenario`. */
const useScenario = (page: Page, scenario: string) => put(page, '/api/ai', { text: { connection: scenario === 'ok' ? 'fake' : `fake-${scenario}`, model: 'qwen3.5:4b' } });

test.beforeAll(async ({}, info) => {
  server = await serve(27450 + info.workerIndex);
  fake = await startFakeLlm({ slowMs: 4000 });
  const r = await fetch(`${server.url}/api/example`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asOf: AS_OF }) });
  expect(r.ok).toBe(true);
});
test.afterAll(async () => {
  await server?.stop();
  await fake?.close();
});

test('AI off: no Draft button, and the markdown is exactly the plain folio’s', async ({ page }) => {
  await page.goto(server.url + FOLIO + '&view=md');
  await expect(page.getByTestId('folio-count')).toHaveText(/of \d+ picked/);
  await expect(page.getByTestId('folio-draft-button')).toHaveCount(0);
  await expect(page.getByTestId('folio-drafter')).toHaveCount(0);
  await expect(page.getByTestId('folio-promise')).toHaveText(/^Exactly what you picked, nothing added or rewritten\./);
  const data = (await (await page.request.get(`${server.url}/api/folio?from=2026-04-18&to=2026-10-18`)).json()) as FolioResponse;
  const want = toMarkdown(folioDoc(data, readSearch({ from: '2026-04-18', to: '2026-10-18' }, AS_OF)));
  const [dl] = await Promise.all([page.waitForEvent('download'), shown(page, 'folio-export').click()]);
  expect(fs.readFileSync((await dl.path())!, 'utf8')).toBe(want);
  expect(await page.getByTestId('folio-markdown').textContent()).toBe(want);
});

test('AI on but Draft off: still no button; Draft on: there it is', async ({ page }) => {
  await put(page, '/api/ai', { enabled: true });
  for (const s of ['ok', 'slow', 'down']) await put(page, '/api/ai/connections', { id: s === 'ok' ? 'fake' : `fake-${s}`, kind: 'ollama', baseUrl: s === 'ok' ? fake.url : `${fake.url}/s/${s}` });
  await useScenario(page, 'ok');
  await page.goto(server.url + FOLIO);
  await expect(page.getByTestId('folio-count')).toHaveText(/of \d+ picked/);
  await expect(page.getByTestId('folio-draft-button')).toHaveCount(0);
  await put(page, '/api/ai/features/draft', { enabled: true });
  await page.reload();
  await expect(shown(page, 'folio-draft-button')).toBeEnabled();
  await expect(page.getByTestId('folio-promise')).toHaveText(/^The plain export \(Copy, Print, Export \.md\) is exactly what you picked/);
});

test('draft: it streams in, cites its clippings, and the check flags the planted number and the uncited bullet', async ({ page }) => {
  await page.goto(server.url + FOLIO);
  await shown(page, 'folio-draft-purpose').fill('for my self-review');
  await shown(page, 'folio-draft-button').click();
  const panel = page.getByRole('region', { name: 'Draft with AI' });
  await expect(panel.getByTestId('draft-model')).toHaveText('qwen3.5:4b on this computer');
  await expect(panel.getByTestId('draft-text')).toBeVisible();
  await expect(panel.getByTestId('draft-text')).toHaveValue(/This draft came from the fake model server/);
  await expect(panel.getByTestId('draft-ungrounded')).toContainText('37%');
  await expect(panel.getByTestId('draft-uncited')).toContainText('I helped wherever I was needed');
  // a flag selects its line
  await panel.getByTestId('draft-ungrounded').getByTestId('draft-flag').click();
  expect(await panel.getByTestId('draft-text').evaluate((t: HTMLTextAreaElement) => t.value.slice(t.selectionStart, t.selectionEnd))).toMatch(/by 37% \[1\]$/);
  // [n] links to its clipping
  await panel.getByTestId('draft-read').click();
  await panel.getByTestId('draft-cite').first().click();
  await expect(page.locator('.folio-clip-flash')).toHaveCount(1);
  // the plain preview is untouched beside it
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  await expect(page.getByTestId('folio-markdown')).not.toContainText('fake model server');
  await page.getByRole('button', { name: 'Draft', exact: true }).click();
});

test('edit, the check follows; Export draft .md has its filename; leaving asks first', async ({ page }) => {
  await page.goto(server.url + FOLIO);
  await shown(page, 'folio-draft-button').click();
  const panel = page.getByRole('region', { name: 'Draft with AI' });
  const ta = panel.getByTestId('draft-text');
  await expect(ta).toHaveValue(/fake model server/);
  const v = await ta.inputValue();
  await ta.fill(v.replace(', cutting review time by 37%', '').replace('- I helped wherever I was needed', '- I went above and beyond [2]'));
  await expect(panel.getByTestId('draft-ungrounded')).toHaveCount(0);
  await expect(panel.getByTestId('draft-uncited')).toHaveCount(0);
  await expect(panel.getByTestId('draft-filler')).toContainText('above and beyond');
  // leaving with an edited draft you haven't taken asks; dismiss it and you stay
  page.once('dialog', (d) => void d.dismiss());
  await page.getByRole('link', { name: 'Board' }).first().click();
  await expect(page).toHaveURL(/\/folio/);
  const [dl] = await Promise.all([page.waitForEvent('download'), panel.getByTestId('draft-export').click()]);
  expect(dl.suggestedFilename()).toBe('bragdoc-draft-2026-04-18-2026-10-18.md');
  expect(fs.readFileSync((await dl.path())!, 'utf8')).toContain('I went above and beyond [2]');
  // exported: leaving doesn't ask now
  await page.getByRole('link', { name: 'Board' }).first().click();
  await expect(page).not.toHaveURL(/\/folio/);
});

test('Copy draft puts the edited draft on the clipboard; Draft again asks for a new one', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'reading the clipboard back needs Chromium permissions');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(server.url + FOLIO);
  await shown(page, 'folio-draft-button').click();
  const panel = page.getByRole('region', { name: 'Draft with AI' });
  await expect(panel.getByTestId('draft-text')).toHaveValue(/fake model server/);
  await panel.getByTestId('draft-text').fill('- My own words [1]');
  await panel.getByTestId('draft-copy').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('- My own words [1]');
  await panel.getByTestId('draft-again').click();
  await expect(panel.getByTestId('draft-text')).toHaveValue(/fake model server/);
});

test('Cancel stops a slow draft; what arrived stays, and the activity line says cancelled', async ({ page }) => {
  await useScenario(page, 'slow');
  await page.goto(server.url + FOLIO);
  await shown(page, 'folio-draft-button').click();
  const panel = page.getByRole('region', { name: 'Draft with AI' });
  await expect(panel.getByTestId('draft-stream')).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByTestId('draft-status')).toContainText('Writing with qwen3.5:4b');
  await panel.getByTestId('draft-cancel').click();
  await expect(panel.getByTestId('draft-error')).toContainText('Cancelled');
  await expect(panel.getByTestId('draft-text')).toBeVisible();
  await expect
    .poll(async () => ((await (await page.request.get(`${server.url}/api/ai/activity?limit=5`)).json()).entries as { feature: string; outcome: string }[]).find((e) => e.feature === 'draft')?.outcome)
    .toBe('cancelled');
});

test('the runner down: the reason in words, and Try again', async ({ page }) => {
  await useScenario(page, 'down');
  await page.goto(server.url + FOLIO);
  await shown(page, 'folio-draft-button').click();
  const panel = page.getByRole('region', { name: 'Draft with AI' });
  await expect(panel.getByTestId('draft-error')).toContainText("isn't answering. Is the model runner running?");
  await expect(panel.getByTestId('draft-again')).toHaveText(/Try again/);
  await useScenario(page, 'ok');
});

test('an empty folio: the button is there, disabled, with the reason', async ({ page }) => {
  await page.goto(server.url + '/folio?from=2001-01-01&to=2001-03-31');
  await expect(page.getByTestId('folio-empty')).toBeVisible();
  await expect(shown(page, 'folio-draft-button')).toBeDisabled();
  await expect(shown(page, 'folio-draft-why')).toHaveText('Nothing is picked, so there’s nothing to draft from.');
});

test('AI off again: the button goes', async ({ page }) => {
  await put(page, '/api/ai', { enabled: false });
  await page.goto(server.url + FOLIO);
  await expect(page.getByTestId('folio-count')).toHaveText(/of \d+ picked/);
  await expect(page.getByTestId('folio-draft-button')).toHaveCount(0);
});
