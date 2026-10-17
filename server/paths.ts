// Where things are: the package root (so the compiled CLI finds dist/web and package.json wherever npm put it), the
// version, and the data home. Nothing here creates a directory: making the data home's layout is server/home.ts's job
// (PR2), and reading or writing the files in it is the store's (server/store/, PR3).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function findPackageRoot(from: string): string {
  // server/paths.ts from source, dist/server/paths.js once built: walk up to the package.json either way
  let dir = from;
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const up = path.dirname(dir);
    if (up === dir) throw new Error(`can't find package.json above ${from}`);
    dir = up;
  }
  return dir;
}

/** The package's root directory: the checkout from source, the installed package once published. */
export const PACKAGE_ROOT = findPackageRoot(path.dirname(fileURLToPath(import.meta.url)));

/** The package version, from package.json. */
export const VERSION: string = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')).version;

/** The built web app (`npm run build:web`), served by the compiled server. */
export const WEB_DIST = path.join(PACKAGE_ROOT, 'dist', 'web');

/**
 * The data home: `--data-dir`, else `$BRAGDOC_HOME`, else `~/.bragdoc` (SPEC R2). A leading `~` is expanded, and the
 * result is absolute. `env` and `homedir` are parameters so tests never consult the real home.
 */
export function resolveDataDir(flag: string | undefined, env: NodeJS.ProcessEnv = process.env, homedir: string = os.homedir()): string {
  const given = flag ?? (env.BRAGDOC_HOME || undefined);
  if (!given) return path.join(homedir, '.bragdoc');
  const expanded = given === '~' ? homedir : given.startsWith('~/') ? path.join(homedir, given.slice(2)) : given;
  return path.resolve(expanded);
}

/** A path as people write it: `~/.bragdoc` rather than `/Users/alex/.bragdoc`. */
export function tildify(p: string, homedir: string = os.homedir()): string {
  return p === homedir ? '~' : p.startsWith(homedir + path.sep) ? '~' + p.slice(homedir.length) : p;
}
