// How the board draws stored evidence (src/board/evidence.ts): each kind to the kit's view, PRs from their key or URL,
// links only when they're http(s) (a hand edit can put anything in a file), and pasted pictures' generic names.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Evidence } from '../shared/schema/index.ts';
import { describe, toView } from '../src/board/evidence.ts';
import { fallbackTitle, localPreview } from '../src/board/composer.ts';

const SHA = 'a'.repeat(64);
const ID = '01M570000000000000000000A1';
const files = { [SHA]: { sha256: SHA, mime: 'image/png', bytes: 10, name: 'image.png' } };

test('a picture: thumbnail on the card, the file in the lightbox; a generic pasted name is not its caption', () => {
  const v = toView({ id: ID, kind: 'image', blob: SHA }, files);
  assert.deepEqual(v, { kind: 'image', src: `/api/evidence/${SHA}/thumb`, full: `/api/evidence/${SHA}`, alt: 'A pasted picture', caption: 'pasted' });
  const named = toView({ id: ID, kind: 'image', blob: SHA }, { [SHA]: { ...files[SHA], name: 'standup-praise.png' } });
  assert.equal(named.kind === 'image' && named.alt, 'standup-praise');
});

test('a PR from its key or its URL; without a title it is owner/repo#n', () => {
  const byKey = toView({ id: ID, kind: 'github_pr', externalKey: 'github_pr:acme/app#12' }, {});
  assert.deepEqual(byKey, { kind: 'github_pr', repo: 'acme/app', number: 12, title: undefined, url: 'https://github.com/acme/app/pull/12' });
  assert.equal(describe({ id: ID, kind: 'github_pr', url: 'https://github.com/acme/app/pull/9' }, {}), 'acme/app#9');
});

test('only http(s) URLs become links: a hand-edited javascript: URL is shown, not linked', () => {
  const bad = toView({ id: ID, kind: 'url', url: 'javascript:alert(1)' } as Evidence, {});
  assert.equal(bad.kind, 'file');
  const pr = toView({ id: ID, kind: 'github_pr', url: 'javascript:alert(1)', externalKey: 'github_pr:acme/app#3' } as Evidence, {});
  assert.equal(pr.kind === 'github_pr' && pr.url, 'https://github.com/acme/app/pull/3');
  assert.deepEqual(toView({ id: ID, kind: 'url', url: 'https://example.com/x' }, {}), { kind: 'link', url: 'https://example.com/x', title: undefined });
});

test('an incomplete item (a hand edit) still says what it is', () => {
  assert.deepEqual(toView({ id: ID, kind: 'quote' } as Evidence, {}), { kind: 'file', name: 'quote evidence (incomplete)' });
});

test('the composer: links classified without the server, and the title when nothing was typed', () => {
  assert.equal(localPreview('https://github.com/acme/app/pull/5').kind, 'github_pr');
  assert.deepEqual(localPreview('https://www.example.com/a'), { kind: 'url', url: 'https://www.example.com/a', domain: 'example.com' });
  const pr = { pid: 1, kind: 'link' as const, url: '', status: 'ready' as const, preview: localPreview('https://github.com/acme/app/pull/5') };
  assert.equal(fallbackTitle([pr]), 'acme/app#5');
  assert.equal(fallbackTitle([{ pid: 2, kind: 'link', url: '', status: 'ready', preview: localPreview('https://example.com/a') }]), 'example.com');
  assert.equal(fallbackTitle([]), '');
});
