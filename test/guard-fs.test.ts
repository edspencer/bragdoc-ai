// A static guard (adapted from Local Review's fsguard.test.ts): no server code may delete, truncate, overwrite or rename
// files except the reviewed call sites below: temp-file cleanup and no-clobber renames in server/store/safefs.ts,
// snapshot copying and pruning in server/store/backups.ts, and the platform's own files in server/atomic.ts,
// server/egress.ts (the network log) and server/home.ts (the legacy move-aside). If this fails, you've added a way to lose data: route it
// through server/store/safefs.ts instead (atomicWrite, renameNoClobber, moveToRemoved), or, after careful review,
// update ALLOWED with a comment saying why it can't destroy anything. Never loosen it just to make a test pass (D9's
// rule for guards holds here too).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './fixture.ts';

const SCANNED = ['server', 'shared'].map((d) => path.join(ROOT, d));

const RULES: Record<string, RegExp> = {
  unlink: /\bunlink(?:Sync)?\s*\(/g,
  rm: /\brm(?:Sync)?\s*\(/g,
  rmdir: /\brmdir(?:Sync)?\b/g,
  truncate: /\bftruncate(?:Sync)?\b|\btruncateSync\b|\.truncate\s*\(/g,
  writeFile: /\b(?:writeFile|appendFile)(?:Sync)?\s*\(|\bcreateWriteStream\b|\bopen(?:Sync)?\s*\([^)]*['"][wa]\+?['"]/g,
  rename: /\brename(?:Sync)?\s*\(/g,
  copy: /\b(?:copyFile|cp)(?:Sync)?\s*\(/g,
  // destructive fs functions imported by name (would dodge the call patterns above if renamed)
  fsImport: /import\s*\{[^}]*\b(?:unlink|unlinkSync|rm|rmSync|rmdir|rmdirSync|truncate|truncateSync|writeFile|writeFileSync|appendFile|appendFileSync|rename|renameSync|copyFile|copyFileSync|cp|cpSync)\b[^}]*\}\s*from\s*['"](?:node:)?fs/g,
  // shelling out to file tools
  shell: /\b(?:exec|execFile|execSync|execFileSync|spawn|spawnSync)\s*\(\s*['"](?:rm|mv|cp|truncate|dd|shred|find)['"]/g,
};

/** Exact counts per file (relative to the repo, with `/`). Anything not listed must be zero. */
const ALLOWED: Record<string, Record<string, number>> = {
  'server/store/safefs.ts': {
    unlink: 2, // removeOwnTemp (our .tmp only); renameNoClobber dropping the old name once hard-linked at the new one
    writeFile: 1, // atomicWrite's temp file, flag 'wx' (checked below)
    rename: 2, // atomicWrite's temp -> the file it updates; renameNoClobber's fallback after an existence check
  },
  'server/store/backups.ts': {
    rm: 1, // pruneSnapshots, only after assertPrunable (checked below)
    rename: 1, // a complete snapshot copy into its fresh name
    copy: 1, // a file into the brand-new snapshot directory, COPYFILE_EXCL
  },
  // the platform's own files, outside the store (D27): runtime.json, the network log, the starter config.yaml/.gitignore
  'server/atomic.ts': {
    unlink: 1, // removeOwnTemp: only a name matching TEMP_NAME (our own .tmp-<pid>-<hex>)
    writeFile: 2, // atomicWrite's temp file, flag 'wx'; appendLine's append to a log (logs/network.jsonl)
    rename: 1, // atomicWrite's temp -> its file (createOnly uses link(), which fails on an existing file)
  },
  'server/egress.ts': {
    rename: 1, // rotating logs/network.jsonl to network.1.jsonl at LOG_MAX_BYTES (the older log is replaced)
  },
  // `bragdoc service` (PR5): the unit file lives outside the store, in the service manager's own directory (D31)
  'server/platform/services.ts': {
    writeFile: 1, // writeIfChanged's dot-file temp next to the plist/unit (launchd never reads a half-written one)
    rename: 1, // that temp -> the plist/unit (~/Library/LaunchAgents/ai.bragdoc.local.plist, ~/.config/systemd/user/)
  },
  'server/platform/launchd.ts': {
    rm: 1, // `service uninstall`: our own plist (a fixed name), after bootout
  },
  'server/platform/systemd.ts': {
    rm: 1, // `service uninstall`: our own unit file (a fixed name), after disable --now
  },
  'server/home.ts': {
    rename: 2, // the old CLI's config.yml/cache/logs into legacy-cli.partial/, then that into legacy-cli/ (D28)
  },
  'server/import/lock.ts': {
    unlink: 1, // releasing cache/import.lock: a fixed name, and only while it still holds our own pid (D45)
  },
};

function files(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : /\.(ts|tsx|mts|js|mjs)$/.test(e.name) ? [p] : [];
  });
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
const read = (rel: string) => stripComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

test('no server code can delete, truncate or overwrite files outside the allow-list', () => {
  const all = SCANNED.flatMap(files);
  assert.ok(all.some((f) => f.endsWith(path.join('store', 'index.ts'))), 'scanning the right directories');
  const problems: string[] = [];
  for (const f of all) {
    const rel = path.relative(ROOT, f).split(path.sep).join('/');
    const src = stripComments(fs.readFileSync(f, 'utf8'));
    for (const [rule, re] of Object.entries(RULES)) {
      const n = src.match(re)?.length ?? 0;
      const allowed = ALLOWED[rel]?.[rule] ?? 0;
      if (n !== allowed) problems.push(`${rel}: ${n} × ${rule} (allowed ${allowed})`);
    }
  }
  assert.deepEqual(problems, []);
});

test("the one writeFile is a temp file opened with 'wx'; the prune and the copy are guarded", () => {
  const writes = read('server/store/safefs.ts').match(/writeFileSync\([^;]*\);/g) ?? [];
  assert.equal(writes.length, 1);
  assert.match(writes[0], /writeFileSync\(tmp,[^;]*flag: 'wx'/);
  const backups = read('server/store/backups.ts');
  assert.match(backups, /const target = assertPrunable\(home, backupsDir, n\);\s*fs\.rmSync\(target, \{ recursive: true \}\);/);
  assert.doesNotMatch(backups, /force:\s*true/);
  assert.match(backups, /copyFileSync\(src, dst, fs\.constants\.COPYFILE_EXCL\)/);
});

test('the guard catches the patterns it is meant to', () => {
  const hits = (code: string) => Object.entries(RULES).filter(([, re]) => (stripComments(code).match(re)?.length ?? 0) > 0).map(([k]) => k);
  assert.deepEqual(hits('fs.unlinkSync(f)'), ['unlink']);
  assert.deepEqual(hits('await fsp.rm(dir, { recursive: true })'), ['rm']);
  assert.deepEqual(hits('fs.rmdirSync(d)'), ['rmdir']);
  assert.deepEqual(hits('fs.truncateSync(f, 0)'), ['truncate']);
  assert.deepEqual(hits('fs.writeFileSync(f, s)'), ['writeFile']);
  assert.deepEqual(hits('fs.appendFileSync(f, s)'), ['writeFile']);
  assert.deepEqual(hits("fs.openSync(f, 'w')"), ['writeFile']);
  assert.deepEqual(hits('fs.renameSync(a, b)'), ['rename']);
  assert.deepEqual(hits('fs.copyFileSync(a, b)'), ['copy']);
  assert.deepEqual(hits("import { rmSync as r } from 'node:fs'"), ['fsImport']);
  assert.deepEqual(hits("execFile('rm', ['-rf', d])"), ['shell']);
  assert.deepEqual(hits("// fs.unlinkSync(f) in a comment\nconst t = truncate(s, 12); w.on('unlink', f); const u = 'http://x'"), []);
});
