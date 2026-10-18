// Onboarding's "Your code" step (SPEC R10; RECOMMENDATIONS §7): find the git repos you've worked in lately, without
// scanning the disk and without running git.
//
// - The folder scan looks only inside the one folder you name: breadth first, at most 4 levels down, for at most 5 s.
//   It stops at a repo (a folder with a `.git`), and never goes into dot-folders (caches, `.git` itself),
//   node_modules or Library. A symlinked folder is followed only when it resolves inside the folder you named, and
//   never twice (so a symlink loop ends, and nothing outside the folder is listed).
// - Hints are other places that already know your recent projects: VS Code-style editors' recent windows, JetBrains'
//   recent projects, Claude Code's project list. Each is read only when you tick it, one small file each; only the
//   paths that are git repos come back.
// - Each repo is ranked by what its own .git says about recency, cheaply: the last line of logs/HEAD (a commit, a
//   checkout, a pull: its time and kind), the remote-tracking reflogs ("update by push"), and FETCH_HEAD's mtime.
//   Each gets a "why" in words ("you pushed 3 days ago").
// - Nothing found is stored. Only the repos you tick are added (as repos/<id>.yaml), by POST /api/discover/add.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandHome, parseRemotes } from './gitremote.js';
import { tildify } from './paths.js';
import { normalizeRemote } from './services/catalog.js';

/** How deep the folder scan goes below the folder you name (SPEC R10). */
export const SCAN_DEPTH = 4;
/** The scan's time box (SPEC R10): it stops and returns what it has. */
export const SCAN_MS = 5000;
/** More than this many repos is a folder of mirrors, not your work: stop there. */
export const SCAN_MAX_REPOS = 500;

/** Folders never gone into: big, not yours, or not code. Dot-folders are skipped by their dot. */
const SKIP = new Set(['node_modules', 'Library', 'Applications', '__pycache__', 'site-packages', 'Pods', 'vendor']);

/** The usual places people keep code, under home (SPEC R10), in the order they're offered. */
export const USUAL_FOLDERS = ['Code', 'code', 'src', 'dev', 'Developer', 'projects', 'Projects', 'work', 'repos', 'git', 'GitHub'];

export type DiscoverErrorCode = 'no_such_folder' | 'not_a_folder' | 'unreadable' | 'too_broad' | 'not_absolute';

export class DiscoverError extends Error {
  constructor(
    message: string,
    readonly code: DiscoverErrorCode,
  ) {
    super(message);
    this.name = 'DiscoverError';
  }
}

export type HintId = 'vscode' | 'jetbrains' | 'claude';

export type Signal = 'push' | 'commit' | 'pull' | 'fetch' | 'checkout' | 'merge' | 'other';

export interface FoundRepo {
  /** As people write it (`~/Code/my-app`). */
  path: string;
  name: string;
  /** Its remote (origin, else the first), normalised; null for a repo with no remote. */
  remoteUrl: string | null;
  /** The most recent thing its .git records, and what kind of thing it was. */
  lastActivity: string | null;
  signal: Signal | null;
  /** Why it's suggested, in words. */
  why: string;
  /** How it was found: the folder scan and/or a hint. */
  via: ('folder' | HintId)[];
  /** A worktree or submodule (its `.git` is a file): its history lives elsewhere, so it isn't read. */
  linked?: boolean;
}

export interface ScanResult {
  /** The folder scanned, as people write it; null when only hints were read. */
  root: string | null;
  repos: FoundRepo[];
  /** Folders looked in. */
  looked: number;
  /** Folders that couldn't be read (permissions). */
  unreadable: number;
  elapsedMs: number;
  /** The time box ran out: these are partial results. */
  timedOut: boolean;
  /** It stopped at SCAN_MAX_REPOS. */
  capped: boolean;
  /** Hints that were asked for but had nothing (not installed, nothing recent). */
  emptyHints: HintId[];
}

export interface DiscoverOptions {
  home?: string;
  now?: () => Date;
  /** For tests: a shorter time box. */
  timeMs?: number;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
}

// ---------------------------------------------------------------- the folder scan

interface Walked {
  repos: { abs: string; linked: boolean }[];
  looked: number;
  unreadable: number;
  timedOut: boolean;
  capped: boolean;
}

