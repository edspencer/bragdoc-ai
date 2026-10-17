// The data home's layout on first run (SPEC R2), adapted from Hallway's server/store/home.ts: idempotent, and it never
// replaces a file that exists. A user's config.yaml or .gitignore is theirs.
//
// Before anything is created, the old BragDoc CLI (@bragdoc/cli) is moved out of the way. It used ~/.bragdoc too, for
// a config.yml (which can hold a cloud auth token), cache/ and logs/. Those move, by rename (so modes and contents are
// kept exactly), into legacy-cli/; nothing is deleted (D7). It has to happen before we create our own cache/ and
// logs/, or the two would mix. If the old CLI is still installed it'll recreate config.yml; then we say so rather
// than move it again on every start.
import fs from 'node:fs';
import path from 'node:path';
import type { Notice } from '../shared/api.js';
import { ExistsError, atomicWrite } from './atomic.js';
import { CONFIG_TEMPLATE } from './config.js';

/** Where things live in the data home that the platform (not the store) owns. */
export function homePaths(dataDir: string) {
  return {
    dataDir,
    config: path.join(dataDir, 'config.yaml'),
    gitignore: path.join(dataDir, '.gitignore'),
    runtime: path.join(dataDir, 'runtime.json'),
    secrets: path.join(dataDir, 'secrets.yaml'),
    logs: path.join(dataDir, 'logs'),
    networkLog: path.join(dataDir, 'logs', 'network.jsonl'),
    cache: path.join(dataDir, 'cache'),
    backups: path.join(dataDir, 'backups'),
    legacy: path.join(dataDir, 'legacy-cli'),
  };
}

/** The machine-written, regenerable or private entries: in the generated .gitignore, so the data home can be a repo. */
export const GITIGNORED = ['/runtime.json', '/secrets.yaml', '/logs/', '/cache/', '/backups/', '/legacy-cli/'] as const;

export const GITIGNORE = `# Written by BragDoc. Your data home can be a git repository: these are machine-written, regenerable or private
# (runtime.json holds the MCP token, secrets.yaml a GitHub token), so they stay out of it. Edit freely; BragDoc won't
# rewrite this file.
${GITIGNORED.join('\n')}
.*.tmp-*
`;

/** What the old CLI kept in ~/.bragdoc. */
export const LEGACY_ENTRIES = ['config.yml', 'cache', 'logs'] as const;

export interface HomeResult {
  /** Paths created on this run. */
  created: string[];
  /** The old CLI's entries moved into legacy-cli/ on this run. */
  moved: string[];
  notices: Notice[];
}

const exists = (p: string) => fs.existsSync(p);

/**
 * Has BragDoc (this one, not the old CLI) run here before? Any of these says so: config.yaml, runtime.json (written on
 * every start) or legacy-cli/. Without them, a cache/ or logs/ can only be the old CLI's.
 */
function initialised(p: ReturnType<typeof homePaths>): boolean {
  return exists(p.config) || exists(p.runtime) || exists(p.legacy);
}

/** Move the old CLI's files into legacy-cli/ if this is our first run in a home it used. */
export function moveLegacyAside(dataDir: string): { moved: string[]; notices: Notice[] } {
  const p = homePaths(dataDir);
  const moved: string[] = [];
  const notices: Notice[] = [];
  if (initialised(p)) {
    // config.yml after the move (or in a home we already use) can only be the old CLI, still installed, writing again.
    // Moving it again would loop forever; say what's going on instead.
    if (exists(path.join(dataDir, 'config.yml')))
      notices.push({
        id: 'legacy-recreated',
        level: 'warning',
        message:
          "The old BragDoc CLI is still writing to this folder (config.yml has appeared again). It isn't used by BragDoc; uninstall it with `npm uninstall -g @bragdoc/cli`.",
      });
    return { moved, notices };
  }
  const present = LEGACY_ENTRIES.filter((e) => exists(path.join(dataDir, e)));
  if (!present.length) return { moved, notices };
  fs.mkdirSync(p.legacy, { mode: 0o700 });
  for (const e of present) {
    // a rename: same file system, modes and contents kept, nothing copied or deleted. legacy-cli/ is new and empty,
    // so nothing there can be replaced.
    fs.renameSync(path.join(dataDir, e), path.join(p.legacy, e));
    moved.push(e);
  }
  notices.push({
    id: 'legacy-moved',
    level: 'info',
    message: `This folder had the old BragDoc CLI's files in it (${moved.map((e) => (e.includes('.') ? e : e + '/')).join(', ')}). They've been moved, untouched, into legacy-cli/; nothing was deleted.`,
  });
  return { moved, notices };
}

/** Create the data home's directories and starter files where missing, after moving the old CLI's aside. */
export function initHome(dataDir: string): HomeResult {
  const p = homePaths(dataDir);
  const created: string[] = [];
  if (!exists(dataDir)) {
    // 0700: it's your work history, and runtime.json's token lives here
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    created.push(dataDir);
  }
  const { moved, notices } = moveLegacyAside(dataDir); // before cache/ and logs/ exist (SPEC R2)
  for (const dir of [p.logs, p.cache, p.backups]) {
    if (exists(dir)) continue;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    created.push(dir);
  }
  for (const [file, text] of [
    [p.gitignore, GITIGNORE],
    [p.config, CONFIG_TEMPLATE],
  ] as const) {
    if (exists(file)) continue;
    try {
      atomicWrite(file, text, { createOnly: true });
      created.push(file);
    } catch (e) {
      if (!(e instanceof ExistsError)) throw e; // someone made it meanwhile: theirs wins
    }
  }
  return { created, moved, notices };
}
