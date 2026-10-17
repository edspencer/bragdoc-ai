// The Projects page (PR8) against the built server: the empty state, creating a project with a new company and a repo
// added by folder, the Gantt, colour changes, deleting with Undo, a company's projects moving to "No company", and
// the repo errors. Serial: the steps build on one another, on the shared throwaway data home.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

let scratch: string;
test.beforeAll(() => {
  scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-e2e-repos-')));
  fs.mkdirSync(path.join(scratch, 'my-app', '.git'), { recursive: true });
  fs.writeFileSync(path.join(scratch, 'my-app', '.git', 'config'), '[remote "origin"]\n\turl = git@github.com:example/my-app.git\n');
  fs.mkdirSync(path.join(scratch, 'plain'));
});
test.afterAll(() => fs.rmSync(scratch, { recursive: true, force: true }));

test('zero projects: an empty state that leads to New project', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.getByTestId('projects-empty')).toBeVisible();
  await expect(page.getByTestId('repos-empty')).toBeVisible();
  await page.getByTestId('empty-new-project').click();
  await expect(page.getByTestId('project-dialog')).toBeVisible();
  await expect(page.getByTestId('project-save')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('project-dialog')).toBeHidden();
});

test('a repo folder that is missing, or not a git repo, says so and adds nothing', async ({ page }) => {
  await page.goto('/projects');
  await page.getByTestId('repos-add').fill(path.join(scratch, 'nope'));
  await page.getByTestId('repos-add').press('Enter');
  await expect(page.getByTestId('repos-error')).toContainText('no folder at');
  await page.getByTestId('repos-add').fill(path.join(scratch, 'plain'));
  await page.getByTestId('repos-add').press('Enter');
  await expect(page.getByTestId('repos-error')).toContainText("isn't a git repository");
  await expect(page.getByTestId('repo-row')).toHaveCount(0);
});

test('create a project with a new company and a repo; it lands on the Gantt and its pile shows', async ({ page }) => {
  await page.goto('/projects');
  await page.getByTestId('new-project').click();
  await page.getByTestId('project-name').fill('Search relevance v2');
  await page.getByTestId('project-start').fill('2025-11-03');
  await page.getByTestId('project-ongoing').uncheck();
  await page.getByTestId('project-end').fill('2025-10-01');
  await expect(page.getByTestId('project-save')).toBeDisabled(); // ends before it starts
  await page.getByTestId('project-end').fill('2026-02-27');
  await page.getByTestId('project-company').selectOption({ label: '+ New company…' });
  await page.getByTestId('project-new-company').fill('Quillfeather');
  await page.getByTestId('project-add-repo').fill(path.join(scratch, 'my-app'));
  await page.getByTestId('project-add-repo').press('Enter');
  await expect(page.getByTestId('project-repos')).toContainText('example/my-app');
  await page.getByRole('radio', { name: 'Use #2fb37e' }).click();
  await page.getByTestId('project-save').click();

  await expect(page.getByTestId('project-dialog')).toBeHidden();
  const bar = page.getByTestId('gantt-bar').filter({ hasText: 'Search relevance v2' });
  await expect(bar).toHaveCSS('background-color', 'rgb(47, 179, 126)');
  await expect(page.getByTestId('gantt-company')).toHaveText(/Quillfeather/);
  await expect(page.getByTestId('pile')).toContainText('Search relevance v2');
  await expect(page.getByTestId('pile-empty')).toBeVisible();
  await expect(page.getByTestId('repo-row')).toContainText('example/my-app');
});

test('an ongoing project is striped; any colour keeps its text readable and is saved', async ({ page, request }) => {
  const res = await request.post('/api/projects', { data: { name: 'Incident tooling', start: '2026-07-20', end: null, color: '#111111' } });
  expect(res.status()).toBe(201);
  const p = await res.json();
  await page.goto(`/projects?p=${p.id}`);
  const bar = page.locator(`[data-project="${p.id}"]`);
  await expect(bar).toHaveCSS('color', 'rgb(255, 255, 255)');
  expect(await bar.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('repeating-linear-gradient');
  await page.getByLabel('Any colour').fill('#ffff00');
  await expect(bar).toHaveCSS('background-color', 'rgb(255, 255, 0)');
  await expect(bar).toHaveCSS('color', 'rgb(29, 26, 23)');
  await expect.poll(async () => (await (await request.get(`/api/projects/${p.id}`)).json()).color).toBe('#ffff00');

  // a colour picked just before switching to another project is still saved (the pile unmounts mid-debounce)
  await page.getByRole('radio', { name: 'Use #6a5cf0' }).click();
  await page.getByTestId('gantt-bar').filter({ hasText: 'Search relevance v2' }).click();
  await expect.poll(async () => (await (await request.get(`/api/projects/${p.id}`)).json()).color).toBe('#6a5cf0');
});

test('delete a project, then Undo brings it back', async ({ page }) => {
  await page.goto('/projects');
  await page.getByTestId('gantt-bar').filter({ hasText: 'Incident tooling' }).click();
  await page.getByTestId('pile-delete').click();
  await expect(page.getByTestId('delete-dialog')).toContainText('Nothing is tagged with it');
  await page.getByTestId('delete-confirm').click();
  await expect(page.getByTestId('toast')).toContainText('Deleted Incident tooling');
  await expect(page.getByTestId('gantt-bar').filter({ hasText: 'Incident tooling' })).toHaveCount(0);
  await page.getByTestId('toast').getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('gantt-bar').filter({ hasText: 'Incident tooling' })).toHaveCount(1);
});

test('deleting a company moves its projects to "No company"', async ({ page }) => {
  await page.goto('/projects');
  await page.getByTestId('gantt-company').filter({ hasText: 'Quillfeather' }).click();
  await page.getByTestId('company-delete').click();
  await expect(page.getByTestId('company-confirm')).toContainText('No company');
  await page.getByTestId('company-delete-confirm').click();
  await expect(page.getByTestId('toast')).toContainText('Deleted Quillfeather');
  await expect(page.getByTestId('gantt-company')).toHaveCount(0);
  const none = page.getByTestId('gantt-lane').filter({ hasText: 'No company' });
  await expect(none.getByTestId('gantt-bar')).toHaveCount(2);
});
