// From edspencer/cli-contract test/helpers.ts @ 1.0; local changes: imports from server/update/ and the published runner's
// schema validator. The tests of the reference code BragDoc copied (D88).
//
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { OutputStream } from '../server/update/output.ts';

/** A stream that remembers what was written. */
export function capture(isTTY = false): OutputStream & { text: string } {
  const s = {
    text: '',
    isTTY,
    write(chunk: string) {
      s.text += chunk;
      return true;
    },
  };
  return s;
}

export function tempDir(prefix = 'cli-contract-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