/** Check the folder you named: absolute (after `~`), a folder, readable, and not the whole disk. Its real path. */
export function checkRoot(root: string, home = os.homedir()): string {
  const typed = expandHome(root.trim(), home);
  if (!typed) throw new DiscoverError('Type a folder, like ~/Code.', 'not_absolute');
  if (!path.isAbsolute(typed)) throw new DiscoverError(`Give the folder's full path (like ~/Code), not "${root.trim()}".`, 'not_absolute');
  const abs = path.resolve(typed);
  if (path.parse(abs).root === abs) throw new DiscoverError('That’s the whole disk. Pick the folder you keep your code in, like ~/Code.', 'too_broad');
  let st: fs.Stats;
  try {
    st = fs.statSync(abs);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'EACCES' || code === 'EPERM') throw new DiscoverError(`BragDoc isn’t allowed to look in ${tildify(abs, home)}.`, 'unreadable');
    throw new DiscoverError(`There’s no folder at ${tildify(abs, home)}.`, 'no_such_folder');
  }
  if (!st.isDirectory()) throw new DiscoverError(`${tildify(abs, home)} is a file, not a folder.`, 'not_a_folder');
  let real: string;
  try {
    real = fs.realpathSync.native(abs);
    fs.accessSync(real, fs.constants.R_OK | fs.constants.X_OK);
  } catch {
    throw new DiscoverError(`BragDoc isn’t allowed to look in ${tildify(abs, home)}.`, 'unreadable');
  }
  return real;
}

const inside = (child: string, parent: string) => child === parent || child.startsWith(parent.endsWith(path.sep) ? parent : parent + path.sep);

/**
 * Folders in your home that macOS guards with a privacy prompt ("node would like to access your Documents"): never
 * gone into when scanning home itself, so naming `~` can't set off a string of OS prompts (or wait on one past the
 * time box). Name one of them as the folder to look in and it's scanned like any other.
 */
const MAC_PROTECTED = new Set(['Desktop', 'Documents', 'Downloads', 'Pictures', 'Movies', 'Music', 'Public']);

/** Resolves with what `p` resolves with, or with `undefined` if `ms` passes first (a hung network mount). */
function within<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([p, new Promise<undefined>((r) => (timer = setTimeout(() => r(undefined), Math.max(0, ms))))]).finally(() => clearTimeout(timer));
}

/**
 * Breadth first from `realRoot`, so the time box cuts off the deepest folders first. Each queued folder carries its
 * real path: a plain folder's is its parent's plus its name, a symlink's is resolved, and a real path is visited once.
 * A folder is checked again when it's read (it may have been swapped for a symlink since it was listed), and every
 * read races the time left, so a hung mount can't hold the scan past its deadline.
 */
async function walk(realRoot: string, deadline: number, now: () => number, o: { home: string; platform: NodeJS.Platform }): Promise<Walked> {
  const out: Walked = { repos: [], looked: 0, unreadable: 0, timedOut: false, capped: false };
  const seen = new Set<string>([realRoot]);
  let realHome: string | null = null;
  try {
    realHome = fs.realpathSync.native(o.home);
  } catch {
    /* no home: nothing to protect */
  }
  let queue: { dir: string; depth: number }[] = [{ dir: realRoot, depth: 0 }];
  while (queue.length) {
    const next: typeof queue = [];
    for (const { dir, depth } of queue) {
      if (now() > deadline) {
        out.timedOut = true;
        return out;
      }
      let entries: fs.Dirent[] | undefined;
      try {
        // still the folder that was listed, and still inside the one you named?
        const real = await within(fs.promises.realpath(dir), deadline - now());
        if (real === undefined) {
          out.timedOut = true;
          return out;
        }
        if (!inside(real, realRoot)) continue;
        entries = await within(fs.promises.readdir(real, { withFileTypes: true }), deadline - now());
      } catch {
        out.unreadable++;
        continue;
      }
      if (entries === undefined) {
        out.timedOut = true;
        return out;
      }
      out.looked++;
      const git = entries.find((e) => e.name === '.git');
      if (git) {
        // a .git that isn't a plain folder (a worktree's file, or a symlink) isn't followed: it may point outside
        out.repos.push({ abs: dir, linked: !git.isDirectory() });
        if (out.repos.length >= SCAN_MAX_REPOS) {
          out.capped = true;
          return out;
        }
        // a repo's insides are its own business; but the folder you named may be a repo itself (dotfiles in ~, a
        // ~/Code that's a checkout), and you asked for what's inside it
        if (depth > 0) continue;
      }
      if (depth >= SCAN_DEPTH) continue;
      const atHome = o.platform === 'darwin' && dir === realHome;
      for (const e of entries) {
        if (e.name.startsWith('.') || SKIP.has(e.name) || (atHome && MAC_PROTECTED.has(e.name))) continue;
        let real: string;
        if (e.isDirectory()) real = path.join(dir, e.name);
        else if (e.isSymbolicLink()) {
          try {
            real = await fs.promises.realpath(path.join(dir, e.name));
            if (!(await fs.promises.stat(real)).isDirectory()) continue;
          } catch {
            continue; // dangling
          }
          if (!inside(real, realRoot)) continue; // nothing outside the folder you named
        } else continue;
        if (seen.has(real)) continue; // a loop, or a second way to the same folder
        seen.add(real);
        next.push({ dir: real, depth: depth + 1 });
      }
    }
    queue = next;
  }
  return out;
}

