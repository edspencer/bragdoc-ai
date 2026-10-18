// The platform layer: which service manager this OS has (launchd on macOS, systemd's user instance on Linux, none yet
// on Windows, D14), and how to open a URL in the browser. The rest of the CLI asks here and never branches on
// process.platform itself.
import os from 'node:os';
import { posix as path } from 'node:path';
import type { AllowedBin } from '../proc.js';
import { launchdManager } from './launchd.js';
import type { Runner } from './runner.js';
import type { ServiceManager } from './services.js';
import { systemdManager } from './systemd.js';

export interface ManagerOptions {
  /** `process.platform`. */
  platform: NodeJS.Platform;
  /** The user's home directory. Injected, and it wins over the environment's XDG_CONFIG_HOME only when that's unset. */
  homedir: string;
  env: NodeJS.ProcessEnv;
  /** The user's id, for launchd's `gui/<uid>` domain. */
  uid: number;
  run: Runner;
  sleep?: (ms: number) => Promise<void>;
}

/** Thrown where there's no service manager: Windows (not yet, D14) and anything that isn't macOS or Linux. */
export class UnsupportedPlatformError extends Error {}

export function managerFor(o: ManagerOptions): ServiceManager {
  if (o.platform === 'darwin') return launchdManager({ dir: path.join(o.homedir, 'Library', 'LaunchAgents'), uid: o.uid, run: o.run, sleep: o.sleep });
  if (o.platform === 'linux') {
    // $XDG_CONFIG_HOME is where systemd's user instance looks; an empty or relative value means "not set" (XDG spec)
    const xdg = o.env.XDG_CONFIG_HOME && path.isAbsolute(o.env.XDG_CONFIG_HOME) ? o.env.XDG_CONFIG_HOME : path.join(o.homedir, '.config');
    return systemdManager({ dir: path.join(xdg, 'systemd', 'user'), run: o.run, user: safeUser() });
  }
  if (o.platform === 'win32') throw new UnsupportedPlatformError("`bragdoc service` isn't supported on Windows yet. Run `bragdoc` in a terminal instead.");
  throw new UnsupportedPlatformError(`\`bragdoc service\` supports macOS (launchd) and Linux (systemd), not ${o.platform}. Run \`bragdoc\` in a terminal instead.`);
}

function safeUser(): string {
  try {
    return os.userInfo().username;
  } catch {
    return '$USER';
  }
}

/** The command that opens a URL in the default browser, or null where there isn't one we know (`--open`). */
export function openCommand(platform: NodeJS.Platform, url: string): [AllowedBin, string[]] | null {
  if (platform === 'darwin') return ['open', [url]];
  if (platform === 'linux') return ['xdg-open', [url]];
  return null;
}

export type { LogSource, ServiceManager, ServiceStatus } from './services.js';
export { ServiceManagerError } from './services.js';
