// Helpers the services share: input validation, the clock, and checks that referenced ids exist.
import type { z } from 'zod';
import { EVIDENCE_KEYS, type Evidence, type EvidenceInput } from '../../shared/schema/index.js';
import { ulid } from '../../shared/ulid.js';
import { ValidationError, type EntityKind, type Store } from '../store/index.js';

/** Validate a caller's input; a ValidationError listing every issue otherwise. */
export function validate<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (r.success) return r.data;
  const issues = r.error.issues.map((i) => ({ key: i.path.map(String).join('.'), message: i.message }));
  throw new ValidationError(issues.map((i) => (i.key ? `${i.key}: ${i.message}` : i.message)).join('; '), issues);
}

export const nowIso = (store: Store) => store.now().toISOString();

/** Today's date (YYYY-MM-DD) in the profile's time zone, else the machine's. */
export function today(store: Store): string {
  const tz = store.profile()?.timezone;
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(store.now());
  } catch {
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(store.now());
  }
}

/** Refuse ids that don't exist (files on disk may dangle; a request has no excuse). */
export function requireIds(store: Store, kind: EntityKind, ids: readonly (string | null | undefined)[], key: string): void {
  const missing = ids.filter((id): id is string => !!id && !store.get(kind, id));
  if (missing.length) throw new ValidationError(`${key}: there's no ${kind} ${missing.join(', ')}`, [{ key, message: `no such ${kind}` }]);
}

/**
 * Give evidence ids where they're missing, and check that stored files exist. An item that replaces one in `current`
 * (same id) keeps that one's unknown keys: a caller sends the keys it knows, and the rest aren't its to drop.
 */
export function withEvidenceIds(store: Store, evidence: readonly EvidenceInput[], current: readonly Evidence[] = []): Evidence[] {
  requireIds(store, 'evidence', evidence.map((e) => e.blob), 'evidence.blob');
  const known = new Set<string>(EVIDENCE_KEYS);
  return evidence.map((e) => {
    const was = e.id ? current.find((c) => c.id === e.id) : undefined;
    const unknown = was ? Object.fromEntries(Object.entries(was).filter(([k]) => !known.has(k))) : {};
    return { id: e.id ?? ulid(store.now().getTime()), ...unknown, ...e } as Evidence; // id first, as people read it
  });
}

/** An object without its undefined members (so a merge patch doesn't mention them). */
export const defined = <T extends Record<string, unknown>>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