// ---------------------------------------------------------------- recency, from the repo's own .git

/** The most of a file read to find its last line. Reflogs grow; their last line is what matters. */
const TAIL_BYTES = 4096;

function tail(file: string): string | null {
  let fd: number | null = null;
  try {
    const st = fs.statSync(file);
    if (!st.isFile()) return null;
    fd = fs.openSync(file, 'r');
    const len = Math.min(st.size, TAIL_BYTES);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, st.size - len);
    return buf.toString('utf8');
  } catch {
    return null;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

/** A reflog's last entry: when (from its own timestamp) and what (its message). */
export function lastReflogEntry(text: string): { at: Date; message: string } | null {
  const lines = text.split('\n').filter((l) => l.trim());
  const last = lines[lines.length - 1];
  if (!last) return null;
  // <old> <new> Name <email> <seconds> <tz>\t<message>
  const m = /^[0-9a-f]{7,64} [0-9a-f]{7,64} .*?> (\d{9,11}) [+-]\d{4}\t?(.*)$/.exec(last);
  if (!m) return null;
  return { at: new Date(Number(m[1]) * 1000), message: m[2] };
}

function kindOf(message: string): Signal {
  if (/^commit/.test(message)) return 'commit';
  if (/^pull/.test(message)) return 'pull';
  if (/^checkout/.test(message)) return 'checkout';
  if (/^(merge|rebase)/.test(message)) return 'merge';
  if (/update by push/.test(message)) return 'push';
  if (/^fetch/.test(message)) return 'fetch';
  return 'other';
}

const mtime = (file: string): Date | null => {
  try {
    return fs.statSync(file).mtime;
  } catch {
    return null;
  }
};

interface Event {
  at: Date;
  kind: Signal;
}

/** The remote-tracking reflogs (logs/refs/remotes/<remote>/<branch>…), a few levels and a few dozen files at most. */
function remoteReflogs(dir: string, depth = 0, out: string[] = []): string[] {
  if (depth > 3 || out.length >= 40) return out;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (out.length >= 40) break;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) remoteReflogs(p, depth + 1, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

/** What a repo's .git (a folder) says about when you last worked in it. */
export function recency(repoDir: string): { commit: Event | null; latest: Event | null } {
  const git = path.join(repoDir, '.git');
  const events: Event[] = [];
  const head = tail(path.join(git, 'logs', 'HEAD'));
  const last = head ? lastReflogEntry(head) : null;
  if (last) events.push({ at: last.at, kind: kindOf(last.message) });
  // the last commit specifically, for "pulled 3 days ago; your last commit was 6 weeks ago"
  let commit: Event | null = last && kindOf(last.message) === 'commit' ? { at: last.at, kind: 'commit' } : null;
  if (!commit && head) {
    for (const line of head.split('\n').reverse()) {
      const e = lastReflogEntry(line);
      if (e && kindOf(e.message) === 'commit') {
        commit = { at: e.at, kind: 'commit' };
        break;
      }
    }
  }
  for (const f of remoteReflogs(path.join(git, 'logs', 'refs', 'remotes'))) {
    const t = tail(f);
    const e = t ? lastReflogEntry(t) : null;
    if (e) events.push({ at: e.at, kind: kindOf(e.message) === 'push' ? 'push' : 'fetch' });
  }
  const fetched = mtime(path.join(git, 'FETCH_HEAD'));
  if (fetched) events.push({ at: fetched, kind: 'fetch' });
  if (!events.length) {
    // a repo with no reflog (a fresh clone with core.logAllRefUpdates off): its HEAD file's mtime at least
    const h = mtime(path.join(git, 'HEAD'));
    if (h) events.push({ at: h, kind: 'other' });
  }
  // the newest; on a tie, the more telling kind (a push beats the fetch it also updated)
  const rank: Record<Signal, number> = { push: 6, commit: 5, merge: 4, pull: 3, checkout: 2, fetch: 1, other: 0 };
  const latest = events.sort((a, b) => b.at.getTime() - a.at.getTime() || rank[b.kind] - rank[a.kind])[0] ?? null;
  return { commit, latest };
}

/** "today", "yesterday", "3 days ago", "6 weeks ago", "4 months ago", "over a year ago". */
export function ago(at: Date, now: Date): string {
  const days = Math.floor((now.getTime() - at.getTime()) / 86_400_000);
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return 'over a year ago';
}

const VERB: Record<Signal, string> = {
  push: 'you pushed',
  commit: 'you committed',
  merge: 'you merged',
  pull: 'you pulled',
  checkout: 'you switched branch',
  fetch: 'fetched',
  other: 'last touched',
};

export function whyOf(r: { commit: Event | null; latest: Event | null }, now: Date): string {
  if (!r.latest) return 'no history to go on';
  const main = `${VERB[r.latest.kind]} ${ago(r.latest.at, now)}`;
  if (r.latest.kind !== 'commit' && r.commit && r.latest.kind !== 'push') {
    const c = ago(r.commit.at, now);
    if (c !== ago(r.latest.at, now)) return `${main}; your last commit was ${c}`;
  }
  return main;
}

/** The remote of a repo whose .git is a folder: its config only. */
function remoteOf(repoDir: string): string | null {
  try {
    const st = fs.statSync(path.join(repoDir, '.git', 'config'));
    if (!st.isFile() || st.size > 64 * 1024) return null;
    const remotes = parseRemotes(fs.readFileSync(path.join(repoDir, '.git', 'config'), 'utf8'));
    const pick = remotes.find((r) => r.name === 'origin') ?? remotes[0];
    // a remote we can't normalise could carry credentials (https://user:token@…): left out, as repos.ts does
    return pick ? (normalizeRemote(pick.url)?.url ?? null) : null;
  } catch {
    return null;
  }
}

function describe(abs: string, linked: boolean, via: FoundRepo['via'], home: string, now: Date): FoundRepo {
  const remoteUrl = linked ? null : remoteOf(abs);
  const r = linked ? { commit: null, latest: null } : recency(abs);
  return {
    path: tildify(abs, home),
    name: path.basename(abs),
    remoteUrl,
    lastActivity: r.latest?.at.toISOString() ?? null,
    signal: r.latest?.kind ?? null,
    why: linked ? 'a linked worktree or submodule' : whyOf(r, now),
    via,
    ...(linked ? { linked: true } : {}),
  };
}

// ---------------------------------------------------------------- hints: places that already know your projects

interface HintSource {
  id: HintId;
  label: string;
  /** What it reads, in words, for the checkbox. */
  line: string;
  /** The files it would read (existing or not). */
  files: (o: Required<Pick<DiscoverOptions, 'home' | 'env' | 'platform'>>) => string[];
  /** The folders those files name. */
  read: (file: string, home: string) => string[];
}

const MAX_HINT_BYTES = 4 * 1024 * 1024;
/** Claude Code: at most this many project folders, and session files looked at (by date) in each. */
const CLAUDE_MAX_PROJECTS = 200;
const CLAUDE_MAX_SESSIONS = 50;

function readHint(file: string): string | null {
  try {
    const st = fs.statSync(file);
    if (!st.isFile() || st.size > MAX_HINT_BYTES) return null;
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

/** The per-app config folder: ~/Library/Application Support on macOS, $XDG_CONFIG_HOME (~/.config) elsewhere. */
function appConfigDirs(o: Required<Pick<DiscoverOptions, 'home' | 'env' | 'platform'>>): string[] {
  if (o.platform === 'darwin') return [path.join(o.home, 'Library', 'Application Support')];
  if (o.platform === 'win32') return o.env.APPDATA ? [o.env.APPDATA] : [];
  return [o.env.XDG_CONFIG_HOME || path.join(o.home, '.config')];
}

const listDir = (dir: string): string[] => {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
};

/** Every `file:///…` string anywhere in a JSON value: the folders VS Code-style editors had open. */
function fileUris(v: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 12 || out.length > 500) return out;
  if (typeof v === 'string') {
    if (v.startsWith('file:///')) {
      try {
        out.push(fileURLToPath(v));
      } catch {
        /* not a local path */
      }
    }
  } else if (Array.isArray(v)) for (const x of v) fileUris(x, out, depth + 1);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) fileUris(x, out, depth + 1);
  return out;
}

export const HINTS: HintSource[] = [
  {
    id: 'vscode',
    label: 'VS Code, Cursor and Windsurf',
    line: 'The folders they last had open (their storage.json). Nothing else in their settings is read.',
    files: (o) =>
      appConfigDirs(o).flatMap((d) => ['Code', 'Code - Insiders', 'VSCodium', 'Cursor', 'Windsurf'].map((app) => path.join(d, app, 'User', 'globalStorage', 'storage.json'))),
    read: (file) => {
      const text = readHint(file);
      if (!text) return [];
      try {
        return fileUris(JSON.parse(text));
      } catch {
        return [];
      }
    },
  },
  {
    id: 'jetbrains',
    label: 'JetBrains IDEs',
    line: 'Their list of recent projects (recentProjects.xml), for IntelliJ, WebStorm, PyCharm and the rest.',
    files: (o) => appConfigDirs(o).flatMap((d) => listDir(path.join(d, 'JetBrains')).map((v) => path.join(d, 'JetBrains', v, 'options', 'recentProjects.xml'))),
    read: (file, home) => {
      const text = readHint(file);
      if (!text) return [];
      return [...text.matchAll(/<entry key="([^"]+)"/g)].map((m) =>
        m[1].replace(/\$USER_HOME\$/g, home).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      );
    },
  },
  {
    id: 'claude',
    label: 'Claude Code',
    line: 'The folders you’ve run it in: the first line of each project’s newest session says where. Not the conversations.',
    files: (o) => {
      const root = path.join(o.env.CLAUDE_CONFIG_DIR || path.join(o.home, '.claude'), 'projects');
      return listDir(root)
        .slice(0, CLAUDE_MAX_PROJECTS)
        .map((d) => path.join(root, d));
    },
    // a project folder: the newest .jsonl's first few KB carry the session's `cwd` (the folder name is lossy)
    read: (dir) => {
      const newest = listDir(dir)
        .filter((f) => f.endsWith('.jsonl'))
        .slice(0, CLAUDE_MAX_SESSIONS)
        .map((f) => ({ f, t: mtime(path.join(dir, f))?.getTime() ?? 0 }))
        .sort((a, b) => b.t - a.t)[0];
      if (!newest) return [];
      let fd: number | null = null;
      try {
        fd = fs.openSync(path.join(dir, newest.f), 'r');
        const buf = Buffer.alloc(16 * 1024);
        const n = fs.readSync(fd, buf, 0, buf.length, 0);
        const m = /"cwd"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(buf.subarray(0, n).toString('utf8'));
        return m ? [JSON.parse(`"${m[1]}"`) as string] : [];
      } catch {
        return [];
      } finally {
        if (fd !== null) fs.closeSync(fd);
      }
    },
  },
];

function opts(o: DiscoverOptions) {
  return { home: o.home ?? os.homedir(), env: o.env ?? process.env, platform: o.platform ?? process.platform, now: o.now ?? (() => new Date()) };
}

/**
 * The git repo a hint's folder is in: the folder itself, or (an editor opened a subfolder, `repo/packages/web`) the
 * nearest parent with a `.git`, a few levels up at most and never home or the disk's root. Only `.git` is looked at.
 */
function repoAt(abs: string, home: string): { top: string; linked: boolean } | null {
  let dir = abs;
  for (let i = 0; i < 4; i++) {
    if (dir === home || path.parse(dir).root === dir) return null;
    try {
      const st = fs.lstatSync(path.join(dir, '.git'));
      return { top: dir, linked: !st.isDirectory() };
    } catch {
      dir = path.dirname(dir);
    }
  }
  return null;
}

/** A turn of the event loop, so a long scan never holds up other requests. */
const breathe = () => new Promise<void>((r) => setImmediate(r));

// ---------------------------------------------------------------- the API

export interface Suggestions {
  home: string;
  /** The usual code folders that exist here, as people write them. */
  folders: string[];
  hints: { id: HintId; label: string; line: string; available: boolean }[];
}

/** Which usual folders exist, and which hint sources have something to read: a look at names, nothing is opened. */
export function suggestions(o: DiscoverOptions = {}): Suggestions {
  const { home, env, platform } = opts(o);
  const isDir = (p: string) => {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  };
  // case-insensitive file systems answer for both `Code` and `code`: list a folder once, under its real name
  const real = new Set<string>();
  const folders: string[] = [];
  for (const f of USUAL_FOLDERS) {
    const p = path.join(home, f);
    if (!isDir(p)) continue;
    const listed = listDir(home).includes(f);
    const key = (() => {
      try {
        return fs.realpathSync.native(p).toLowerCase();
      } catch {
        return p.toLowerCase();
      }
    })();
    if (!listed || real.has(key)) continue;
    real.add(key);
    folders.push(tildify(p, home));
  }
  return {
    home: '~',
    folders,
    hints: HINTS.map((h) => ({ id: h.id, label: h.label, line: h.line, available: h.files({ home, env, platform }).some((f) => fs.existsSync(f)) })),
  };
}

/**
 * Scan: the folder you named (if any) and the hints you ticked (if any). Repos found both ways are listed once.
 * Throws DiscoverError for a folder that can't be scanned (before anything is read).
 */
export async function scan(input: { root?: string | null; hints?: HintId[] }, o: DiscoverOptions = {}): Promise<ScanResult> {
  const { home, env, platform, now } = opts(o);
  const started = now().getTime();
  const realRoot = input.root ? checkRoot(input.root, home) : null;
  const byPath = new Map<string, { abs: string; linked: boolean; via: FoundRepo['via'] }>();
  let walked: Walked = { repos: [], looked: 0, unreadable: 0, timedOut: false, capped: false };
  if (realRoot) {
    // the walk leaves a fifth of the time for the hints you ticked, which are a few small files
    const budget = (o.timeMs ?? SCAN_MS) * (input.hints?.length ? 0.8 : 1);
    walked = await walk(realRoot, started + budget, () => now().getTime(), { home, platform });
    for (const r of walked.repos) byPath.set(r.abs, { ...r, via: ['folder'] });
  }
  // one deadline for the whole scan: the walk, then the hints, then reading each repo's history
  const deadline = started + (o.timeMs ?? SCAN_MS);
  let timedOut = walked.timedOut;
  const emptyHints: HintId[] = [];
  let reads = 0;
  for (const id of new Set(input.hints ?? [])) {
    const h = HINTS.find((x) => x.id === id);
    if (!h) continue;
    let n = 0;
    for (const file of h.files({ home, env, platform })) {
      if (now().getTime() > deadline) {
        timedOut = true;
        break;
      }
      if (++reads % 20 === 0) await breathe();
      for (const p of h.read(file, home)) {
        if (!path.isAbsolute(p)) continue;
        const at = repoAt(path.resolve(p), home);
        if (!at) continue;
        n++;
        let real = at.top;
        try {
          real = fs.realpathSync.native(at.top);
        } catch {
          /* keep as given */
        }
        const had = byPath.get(real);
        if (had) {
          if (!had.via.includes(id)) had.via.push(id);
        } else if (byPath.size < SCAN_MAX_REPOS) byPath.set(real, { abs: real, linked: at.linked, via: [id] });
      }
    }
    if (!n && !timedOut) emptyHints.push(id);
  }
  const at = now();
  const described: FoundRepo[] = [];
  for (const r of byPath.values()) {
    // out of time: the rest are listed without their history (still yours to tick)
    const late = now().getTime() > deadline;
    if (late) timedOut = true;
    described.push(late ? { ...describe(r.abs, true, r.via, home, at), why: 'not looked at: out of time', linked: undefined } : describe(r.abs, r.linked, r.via, home, at));
    if (described.length % 25 === 0) await breathe();
  }
  // the most recent first; repos with nothing to go on last, by name
  const repos = described.sort((a, b) => (b.lastActivity ?? '').localeCompare(a.lastActivity ?? '') || a.path.localeCompare(b.path));
  return {
    root: realRoot ? tildify(realRoot, home) : null,
    repos,
    looked: walked.looked,
    unreadable: walked.unreadable,
    elapsedMs: now().getTime() - started,
    timedOut,
    capped: walked.capped,
    emptyHints,
  };
}
