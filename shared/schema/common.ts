// Building blocks for the data home's file schemas (SPEC R2; docs/data-format.md). Zod 4, so the server validates
// every file it loads with these, and the web app and MCP get the same types. Every field carries a `.describe()`:
// those sentences are the file-format reference (reference.ts), so write them for someone hand-editing the file.
import { z } from 'zod';
import { ULID_RE } from '../ulid.js';

/**
 * The format version each file type is at (Paddock's schema-version.ts, D23). An absent `schemaVersion` reads as 1.
 * Bump one only when an older BragDoc would misread the new shape (a renamed key, a key whose meaning changed, a
 * default whose absence now means something else); adding an optional key never needs a bump. A file from a newer
 * BragDoc is read-only here: shown if it still validates, listed as a Problem, and never rewritten.
 */
export const SCHEMA_VERSIONS = {
  profile: 1,
  company: 1,
  project: 1,
  repo: 1,
  achievement: 1,
  evidence: 1,
  found: 1,
  instructions: 1,
} as const;
export type FileKind = keyof typeof SCHEMA_VERSIONS;

export const schemaVersion = z
  .number()
  .int()
  .min(1)
  .default(1)
  .describe('The file format version. BragDoc writes it; leave it alone. A file from a newer BragDoc is read-only.');

export const ulidSchema = z.string().regex(ULID_RE, 'not an id (a 26-character ULID, upper case)');
export const id = ulidSchema.describe('The id (a ULID). It must match the file name.');
export const isoDate = z.iso.date('a date, YYYY-MM-DD');
export const isoDateTime = z.iso.datetime({ offset: true, message: 'a date and time, ISO 8601 (2026-10-17T09:30:00Z)' });
export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'a colour, #rrggbb');
/** The 1–10 impact scale (shared/impact.ts). */
export const impact = z.number().int().min(1).max(10);
export const sha256 = z.string().regex(/^[0-9a-f]{64}$/, 'a sha256, 64 lower-case hex digits');
/** Example data (PR16's "Fill it with example data"): removable in one click. */
export const example = z.boolean().optional().describe('`true` on example data, which Settings can remove in one go.');
/** Free-form extra data a source or the importer keeps (e.g. `legacy` from a hosted export). Never shown as-is. */
export const meta = z.record(z.string(), z.unknown()).optional().describe('Extra data kept by an importer or a source.');

