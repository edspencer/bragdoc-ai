// The first run (SPEC R10, PR16), end to end, on servers of its own: the shared e2e server's home already has a
// profile (playwright.config.ts), and other specs own its catalog, so these start BragDoc on fresh throwaway homes.
// A fresh home's board sends you to Welcome; skipping everything lands on an empty board with nothing sent anywhere;
// the steps save the profile and only the repos you tick; example data comes and goes without touching yours.
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

interface Server {
  url: string;
  home: string;
  data: string;
  stop: () => Promise<void>;
}

async function serve(port: number): Promise<Server> {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-e2e-welcome-')));
  const data = path.join(home, '.bragdoc');
  const child: ChildProcess = spawn(process.execPath, ['dist/server/cli.js', 'serve', '--port', String(port), '--quiet'], {
    env: { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'), BRAGDOC_HOME: data, BRAGDOC_DEV: '', BRAGDOC_DANGEROUSLY_ALLOW_OPEN: '', PORT: '' },
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
    home,
    data,
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

/** A fake git checkout with a commit `daysAgo` and an optional remote (no git needed). */
function fakeRepo(dir: string, daysAgo: number, remote?: string) {
  const git = path.join(dir, '.git');
  fs.mkdirSync(path.join(git, 'logs'), { recursive: true });
  fs.writeFileSync(path.join(git, 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(git, 'config'), remote ? `[remote "origin"]\n\turl = ${remote}\n` : '[core]\n');
  const t = Math.floor(Date.now() / 1000) - daysAgo * 86400;
  fs.writeFileSync(path.join(git, 'logs', 'HEAD'), `${'a'.repeat(40)} ${'b'.repeat(40)} Alex Marlowe <alex@example.com> ${t} +0000\tcommit: work\n`);
}

const watchErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // a refused scan or folder is a 400/409 the browser reports by itself; anything else is a bug
  page.on('console', (m) => m.type() === 'error' && !/status of 40[09]/.test(m.text()) && errors.push(m.text()));
  return errors;
};

test.describe.configure({ mode: 'serial' });

let server: Server;
test.beforeAll(async ({}, info) => {
  server = await serve(27300 + info.workerIndex);
});
test.afterAll(async () => server?.stop());

test('a fresh home opens Welcome; skipping everything lands on an empty board and sends nothing', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(server.url + '/');
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByTestId('welcome-you')).toBeVisible();
  // Next with no name says why, and stays
  await page.getByTestId('welcome-next').click();
  await expect(page.getByRole('alert')).toContainText('Say what to call you');
  await page.getByTestId('welcome-skip').click();
  await expect(page.getByTestId('board-empty')).toBeVisible();
  await expect(page.getByTestId('board-empty-sources')).toHaveAttribute('href', '/settings/sources');
  // another tab (no sessionStorage) isn't sent back: skipping is in config.yaml
  const other = await page.context().newPage();
  await other.goto(server.url + '/');
  await expect(other.getByTestId('board-empty')).toBeVisible();
  expect(fs.readFileSync(path.join(server.data, 'config.yaml'), 'utf8')).toMatch(/^ {2}skipped: true/m);
  expect(fs.existsSync(path.join(server.data, 'profile.yaml'))).toBe(false);
  expect((await (await fetch(`${server.url}/api/network-log`)).json()).total).toBe(0);
  expect(errors).toEqual([]);
});

test('the steps again from Settings: the profile, then only the repos you tick', async ({ page }) => {
  const errors = watchErrors(page);
  const code = path.join(server.home, 'Code');
  fakeRepo(path.join(code, 'app'), 1, 'git@github.com:acme/app.git');
  fakeRepo(path.join(code, 'team', 'service'), 3);
  fakeRepo(path.join(code, 'old'), 200);
  fakeRepo(path.join(code, 'a', 'b', 'c', 'd', 'too-deep'), 0);
  fs.mkdirSync(path.join(code, 'loop'));
  fs.symlinkSync(code, path.join(code, 'loop', 'back'));

  await page.goto(server.url + '/settings/data');
  await page.getByTestId('welcome-again-you').click();
  await page.getByTestId('welcome-name').fill('Alex Marlowe');
  const aliases = page.getByTestId('welcome-aliases').locator('input');
  await aliases.pressSequentially('Alex M,@alex');
  await aliases.press('Enter');
  // pasted (or autofilled) in one go, a list is still separate names (PR17)
  await aliases.fill('AM, Marlowe');
  await aliases.press('Enter');
  await page.getByTestId('welcome-next').click();
  await expect(page.getByTestId('welcome-sources')).toBeVisible();
  await expect(page.getByTestId('source-github')).toContainText('Off');
  // the screenshots folder (PR15's card): off; switching it on asks which folder, and a bad one is said plainly
  const shots = page.getByTestId('source-screenshots');
  await expect(shots.getByTestId('screenshots-status')).toContainText('Off');
  fs.mkdirSync(path.join(server.home, 'Shots'));
  await shots.getByRole('switch', { name: 'Screenshots folder' }).click();
  await shots.getByTestId('screenshots-other').fill('~/Nope');
  await shots.getByTestId('screenshots-save').click();
  await expect(shots.getByTestId('screenshots-error')).toBeVisible();
  expect(fs.readFileSync(path.join(server.data, 'config.yaml'), 'utf8')).not.toMatch(/screenshots:\n\s+enabled: true/);
  await shots.getByTestId('screenshots-other').fill('~/Shots');
  await shots.getByTestId('screenshots-save').click();
  await expect(shots.getByTestId('screenshots-status')).toContainText('On');
  expect(fs.readFileSync(path.join(server.data, 'config.yaml'), 'utf8')).toMatch(/screenshots:\n\s+enabled: true\n\s+folder: ~\/Shots/);
  await shots.getByRole('switch', { name: 'Screenshots folder' }).click();
  await expect(shots.getByTestId('screenshots-status')).toContainText('Off');
  await page.getByTestId('welcome-next').click();

  // a folder that isn't there: said plainly
  await page.getByTestId('discover-root').fill('~/Nope');
  await page.getByTestId('discover-look').click();
  await expect(page.getByTestId('discover-error')).toContainText('There’s no folder at ~/Nope');

  await page.getByTestId('discover-root').fill('~/Code');
  await page.getByTestId('discover-look').click();
  const rows = page.getByTestId('discover-repo');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('app');
  await expect(rows.nth(0).getByTestId('discover-why')).toHaveText('you committed yesterday');
  // the recent two are ticked; the old one isn't
  await expect(page.getByTestId('discover-add')).toHaveText(/Add 2 repos/);
  await rows.nth(0).getByTestId('discover-project').selectOption('new');
  await page.getByTestId('discover-add').click();
  await expect(rows.nth(0).getByTestId('discover-why')).toHaveText('added');
  await page.getByTestId('welcome-next').click();
  await expect(page).toHaveURL(server.url + '/');

  const profile = fs.readFileSync(path.join(server.data, 'profile.yaml'), 'utf8');
  expect(profile).toContain('name: Alex Marlowe');
  expect(profile).toMatch(/aliases: \[ Alex M, "@alex", AM, Marlowe \]/);
  const repos = (await (await fetch(`${server.url}/api/repos`)).json()).repos.map((r: { name: string }) => r.name).sort();
  expect(repos).toEqual(['acme/app', 'service']);
  const projects = (await (await fetch(`${server.url}/api/projects`)).json()).projects.map((p: { name: string }) => p.name);
  expect(projects).toEqual(['app']);
  expect(errors).toEqual([]);
});

test('example data: in one click from the empty board, marked, and removed without touching yours', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(server.url + '/');
  await page.getByTestId('example-add').click();
  await expect(page.getByTestId('example-banner')).toBeVisible();
  await expect(page.getByTestId('week').first()).toBeVisible();
  await expect(page.getByTestId('example-chip').first()).toBeVisible();
  // one of yours, alongside
  await page.getByTestId('composer-text').fill('My own win');
  await page.getByTestId('composer-text').press('Control+Enter');
  await expect(page.getByRole('heading', { name: 'My own win' })).toBeVisible();

  await page.getByTestId('example-remove').click();
  await page.getByTestId('example-remove-yes').click();
  await expect(page.getByTestId('example-banner')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'My own win' })).toBeVisible();
  await expect(page.getByTestId('example-chip')).toHaveCount(0);
  const status = await (await fetch(`${server.url}/api/example`)).json();
  expect(status.present).toBe(false);
  // and the repos and project from Welcome are still there
  expect((await (await fetch(`${server.url}/api/repos`)).json()).repos).toHaveLength(2);
  expect((await (await fetch(`${server.url}/api/problems`)).json()).problems).toEqual([]);
  expect(errors).toEqual([]);
});
