// The Node version check: `bragdoc` on an older Node says so in one line rather than failing somewhere odd later
// (SPEC R1; TEST_PLAN "Node 20 → a clear needs-Node-22 error"). It runs before anything else in cli.ts, and this file
// and everything cli.ts imports statically must load on old Nodes for it to get the chance: nothing newer than Node
// 18's syntax and APIs here.

/** The oldest Node BragDoc runs on: package.json's engines.node (a test keeps the two in step). */
export const MIN_NODE = '22.12';

/** True when `version` (`22.11.0`, `v20.1.0`) is older than `min` (`22.12`). */
export function nodeTooOld(version: string, min: string = MIN_NODE): boolean {
  const v = version.replace(/^v/, '').split('.').map(Number);
  const m = min.split('.').map(Number);
  for (let i = 0; i < m.length; i++) {
    const a = v[i] ?? 0;
    const b = m[i] ?? 0;
    if (a !== b) return a < b;
  }
  return false;
}
