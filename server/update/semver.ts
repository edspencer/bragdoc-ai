// From edspencer/cli-contract reference/semver.ts @ 0.2; local changes: none.
//
// The small semver `update` needs (SPEC §5 step 4): is the target newer, is it a prerelease, and does its
// `engines.node` accept this Node. Node built-ins only.
//
// It deliberately leaves out hyphen ranges (`1.2 - 2.3`) and build-metadata ordering. A range it can't read is
// "can't tell" (undefined), not "fails": refusing an update over a range this file doesn't understand would be the
// worse mistake of the two (`satisfiesEngines`).

export interface Version {
  major: number;
  minor: number;
  patch: number;
  /** The dot-separated identifiers after `-`; empty for a release. */
  prerelease: (string | number)[];
}

const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

const identifiers = (s: string): (string | number)[] => s.split('.').map((id) => (/^\d+$/.test(id) ? Number(id) : id));

/** `1.2.3-rc.1` as a `Version`, or undefined if it isn't one. */
export function parseVersion(raw: string): Version | undefined {
  const m = VERSION_RE.exec(raw.trim());
  if (m === null) return undefined;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), prerelease: m[4] === undefined ? [] : identifiers(m[4]) };
}

/** SPEC §5: prereleases count only when `--to` names them. */
export function isPrerelease(raw: string): boolean {
  return (parseVersion(raw)?.prerelease.length ?? 0) > 0;
}

/**
 * -1, 0 or 1, by semver's rules: `1.0.0-rc.1` is lower than `1.0.0`, numeric identifiers compare as numbers and sort
 * below alphanumeric ones, and a longer run of identifiers wins when the shared ones are equal. Build metadata is
 * ignored. Something that isn't a version compares as equal rather than throwing.
 */
export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (va === undefined || vb === undefined) return 0;
  return compare(va, vb);
}

