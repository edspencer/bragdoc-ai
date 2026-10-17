// Project colours (src/lib/colour.ts): legible text on any colour, and stable tilts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROJECT_SWATCHES, inkOn, luminance, parseHex, safeColour, tilt, NEUTRAL_TAPE } from '../src/lib/colour.ts';

const DARK = '#1d1a17';
const WHITE = '#ffffff';

test('parseHex reads #rgb and #rrggbb in any case, and nothing else', () => {
  assert.deepEqual(parseHex('#ef5a3c'), [239, 90, 60]);
  assert.deepEqual(parseHex('#FFF'), [255, 255, 255]);
  assert.deepEqual(parseHex('abc'), [170, 187, 204]);
  for (const bad of ['', '#12', '#12345', 'red', '#ggg', 'url(x)', '#1234567']) assert.equal(parseHex(bad), null, bad);
});

test('inkOn picks white on dark colours and near-black on light ones', () => {
  assert.equal(inkOn('#000000'), WHITE);
  assert.equal(inkOn('#ffffff'), DARK);
  assert.equal(inkOn('#ef5a3c'), WHITE); // tomato
  assert.equal(inkOn('#3b6cf6'), WHITE); // blue
  assert.equal(inkOn('#e8c547'), DARK); // yellow
  assert.equal(inkOn('#f5a524'), DARK); // amber
  assert.equal(inkOn('#e9961a'), DARK); // the Found pill
  assert.equal(inkOn('#1d1a17'), WHITE);
  assert.equal(inkOn('not a colour'), DARK);
});

test('any colour gets text with at least 3:1 contrast (every swatch, and a sweep of greys and hues)', () => {
  const contrast = (a: string, b: string) => {
    const [la, lb] = [luminance(parseHex(a)!), luminance(parseHex(b)!)].sort((x, y) => y - x);
    return (la + 0.05) / (lb + 0.05);
  };
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  const sweep: string[] = [...PROJECT_SWATCHES];
  for (let v = 0; v < 256; v += 5) sweep.push(`#${hex(v)}${hex(v)}${hex(v)}`, `#${hex(v)}${hex(255 - v)}80`, `#ff${hex(v)}00`, `#00${hex(v)}ff`);
  for (const s of sweep) assert.ok(contrast(s, inkOn(s)) >= 2.99, `${s} on ${inkOn(s)}: ${contrast(s, inkOn(s)).toFixed(2)}`);
});

test('safeColour passes hex colours through and replaces anything else', () => {
  assert.equal(safeColour('#3b6cf6'), '#3b6cf6');
  assert.equal(safeColour(undefined), NEUTRAL_TAPE);
  assert.equal(safeColour('red; background: url(x)'), NEUTRAL_TAPE);
});

test('tilt is stable per id and within ±max', () => {
  assert.equal(tilt('a1'), tilt('a1'));
  for (const id of ['a', 'b', 'achievement-01', 'x'.repeat(300)]) {
    assert.ok(Math.abs(tilt(id, 1.4)) <= 1.4);
    assert.ok(Math.abs(tilt(id, 0.4)) <= 0.4);
  }
});
