// Remove the throwaway home playwright.config.ts made, and nothing else.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export default function globalTeardown(): void {
  const home = process.env.BRAGDOC_E2E_HOME;
  if (home && path.resolve(home).startsWith(fs.realpathSync(os.tmpdir()) + path.sep)) fs.rmSync(home, { recursive: true, force: true });
}
