// The platform's few writes into the data home: runtime.json, the network log, and the starter files home.ts lays
// down on first run. They're machine-written (or written once, create-only), so they don't go through the store
// (server/store/, PR3), which owns everything people and agents edit. The technique is Hallway's safefs.ts
// atomicWrite: a temp file next to the target, then a rename, so a crash never leaves half a file.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** Our temp files: `.<name>.tmp-<pid>-<hex>` (the data home's .gitignore lists them). */
const TEMP_NAME = /^\..+\.tmp-\d+-[0-9a-f]{8}$/;

/** `file` already exists, and the write was create-only. */
export class ExistsError extends Error {}

export interface WriteOptions {
  /** File mode for a new file (e.g. 0o600 for runtime.json); the umask can only narrow it. */
  mode?: number;
  /** Fail with ExistsError rather than replace an existing file: a user's .gitignore or config.yaml is theirs. */
  createOnly?: boolean;
}

/** Write `text` to `file` atomically, creating its directory. */
export function atomicWrite(file: string, text: string, { mode = 0o644, createOnly = false }: WriteOptions = {}): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(file)}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`);
  try {
    fs.writeFileSync(tmp, text, { encoding: 'utf8', flag: 'wx', mode });
    // an explicit chmod: the umask narrows `mode` at creation, but a 0600 file must be 0600 whatever the umask said
    fs.chmodSync(tmp, mode);
    if (createOnly) {
      try {
        fs.linkSync(tmp, file); // atomic, and fails if `file` exists (rename would silently replace it)
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new ExistsError(`${file} already exists; not replacing it`);
        throw e;
      }
      removeOwnTemp(tmp);
    } else fs.renameSync(tmp, file);
  } catch (e) {
    removeOwnTemp(tmp);
    throw e;
  }
}

function removeOwnTemp(tmp: string): void {
  if (!TEMP_NAME.test(path.basename(tmp))) return;
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* already gone (renamed into place) */
  }
}

/** Append one line to a log file (created 0600: a log can name what you connected to). */
export function appendLine(file: string, line: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, line.endsWith('\n') ? line : line + '\n', { encoding: 'utf8', mode: 0o600 });
}
