// Where each kind of file lives in the data home (SPEC R2), and the reverse: what a path is. Paths are relative to the
// data home with `/`, as Problems and events report them.
import { ULID_RE, ulidTime } from '../../shared/ulid.js';
import { isTempName } from './safefs.js';

export type EntityKind = 'profile' | 'company' | 'project' | 'repo' | 'achievement' | 'evidence' | 'found';

/** The flat directories of `<id>.yaml` files. */
export const FLAT_DIRS = { company: 'companies', project: 'projects', repo: 'repos', found: 'found' } as const;
const FLAT_KIND = Object.fromEntries(Object.entries(FLAT_DIRS).map(([k, d]) => [d, k])) as Record<string, EntityKind>;

const SHA = /^[0-9a-f]{64}$/;

/** The year and month (UTC) a ULID was made in: an achievement's folder. */
export function ulidMonth(id: string): { year: string; month: string } {
  const d = new Date(ulidTime(id));
  return { year: String(d.getUTCFullYear()), month: String(d.getUTCMonth() + 1).padStart(2, '0') };
}

/** The file for an entity: `projects/<id>.yaml`, `achievements/2026/10/<id>.md`, `evidence/ab/<sha>.yaml`… */
export function relPathFor(kind: EntityKind, id: string): string {
  switch (kind) {
    case 'profile':
      return 'profile.yaml';
    case 'achievement': {
      const { year, month } = ulidMonth(id);
      return `achievements/${year}/${month}/${id}.md`;
    }
    case 'evidence':
      return `evidence/${id.slice(0, 2)}/${id}.yaml`;
    default:
      return `${FLAT_DIRS[kind]}/${id}.yaml`;
  }
}

/** A stored evidence file: `evidence/<aa>/<sha256>.<ext>`. */
export const blobRelPath = (sha: string, ext: string) => `evidence/${sha.slice(0, 2)}/${sha}.${ext}`;

export type Classified = { kind: EntityKind; id: string } | { stray: string } | null;

/**
 * What the file at `rel` is: an entity's file, a stray (a file where BragDoc expects one of its own, but misnamed:
 * reported, never read), or null (not ours to read: a blob, a README, a dot-file).
 */
export function classify(rel: string): Classified {
  const parts = rel.split('/');
  const name = parts[parts.length - 1];
  if (!name || name.startsWith('.') || isTempName(name)) return null;
  if (parts.length === 1) return rel === 'profile.yaml' ? { kind: 'profile', id: 'profile' } : null;
  const top = parts[0];
  if (FLAT_KIND[top] && parts.length === 2) {
    if (name.endsWith('.yml')) return { stray: `BragDoc reads .yaml files only: rename it to ${name.slice(0, -4)}.yaml` };
    if (!name.endsWith('.yaml')) return null;
    const id = name.slice(0, -5);
    return ULID_RE.test(id) ? { kind: FLAT_KIND[top], id } : { stray: `"${id}" is not an id (a 26-character ULID, upper case), so the file is ignored` };
  }
  if (top === 'achievements' && parts.length === 4) {
    if (!name.endsWith('.md')) return null;
    const id = name.slice(0, -3);
    if (!/^\d{4}$/.test(parts[1]) || !/^\d{2}$/.test(parts[2])) return { stray: 'achievement files go in achievements/YYYY/MM/' };
    return ULID_RE.test(id) ? { kind: 'achievement', id } : { stray: `"${id}" is not an id (a 26-character ULID, upper case), so the file is ignored` };
  }
  if (top === 'evidence' && parts.length === 3 && name.endsWith('.yaml')) {
    const sha = name.slice(0, -5);
    return SHA.test(sha) && parts[1] === sha.slice(0, 2) ? { kind: 'evidence', id: sha } : { stray: 'not an evidence sidecar (evidence/<aa>/<sha256>.yaml)' };
  }
  return null;
}

/** The directories the boot scan walks, with how deep their files are. */
export const SCAN_ROOTS: { dir: string; depth: number }[] = [
  ...Object.values(FLAT_DIRS).map((dir) => ({ dir, depth: 1 })),
  { dir: 'achievements', depth: 3 },
  { dir: 'evidence', depth: 2 },
];
