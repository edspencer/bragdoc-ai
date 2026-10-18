// Adding a repo by its folder (SPEC R6): is it a git checkout, and what's its remote (D46)? This reads exactly one repo's
// git config: `<folder>/.git/config`, or, for a linked worktree or submodule (where `.git` is a file saying
// `gitdir: …`), the config that points at. Nothing else on the disk is listed or scanned (onboarding's folder scan is
// a separate, bounded feature), and nothing is run: no `git` subprocess, so it works without git installed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export class NotARepoError extends Error {
  constructor(
    message: string,
    readonly code: 'no_such_folder' | 'not_a_repo',
  ) {
    super(message);
    this.name = 'NotARepoError';
  }
}

/** `~` and `~/x` → the home folder; anything else as given (resolved against nothing: it must be absolute). */
export function expandHome(p: string, home = os.homedir()): string {
  if (p === '~') return home;
  if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(home, p.slice(2));
  return p;
}

/**
 * The remotes in a git config file's text, in file order: `[remote "origin"]` … `url = …`. Enough of git's INI
 * dialect for this: sections, `key = value`, comments (`#`, `;`), quoted values.
 */
export function parseRemotes(config: string): { name: string; url: string }[] {
  const out: { name: string; url: string }[] = [];
  let remote: string | null = null;
  for (const raw of config.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = /^\[\s*([\w.-]+)(?:\s+"((?:[^"\\]|\\.)*)")?\s*\]/.exec(line);
    if (sec) {
      remote = sec[1].toLowerCase() === 'remote' && sec[2] !== undefined ? sec[2] : null;
      continue;
    }
    if (remote === null) continue;
    const kv = /^([\w-]+)\s*=\s*(.*)$/.exec(line);
    if (!kv || kv[1].toLowerCase() !== 'url') continue;
    let v = kv[2].replace(/\s[#;].*$/, '').trim();
    if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) v = v.slice(1, -1);
    if (v && !out.some((r) => r.name === remote)) out.push({ name: remote, url: v });
  }
  return out;
}

/** The most of a git file this reads: configs are a few hundred bytes; anything huge isn't one. */
const MAX_BYTES = 64 * 1024;

/** A small regular file's text: never a FIFO or device (a read would block the server), never a huge file. */
function readSmall(file: string): string {
  const st = fs.statSync(file);
  if (!st.isFile() || st.size > MAX_BYTES) throw new NotARepoError('its git files don\'t look right', 'not_a_repo');
  return fs.readFileSync(file, 'utf8');
}

/** The config file of the repo whose `.git` is at `dotGit` (a folder, or a `gitdir:` file). */
function configFile(dotGit: string, st: fs.Stats): string {
  if (st.isDirectory()) return path.join(dotGit, 'config');
  if (!st.isFile()) throw new NotARepoError('its .git is neither a folder nor a file', 'not_a_repo');
  const m = /^gitdir:\s*(.+?)\s*$/m.exec(readSmall(dotGit));
  if (!m) throw new NotARepoError('its .git file doesn\'t say where the repository is', 'not_a_repo');
  const gitdir = path.resolve(path.dirname(dotGit), m[1]);
  // a linked worktree's gitdir holds `commondir`, pointing at the main repository (which has the config)
  try {
    const common = readSmall(path.join(gitdir, 'commondir')).trim();
    if (common) return path.join(path.resolve(gitdir, common), 'config');
  } catch {
    /* a submodule: its gitdir has its own config */
  }
  return path.join(gitdir, 'config');
}

/**
 * Check `folder` is a git checkout and read its remote: `origin`, else the first remote, else none (a local-only
 * repo is fine). Throws NotARepoError with a sentence for people otherwise.
 */
export function readLocalRepo(folder: string, home?: string): { path: string; remoteUrl: string | null } {
  const typed = expandHome(folder.trim(), home);
  // one spelling per folder (`~/Code/./my-app/` is `~/Code/my-app`), so adding it twice finds the first
  const abs = path.isAbsolute(typed) ? path.resolve(typed) : typed;
  if (!path.isAbsolute(abs)) throw new NotARepoError(`give the folder's full path (like ~/Code/my-app), not "${folder}"`, 'no_such_folder');
  let st: fs.Stats;
  try {
    st = fs.statSync(abs);
  } catch {
    throw new NotARepoError(`there's no folder at ${folder}`, 'no_such_folder');
  }
  if (!st.isDirectory()) throw new NotARepoError(`${folder} is a file, not a folder`, 'no_such_folder');
  const dotGit = path.join(abs, '.git');
  let gst: fs.Stats;
  try {
    gst = fs.statSync(dotGit);
  } catch {
    throw new NotARepoError(`${folder} isn't a git repository (it has no .git folder). Give the top folder of a checkout.`, 'not_a_repo');
  }
  let text = '';
  try {
    text = readSmall(configFile(dotGit, gst));
  } catch (e) {
    if (e instanceof NotARepoError) throw e;
    throw new NotARepoError(`${folder} looks like a git repository, but its config can't be read`, 'not_a_repo');
  }
  const remotes = parseRemotes(text);
  const pick = remotes.find((r) => r.name === 'origin') ?? remotes[0];
  return { path: abs, remoteUrl: pick?.url ?? null };
}
