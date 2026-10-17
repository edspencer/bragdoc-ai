// Throwaway directories under the OS temp dir. Tests never touch a real home or a real data home (~/.bragdoc): use
// tmpDir() for scratch, and tmpHome() for anything that runs the CLI or reads os.homedir().
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** A fresh, empty directory under the OS temp dir (realpath'd: macOS's /var is /private/var). */
export function tmpDir(prefix = 'bragdoc-test-'): string {
  return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

/**
 * Remove a throwaway directory, retrying briefly: handles close a moment after the process that held them exits.
 * Refuses anything outside the OS temp dir, so a bug can't point it at a real home.
 */
export function rmTmp(dir: string): void {
  const tmp = fs.realpathSync.native(os.tmpdir());
  if (!path.resolve(dir).startsWith(tmp + path.sep)) throw new Error(`rmTmp refuses to remove ${dir}: not under ${tmp}`);
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

export interface TmpHome {
  /** The throwaway home directory (HOME / USERPROFILE). */
  home: string;
  /** The data home inside it (BRAGDOC_HOME): not created, as on a first run. */
  dataDir: string;
  /** process.env with every home-ish variable pointed into `home`: pass it to any child process. */
  env: NodeJS.ProcessEnv;
  cleanup: () => void;
}

/** A throwaway home and data home, with an environment that points HOME, XDG_* and BRAGDOC_HOME into it. */
export function tmpHome(prefix = 'bragdoc-home-'): TmpHome {
  const home = tmpDir(prefix);
  const dataDir = path.join(home, '.bragdoc');
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: path.join(home, '.config'),
    XDG_DATA_HOME: path.join(home, '.local', 'share'),
    XDG_STATE_HOME: path.join(home, '.local', 'state'),
    XDG_CACHE_HOME: path.join(home, '.cache'),
    BRAGDOC_HOME: dataDir,
  };
  delete env.PORT;
  delete env.BRAGDOC_DEV;
  delete env.BRAGDOC_DANGEROUSLY_ALLOW_OPEN;
  return { home, dataDir, env, cleanup: () => rmTmp(home) };
}

/** Kill a child process and wait until it has exited (killing alone returns at once, while it still holds files). */
export function stopChild(child: ChildProcess | null | undefined, timeoutMs = 5000): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, timeoutMs);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill();
  });
}
