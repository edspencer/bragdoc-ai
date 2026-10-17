// `npm run check:nul`: fail if any JS/TS source in the repo contains a raw NUL (0x00) byte.
//
// Why: a NUL is legal inside a JS/TS string literal and behaves exactly like the escape \u0000 at run time, so nothing
// about the program reveals it. What it breaks is tooling: ripgrep and grep classify any file containing a NUL as
// binary and silently skip it during a recursive search, with the same exit code as an honest "no matches". The byte
// is also invisible in a diff, so review can't catch it, and neither can the typecheck or the tests. The author's
// sibling project Paddock lost 1,249 lines of its server to every search this way before a check like this one existed.
//
// The fix is always the same: write the six-character escape \u0000 instead of the raw byte.
//
// Scope: every .ts/.tsx/.mjs/.js file in the repo except dependencies and build output (including website/, once it
// exists). Data files (.json, .md) aren't scanned: a NUL in a fixture is more likely to be deliberate.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.astro', '.vite', '.git']);
const EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.js']);

function collect(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) found.push(...collect(path.join(dir, entry.name)));
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) found.push(path.join(dir, entry.name));
  }
  return found;
}

/** Every NUL in the buffer, as 1-based line:column. */
function nulPositions(buf) {
  const hits = [];
  let line = 1;
  let col = 1;
  for (const byte of buf) {
    if (byte === 0) hits.push(`${line}:${col}`);
    if (byte === 0x0a) {
      line += 1;
      col = 1;
    } else col += 1;
  }
  return hits;
}

const files = collect(ROOT).sort();
const offenders = [];
for (const file of files) {
  const buf = readFileSync(file);
  if (buf.includes(0)) offenders.push(...nulPositions(buf).map((pos) => `  ${path.relative(ROOT, file)}:${pos}  raw 0x00 byte`));
}

if (!offenders.length) {
  console.log(`check:nul: OK, no NUL bytes in ${files.length} JS/TS sources.`);
} else {
  console.error(`check:nul: FAILED, ${offenders.length} raw NUL byte(s):\n${offenders.join('\n')}\n`);
  console.error('A raw NUL makes grep/ripgrep skip the whole file as binary, silently. Replace it with the escape \\u0000.');
  process.exitCode = 1;
}