function compare(va: Version, vb: Version): number {
  for (const k of ['major', 'minor', 'patch'] as const) {
    if (va[k] !== vb[k]) return va[k] < vb[k] ? -1 : 1;
  }
  if (va.prerelease.length === 0 && vb.prerelease.length === 0) return 0;
  if (va.prerelease.length === 0) return 1;
  if (vb.prerelease.length === 0) return -1;
  const n = Math.max(va.prerelease.length, vb.prerelease.length);
  for (let i = 0; i < n; i++) {
    const x = va.prerelease[i];
    const y = vb.prerelease[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x < y ? -1 : 1;
    if (typeof x === 'number') return -1;
    if (typeof y === 'number') return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

/** Whether `a` is strictly newer than `b`. */
export const isNewer = (a: string, b: string): boolean => compareVersions(a, b) > 0;

/** The highest of a list, ignoring anything that isn't a version. */
export function maxVersion(versions: readonly string[]): string | undefined {
  let best: string | undefined;
  for (const v of versions) {
    if (parseVersion(v) !== undefined && (best === undefined || isNewer(v, best))) best = v;
  }
  return best;
}

/** `0.82.0` → `0.83.0` (`minor`), or `0.82.1` (`patch`). A prerelease's suffix is dropped. */
export function bumpVersion(raw: string, part: 'major' | 'minor' | 'patch'): string {
  const v = parseVersion(raw);
  if (v === undefined) throw new Error(`not a version: ${raw}`);
  if (part === 'major') return `${v.major + 1}.0.0`;
  if (part === 'minor') return `${v.major}.${v.minor + 1}.0`;
  return `${v.major}.${v.minor}.${v.patch + 1}`;
}

const COMPARATOR_RE = /^(>=|<=|>|<|=|\^|~)?\s*v?(\d+)(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-([0-9A-Za-z.-]+))?$/;

interface Comparator {
  op: '>=' | '<=' | '>' | '<' | '=';
  version: Version;
}

/**
 * One range atom as the comparators it means: `^22.1.0` is `>=22.1.0 <23.0.0`, `~22.1.0` is `>=22.1.0 <22.2.0`, and
 * a bare `22` is `>=22.0.0 <23.0.0` (npm's partial versions). Undefined for anything else.
 */
function comparatorsFor(atom: string): Comparator[] | undefined {
  const m = COMPARATOR_RE.exec(atom);
  if (m === null) return undefined;
  const op = m[1] ?? '=';
  const wild = (s: string | undefined) => s === undefined || s === 'x' || s === 'X' || s === '*';
  const major = Number(m[2]);
  const minorWild = wild(m[3]);
  const patchWild = wild(m[4]);
  const minor = minorWild ? 0 : Number(m[3]);
  const patch = patchWild ? 0 : Number(m[4]);
  const at = (ma: number, mi: number, pa: number): Version => ({ major: ma, minor: mi, patch: pa, prerelease: [] });
  const lower: Version = { major, minor, patch, prerelease: m[5] === undefined ? [] : identifiers(m[5]) };
  const between = (upper: Version): Comparator[] => [
    { op: '>=', version: lower },
    { op: '<', version: upper },
  ];

  // `^0.x` tightens: ^0.2.3 is >=0.2.3 <0.3.0, ^0.0.3 is >=0.0.3 <0.0.4, ^0.0 is <0.1.0 and ^0 is <1.0.0.
  if (op === '^') {
    if (major > 0 || minorWild) return between(at(major + 1, 0, 0));
    if (minor > 0 || patchWild) return between(at(0, minor + 1, 0));
    return between(at(0, 0, patch + 1));
  }
  if (op === '~') return between(minorWild ? at(major + 1, 0, 0) : at(major, minor + 1, 0));
  // A partial version with no operator is a range: `22` is the whole 22 line, `22.1` the whole 22.1 line.
  if (op === '=' && (minorWild || patchWild)) return between(minorWild ? at(major + 1, 0, 0) : at(major, minor + 1, 0));
  return [{ op: op as Comparator['op'], version: lower }];
}

function satisfiesComparator(v: Version, c: Comparator): boolean {
  const cmp = compare(v, c.version);
  switch (c.op) {
    case '>=':
      return cmp >= 0;
    case '<=':
      return cmp <= 0;
    case '>':
      return cmp > 0;
    case '<':
      return cmp < 0;
    case '=':
      return cmp === 0;
  }
}

/**
 * Whether `version` satisfies `range`; undefined when this file can't tell.
 *
 * Reads what `engines.node` uses in practice: `>=22`, `>=22.0.0`, `^22.1.0`, `~22.1`, `22`, `22.x`, `>=20 <23`, and
 * `||` between them. `*` and an empty range accept everything. Alternatives it can't read are ignored; if it can read
 * none of them, the answer is undefined.
 */
export function satisfies(version: string, range: string): boolean | undefined {
  const v = parseVersion(version);
  if (v === undefined) return undefined;
  const trimmed = range.trim();
  if (trimmed === '' || trimmed === '*' || trimmed === 'x') return true;
  let known = false;
  for (const alt of trimmed.split('||')) {
    const comparators: Comparator[] = [];
    let parsed = true;
    for (const atom of alt.trim().split(/\s+/).filter(Boolean)) {
      const cs = comparatorsFor(atom);
      if (cs === undefined) {
        parsed = false;
        break;
      }
      comparators.push(...cs);
    }
    if (!parsed) continue;
    known = true;
    if (comparators.every((c) => satisfiesComparator(v, c))) return true;
  }
  return known ? false : undefined;
}

export interface EnginesVerdict {
  /** true passes, false fails, undefined when the range couldn't be read. */
  ok: boolean | undefined;
  /** The range as published, for the message. */
  range: string | undefined;
}

/**
 * Will the target run on this Node? (SPEC §5 step 4.) No `engines.node`, or one this file can't read, doesn't block
 * an update: callers treat `ok: undefined` as a pass. A false refusal leaves a tool that can't update itself, saying
 * something nobody can act on; letting an unsuitable Node through fails the install, and the rollback runs.
 */
export function satisfiesEngines(nodeVersion: string, engines: { node?: string } | undefined): EnginesVerdict {
  const range = engines?.node;
  if (range === undefined || range.trim() === '') return { ok: true, range: undefined };
  return { ok: satisfies(nodeVersion, range), range };
}
