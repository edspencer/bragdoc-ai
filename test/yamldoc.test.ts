// yamldoc: merge patches that keep comments, order and unknown keys; the front-matter split that keeps a body byte for
// byte; and locating a key's line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinFrontMatter, locate, mergePatch, parse, splitFrontMatter, stringify } from '../server/store/yamldoc.ts';

const HAND = `# My project, edited by hand
name: Apollo   # the codename
color: '#3b6cf6'
start: 2026-01-05
repoIds: [01JA0000000000000000000000]
# a note before an unknown key
custom: keep me
`;

test('a merge patch changes only what it names; comments, quoting, order and unknown keys stay', () => {
  const { doc } = parse(HAND);
  mergePatch(doc, { name: 'Apollo 2', end: '2026-06-30', repoIds: ['01JA0000000000000000000000', '01JB0000000000000000000000'] });
  const out = stringify(doc);
  assert.match(out, /^# My project, edited by hand\nname: Apollo 2 +# the codename\ncolor: '#3b6cf6'\nstart: 2026-01-05\nrepoIds: \[ 01JA0000000000000000000000, 01JB0000000000000000000000 \]\n# a note before an unknown key\ncustom: keep me\nend: 2026-06-30\n$/);
});

test('null removes a key; a nested mapping merges', () => {
  const { doc } = parse('a: 1\nb: 2\nquote:\n  text: hi # said\n  from: Sam\n');
  mergePatch(doc, { b: null, quote: { from: null, where: '#general' } });
  assert.equal(stringify(doc), 'a: 1\nquote:\n  text: hi # said\n  where: "#general"\n');
});

test('list items that are mappings keep their comments and lose keys the new item lacks', () => {
  const { doc } = parse('evidence:\n  # the PR\n  - id: A\n    kind: url\n    url: https://example.com/a\n    title: old\n');
  mergePatch(doc, { evidence: [{ id: 'A', kind: 'url', url: 'https://example.com/a' }, { id: 'B', kind: 'quote', quote: { text: 'nice' } }] });
  const out = stringify(doc);
  assert.match(out, /# the PR\n  - id: A/);
  assert.doesNotMatch(out, /title: old/);
  assert.match(out, /- id: B\n    kind: quote\n    quote:\n      text: nice/);
});

test('an empty or comment-only file becomes a mapping and keeps its comment', () => {
  const { doc } = parse('# just a comment\n');
  mergePatch(doc, { name: 'x' });
  assert.equal(stringify(doc), '# just a comment\n\nname: x\n');
});

test('a non-mapping file refuses a patch', () => {
  assert.throws(() => mergePatch(parse('- a\n- b\n').doc, { x: 1 }), /mapping/);
});

test('syntax errors carry a line and column; locate finds a key', () => {
  const bad = parse('name: ok\ncolor: [unclosed\n');
  assert.ok(bad.error);
  assert.equal(typeof bad.error!.line, 'number');
  const good = parse('a: 1\nb:\n  c: 2\n');
  assert.deepEqual(locate(good, ['b', 'c']), { line: 3, col: 6 });
  assert.deepEqual(locate(good, ['b', 'missing']), { line: 3, col: 3 });
  assert.ok(parse('a: 1\na: 2\n').error, 'duplicate keys are an error, not a silent last-wins');
});

test('front-matter: split and join, with the body kept byte for byte', () => {
  const body = '\nSome **markdown**.\r\n\n---\n\nA rule above, trailing spaces   \n\n\n';
  const raw = `---\ntitle: x\n---\n${body}`;
  const fm = splitFrontMatter(raw)!;
  assert.equal(fm.yaml, 'title: x\n');
  assert.equal(fm.body, body);
  assert.equal(joinFrontMatter(fm.yaml, fm.body), raw);
  assert.deepEqual(splitFrontMatter('---\n---\n'), { yaml: '', body: '', yamlLine: 2 });
  assert.equal(splitFrontMatter('no front matter\n'), null);
  assert.equal(splitFrontMatter('---\ntitle: never closed\n'), null);
  assert.equal(splitFrontMatter('﻿---\r\ntitle: bom\r\n---\r\nbody')!.body, 'body');
});

test('the fast reader (js-yaml) and the Document parser agree on what hand edits mean', async () => {
  const { readYaml } = await import('../server/store/yamldoc.ts');
  const samples = [
    'a: 2026-10-17\nb: 2026-10-17T09:00:00Z\nc: yes\nd: on\ne: 0o14\nf: 012\ng: .inf\nh: ~\ni: "007"\nj: 1e3\nk: 0x1F\n',
    'text: |\n  line one\n  line two\nfolded: >\n  a\n  b\n',
    "q: 'it''s'\nr: \"tab\\there\"\ns: [a, 'b', \"c\"]\nt: {x: 1, y: [2]}\n",
    'base: &b {x: 1}\nuse: *b\nmerged:\n  <<: *b\n  y: 2\n',
    '# only a comment\n',
    'emoji: 🚀\nunicode: café\n',
  ];
  for (const s of samples) {
    const fast = readYaml(s);
    assert.equal(fast.error, null, s);
    assert.deepEqual(fast.value, parse(s).doc.toJS() ?? null, s);
  }
  for (const bad of ['a: 1\na: 2\n', 'a: [1, 2\n', 'a: b: c\n', '\tkey: tab-indented\n']) {
    assert.ok(readYaml(bad).error, `js-yaml refuses ${JSON.stringify(bad)}`);
    assert.ok(parse(bad).error, `yaml refuses ${JSON.stringify(bad)}`);
  }
  // an alias bomb is refused rather than expanded
  const bomb = 'a: &a [x, x, x, x, x, x, x, x, x, x]\n' + Array.from({ length: 8 }, (_, i) => `${'bcdefghi'[i]}: &${'bcdefghi'[i]} [${Array(10).fill(i ? '*' + 'bcdefghi'[i - 1] : '*a').join(', ')}]`).join('\n') + '\n';
  assert.ok(readYaml(bomb).error);
});
