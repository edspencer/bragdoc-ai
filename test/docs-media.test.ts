// The capture rig's leak scan (tools/docs-media/leaks.ts): what a public screenshot must never show.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leakPattern } from '../tools/docs-media/leaks.ts';
import { SHOTS } from '../tools/docs-media/shots.ts';

const leaks = (text: string) => text.match(leakPattern('41234')) ?? [];

test('machine paths, private addresses, other ports and real emails are leaks', () => {
  for (const t of ['/home/someone/.bragdoc', '/Users/alex/Code', '/tmp/bragdoc-x', 'C:\\Users\\x', '192.168.1.20', '10.0.0.4', 'localhost:5050', '127.0.0.1:3000', '127.0.0.1:11500', 'localhost:11435', '127.0.0.1:114340', 'someone@gmail.com', 'http://localhost:41234/'])
    assert.ok(leaks(t).length, t);
});

test('the default port, ~ paths and .example addresses are fine', () => {
  for (const t of ['localhost:2724', '127.0.0.1:2724/mcp', 'http://127.0.0.1:11434', 'localhost:1234/v1', '127.0.0.1:8080/v1', 'POST 127.0.0.1:11434THIS COMPUTER', 'localhost, 127.0.0.1 and [::1]', '~/.bragdoc/achievements', 'alex@altimetry.example', 'dana@mail.quillfeather.example', 'wiki.altimetry.example'])
    assert.deepEqual(leaks(t), [], t);
});

test('shot names are unique', () => {
  assert.equal(new Set(SHOTS.map((s) => s.name)).size, SHOTS.length);
});
