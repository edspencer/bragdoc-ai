// The hosted BragDoc app's export format, version 1.0 (SPEC R12): the one thing read from the old app, and only its
// format (D2). Reimplemented in Zod 4 with the same meaning, but forgiving where the original was strict, because a
// migration that refuses a whole file over one odd value helps nobody:
//  - ids are any non-empty string (the hosted app's were UUIDs), and times any ISO 8601 string Date can read;
//  - a nullable field may also be missing;
//  - each item is checked on its own (`ITEM_SCHEMAS`), so one bad achievement is reported and the rest still import.
// Only the envelope is all-or-nothing: not JSON, not an export, or another `version`, and nothing is imported.
import { z } from 'zod';

/** The only version this importer reads. */
export const EXPORT_VERSION = '1.0';

/** The largest export accepted, by the CLI and by POST /api/import/* (D47). */
export const MAX_EXPORT_BYTES = 50 * 1024 * 1024;

const legacyId = z.string().trim().min(1, 'no id');
/** A time Date can read, between 1900 and 2999 (a year like +010000 would make no sense as a date, or a file name). */
const time = z.string().refine((s) => {
  const t = Date.parse(s);
  return !Number.isNaN(t) && t >= Date.UTC(1900, 0, 1) && t < Date.UTC(3000, 0, 1);
}, 'not a date and time');
const text = z.string().nullish();

export const ExportCompanySchema = z.object({
  id: legacyId,
  userId: z.string().nullish(),
  name: z.string(),
  domain: text,
  role: text,
  startDate: time.nullish(),
  endDate: time.nullish(),
});

export const ExportProjectSchema = z.object({
  id: legacyId,
  userId: z.string().nullish(),
  companyId: text,
  name: z.string(),
  description: text,
  status: text,
  color: text,
  startDate: time.nullish(),
  endDate: time.nullish(),
  repoRemoteUrl: text,
  createdAt: time.nullish(),
  updatedAt: time.nullish(),
});

export const ExportAchievementSchema = z.object({
  id: legacyId,
  userId: z.string().nullish(),
  companyId: text,
  projectId: text,
  userMessageId: text,
  title: z.string(),
  summary: text,
  details: text,
  eventStart: time.nullish(),
  eventEnd: time.nullish(),
  /** day · week · month · quarter · half year · year: kept under meta.legacy, as BragDoc has no such field. */
  eventDuration: text,
  isArchived: z.boolean().nullish(),
  /** llm · manual · commit: kept under meta.legacy; the achievement's own source becomes `import`. */
  source: text,
  impact: z.number().nullish(),
  impactSource: text,
  impactUpdatedAt: time.nullish(),
  createdAt: time,
  updatedAt: time.nullish(),
  embedding: z.array(z.number()).nullish(),
  embeddingModel: text,
  embeddingGeneratedAt: text,
});

export const ExportDocumentSchema = z.object({
  id: legacyId,
  createdAt: time.nullish(),
  updatedAt: time.nullish(),
  title: z.string().nullish(),
  content: text,
  userId: z.string().nullish(),
  companyId: text,
  type: text,
  shareToken: text,
});

export const ExportReviewSchema = z.object({
  id: legacyId,
  userId: z.string().nullish(),
  name: z.string().nullish(),
  startDate: time.nullish(),
  endDate: time.nullish(),
  instructions: text,
  documentId: text,
  createdAt: time.nullish(),
  updatedAt: time.nullish(),
});

export type ExportCompany = z.infer<typeof ExportCompanySchema>;
export type ExportProject = z.infer<typeof ExportProjectSchema>;
export type ExportAchievement = z.infer<typeof ExportAchievementSchema>;
export type ExportDocument = z.infer<typeof ExportDocumentSchema>;
export type ExportReview = z.infer<typeof ExportReviewSchema>;

