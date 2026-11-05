// The service's log, `<data home>/service/bragdoc.log`, rotated by BragDoc itself (cli-contract SPEC §7, D85). launchd
// and systemd both append our stdout and stderr to it, and neither rotates it; on Linux that used to be the journal's
// job. The server checks its size at start and hourly, and past SERVICE_LOG_MAX_BYTES copies it to bragdoc.1.log
// (replacing the older copy) and truncates it. Copy-and-truncate, not rename: the manager holds the file open, so after
// a rename it would carry on writing to the renamed one. It opened it for appending (O_APPEND, both managers), so after
// the truncate its next write lands at the start of the emptied file. A line written between the copy and the truncate
// is lost; that's the price of not needing the manager's help.
import fs from 'node:fs';
import { posix as path } from 'node:path';
import { serviceDir } from './spec.js';

export const SERVICE_LOG_MAX_BYTES = 10 * 1024 * 1024;
const EVERY_MS = 60 * 60 * 1000;

export const serviceLogFile = (dataDir: string) => path.join(serviceDir(dataDir), 'bragdoc.log');

/** Rotate the service's log if it has grown past `max`. True if it did. Never throws: a log isn't worth a crash. */
export function rotateServiceLog(dataDir: string, max = SERVICE_LOG_MAX_BYTES): boolean {
  const file = serviceLogFile(dataDir);
  try {
    if (fs.statSync(file).size < max) return false;
    fs.copyFileSync(file, file.replace(/\.log$/, '.1.log'));
    fs.truncateSync(file, 0);
    return true;
  } catch {
    return false; // no log (not run as a service), or not ours to touch
  }
}

/** Check now and every hour; returns the stop function. The timer never keeps the process alive. */
export function startServiceLogRotation(dataDir: string, everyMs = EVERY_MS): () => void {
  rotateServiceLog(dataDir);
  const t = setInterval(() => rotateServiceLog(dataDir), everyMs);
  t.unref();
  return () => clearInterval(t);
}
