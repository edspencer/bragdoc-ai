// The per-user service manager behind `bragdoc service` (adapted from Hallway's server/platform/services.ts): launchd
// LaunchAgents on macOS (launchd.ts), systemd user units on Linux (systemd.ts). Both take a resolved ServiceSpec
// (spec.ts) and turn it into one file plus a handful of lifecycle verbs. Every command goes through a Runner
// (runner.ts), so the lifecycle is tested with the runner mocked, on every OS. index.ts picks the manager.
import fs from 'node:fs';
import path from 'node:path';
import type { ServiceSpec } from './spec.js';

/** What the service manager says about BragDoc's service. */
export interface ServiceStatus {
  /** The definition file exists. */
  installed: boolean;
  /** The argv in the installed definition (empty when it isn't installed). */
  argv: string[];
  /** The service manager knows it (launchd: bootstrapped; systemd: the unit loads). */
  loaded: boolean;
  running: boolean;
  pid: number | null;
  /** The last exit status, if it has exited. */
  lastExitCode: number | null;
  /** The manager's own word for it (`running`, `waiting`, `active (running)`, `inactive (dead)`, `failed`). */
  state: string | null;
}

/** Where `bragdoc service logs` reads: a file it follows (launchd), or a command it runs (journalctl). */
export type LogSource = { file: string } | { command: [string, string[]] };

export class ServiceManagerError extends Error {}

export interface ServiceManager {
  kind: 'launchd' | 'systemd';
  /** For people: `LaunchAgent`, `systemd user unit`. */
  noun: string;
  /** What someone would type to ask the manager about it: the label, or the unit's name. */
  name: string;
  /** Where the definition lives. */
  file: string;
  /** When the service runs and what keeps it running, for people, after an install and in `status`. */
  lifetime: string;
  /** The definition's text. Pure. */
  render(spec: ServiceSpec): string;
  /** The argv a definition runs (status reads the port and data home from it). */
  parseArgv(text: string): string[];
  /** The commands a fresh install runs, for `--dry-run`. */
  installCommands(): string[];
  /** Write the definition (atomically), load it and start it; a reinstall with a changed definition restarts it. */
  install(spec: ServiceSpec): Promise<{ changed: boolean }>;
  /** Start it now; a no-op if it's running. */
  start(): Promise<void>;
  /** Stop it for now. It stays installed, and starts again at the next login. */
  stop(): Promise<void>;
  /** Stop it and start it again, re-reading the definition. Starts it if it was stopped. */
  restart(): Promise<void>;
  status(): Promise<ServiceStatus>;
  /** Stop it and delete the definition. True if there was one. */
  uninstall(): Promise<boolean>;
  logs(spec: Pick<ServiceSpec, 'log'>): LogSource;
}

/** Write `text` to `file` via a temp file and rename; false if it already had exactly that text. */
export function writeIfChanged(file: string, text: string): boolean {
  try {
    if (fs.readFileSync(file, 'utf8') === text) return false;
  } catch {
    /* missing: write it */
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // a dot-file, so launchd (which reads every plist in the directory) never sees a half-written one
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.tmp-${process.pid}`);
  fs.writeFileSync(tmp, text, { mode: 0o644 });
  fs.renameSync(tmp, file);
  return true;
}

/** The installed definition's text, or null. */
export function readIfExists(file: string): string | null {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}
