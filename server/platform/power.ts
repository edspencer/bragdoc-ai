// Is this computer plugged in? (SPEC R22, D75.) The judge's background runs wait for AC power unless you untick "only on
// power". Three answers: `ac`, `battery`, or `unknown` (a desktop without a battery, Docker, Windows, a reading that
// failed), and unknown counts as plugged in: the card says it can't tell rather than never running.
//
// - **macOS:** `pmset -g batt`, through proc.ts like every program BragDoc runs ("Now drawing from 'AC Power'" or
//   "'Battery Power'"). No pmset → unknown.
// - **Linux:** /sys/class/power_supply/*: a mains (or USB-C) supply that's online means AC; one that's offline, with a
//   battery, means battery; a battery alone says so by its status ("Discharging"). A battery whose scope is `Device` (a
//   mouse, a headset) is never this computer's.
// - **Anything else:** unknown.
//
// Reading power sends nothing anywhere, and writes nothing.
import fs from 'node:fs';
import path from 'node:path';
import { run } from '../proc.js';

export type PowerState = 'ac' | 'battery' | 'unknown';

export const SYS_POWER_SUPPLY = '/sys/class/power_supply';

export interface PowerOptions {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  /** Linux: where the power supplies are (tests and box QA point it at a fixture; BRAGDOC_POWER_SUPPLY_DIR, internal). */
  sysDir?: string;
}

/** `pmset -g batt`'s first line says what the Mac is drawing from. */
export function parsePmset(out: string): PowerState {
  const m = /drawing from '([^']+)'/i.exec(out);
  if (!m) return 'unknown';
  const src = m[1]!.toLowerCase();
  if (src.includes('battery')) return 'battery';
  if (src.includes('ac')) return 'ac';
  return 'unknown'; // 'UPS Power' and anything new: can't tell
}

const readTrim = (f: string): string | null => {
  try {
    return fs.readFileSync(f, 'utf8').trim();
  } catch {
    return null;
  }
};

/** Linux's power supplies → plugged in or not. */
export function readSysPower(dir: string): PowerState {
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return 'unknown';
  }
  let mains = 0;
  let mainsOnline = 0;
  const batteries: (string | null)[] = [];
  for (const n of names) {
    const d = path.join(dir, n);
    const type = readTrim(path.join(d, 'type'));
    if (type === 'Mains' || type === 'USB' || type === 'USB_C' || type === 'USB_PD') {
      const online = readTrim(path.join(d, 'online'));
      if (online === null) continue;
      mains++;
      if (online === '1') mainsOnline++;
    } else if (type === 'Battery') {
      if (readTrim(path.join(d, 'scope')) === 'Device') continue; // a peripheral's battery
      batteries.push(readTrim(path.join(d, 'status')));
    }
  }
  if (mainsOnline > 0) return 'ac';
  if (!batteries.length) return 'unknown'; // a desktop, a container: nothing that says
  if (mains > 0) return 'battery'; // every supply offline, and a battery
  // no supply to ask: the battery's own status says whether it's charging
  if (batteries.some((s) => s === 'Discharging')) return 'battery';
  if (batteries.some((s) => s === 'Charging' || s === 'Full' || s === 'Not charging')) return 'ac';
  return 'unknown';
}

/** Is this computer on AC power right now? */
export async function onAC({ platform = process.platform, env = process.env, sysDir }: PowerOptions = {}): Promise<PowerState> {
  if (platform === 'darwin') {
    try {
      const r = await run('pmset', ['-g', 'batt'], { env, timeoutMs: 5_000, maxOutput: 64 * 1024 });
      return r.code === 0 ? parsePmset(r.stdout) : 'unknown';
    } catch {
      return 'unknown'; // pmset missing or stuck
    }
  }
  if (platform === 'linux') return readSysPower(sysDir ?? env.BRAGDOC_POWER_SUPPLY_DIR ?? SYS_POWER_SUPPLY);
  return 'unknown';
}