/** The lists in an export, the schema each item is checked against, and its name in reports. */
export const LISTS = {
  companies: { schema: ExportCompanySchema, noun: 'company' },
  projects: { schema: ExportProjectSchema, noun: 'project' },
  achievements: { schema: ExportAchievementSchema, noun: 'achievement' },
  documents: { schema: ExportDocumentSchema, noun: 'document' },
  performanceReviews: { schema: ExportReviewSchema, noun: 'performance review' },
} as const;
export type ListName = keyof typeof LISTS;

/** An export as read: the envelope checked, each list's items still raw (they're checked one at a time). */
export interface RawExport {
  version: typeof EXPORT_VERSION;
  exportedAt: string | null;
  /** Whether the envelope names the hosted account (it's left behind). */
  userId: boolean;
  /** Keys of the envelope this importer doesn't know (reported as left behind). */
  unknownKeys: string[];
  lists: Record<ListName, unknown[]>;
}

/** The file can't be imported at all. `code` is the API's error code. */
export class ExportRefused extends Error {
  constructor(
    readonly code: 'invalid_export' | 'unsupported_version',
    message: string,
  ) {
    super(message);
  }
}

const NOT_AN_EXPORT = "It doesn't look like an export from the hosted BragDoc app (Account → Export Data), which is a JSON file starting with {\"version\": \"1.0\", …}.";

/** JSON text → the envelope, or ExportRefused with a sentence saying what's wrong. */
export function readExport(input: string | unknown): RawExport {
  let data: unknown = input;
  if (typeof input === 'string') {
    const text = input.replace(/^﻿/, '');
    if (!text.trim()) throw new ExportRefused('invalid_export', `The file is empty. ${NOT_AN_EXPORT}`);
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new ExportRefused('invalid_export', `The file isn't valid JSON (${jsonWhere(text, e as Error)}), so nothing was imported. Is it the whole export, not cut off part-way?`);
    }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new ExportRefused('invalid_export', `The file is JSON, but not an object. ${NOT_AN_EXPORT}`);
  const o = data as Record<string, unknown>;
  if (!('version' in o)) throw new ExportRefused('invalid_export', `The file has no "version". ${NOT_AN_EXPORT}`);
  if (o.version !== EXPORT_VERSION)
    throw new ExportRefused(
      'unsupported_version',
      `This export is version ${JSON.stringify(o.version)}, and this BragDoc reads version "${EXPORT_VERSION}" exports only, so nothing was imported. If the export is newer than this BragDoc, upgrade BragDoc and try again.`,
    );
  const lists = {} as Record<ListName, unknown[]>;
  for (const name of Object.keys(LISTS) as ListName[]) {
    const v = o[name];
    if (v === undefined || v === null) lists[name] = [];
    else if (Array.isArray(v)) lists[name] = v;
    else throw new ExportRefused('invalid_export', `"${name}" should be a list, and it's ${typeof v === 'object' ? 'an object' : `a ${typeof v}`}. ${NOT_AN_EXPORT}`);
  }
  const exportedAt = typeof o.exportedAt === 'string' && !Number.isNaN(Date.parse(o.exportedAt)) ? new Date(o.exportedAt).toISOString() : null;
  const known = new Set(['version', 'exportedAt', 'userId', ...Object.keys(LISTS)]);
  return { version: EXPORT_VERSION, exportedAt, userId: typeof o.userId === 'string' && !!o.userId, unknownKeys: Object.keys(o).filter((k) => !known.has(k)), lists };
}

/** "line 3, column 14" from a JSON.parse error, when it gives a position; else its message. */
function jsonWhere(text: string, e: Error): string {
  const lc = /line (\d+) column (\d+)/.exec(e.message);
  if (lc) return `line ${lc[1]}, column ${lc[2]}`;
  const pos = /position (\d+)/.exec(e.message);
  if (pos) {
    const before = text.slice(0, Number(pos[1]));
    const line = before.split('\n').length;
    return `line ${line}, column ${before.length - before.lastIndexOf('\n')}`;
  }
  return /end of (JSON|data) input/i.test(e.message) ? 'it ends part-way through' : e.message;
}
