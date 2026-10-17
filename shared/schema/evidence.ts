// Evidence: what backs an achievement up (SPEC R2). It lives inside the achievement's front-matter (`evidence:`) and in
// Found candidates. Files (images, PDFs, anything else) are stored once, content-addressed, as
// evidence/<aa>/<sha256>.<ext>, with a sidecar evidence/<aa>/<sha256>.yaml describing them (EvidenceSidecarSchema).
import { z } from 'zod';
import { isoDateTime, meta, schemaVersion, sha256, ulidSchema } from './common.js';

export const EVIDENCE_KINDS = ['image', 'pdf', 'file', 'url', 'github_pr', 'quote'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
/** Kinds whose content is a blob in evidence/. */
export const BLOB_KINDS: readonly EvidenceKind[] = ['image', 'pdf', 'file'];

export const QuoteSchema = z.object({
  text: z.string().min(1).describe('What was said.'),
  from: z.string().optional().describe('Who said it.'),
  where: z.string().optional().describe('Where: a channel, a review, a meeting.'),
});

const evidenceFields = {
  kind: z.enum(EVIDENCE_KINDS).describe('`image`, `pdf`, `file`, `url`, `github_pr` or `quote`.'),
  blob: sha256.optional().describe('For image, pdf and file: the sha256 of the file in evidence/.'),
  url: z.string().optional().describe('For url and github_pr: the link.'),
  externalKey: z.string().optional().describe('A stable key for where it came from, e.g. `github_pr:owner/repo#123`.'),
  title: z.string().optional().describe('A caption or title.'),
  quote: QuoteSchema.optional().describe('For quote: the words, who and where.'),
  meta,
};

/** What each kind needs: a blob, a url, a quote. */
function checkEvidence(e: { kind: EvidenceKind; blob?: string; url?: string; externalKey?: string; quote?: unknown }, ctx: z.RefinementCtx): void {
  const need = (key: 'blob' | 'url' | 'quote', why: string) => {
    if (!e[key]) ctx.addIssue({ code: 'custom', path: [key], message: why });
  };
  if (BLOB_KINDS.includes(e.kind)) need('blob', `${e.kind} evidence needs a blob (the file's sha256)`);
  if (e.kind === 'url') need('url', 'url evidence needs a url');
  if (e.kind === 'github_pr' && !e.url && !e.externalKey) need('url', 'github_pr evidence needs a url or an externalKey');
  if (e.kind === 'quote') need('quote', 'quote evidence needs a quote');
}

/** The keys BragDoc knows on an evidence item; any others are kept as they are (they may be a newer BragDoc's). */
export const EVIDENCE_KEYS = ['id', ...Object.keys(evidenceFields)] as const;

// loose: an evidence item keeps keys this version doesn't know, so rewriting the list never drops them (D24)
export const EvidenceSchema = z
  .looseObject({ id: ulidSchema.describe('The evidence\'s id (a ULID).'), ...evidenceFields })
  .superRefine(checkEvidence);
/** Evidence as a caller gives it: the id is optional (the services assign one). Unknown keys are refused. */
export const EvidenceInputSchema = z
  .strictObject({ id: ulidSchema.optional(), ...evidenceFields })
  .superRefine(checkEvidence);
export type EvidenceInput = z.infer<typeof EvidenceInputSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;

export const OcrSchema = z.object({
  engine: z.string().min(1).describe('Which engine read it (`tesseract`, `vision`).'),
  text: z.string().describe('The text it read.'),
  at: isoDateTime.describe('When.'),
});

export const EvidenceSidecarSchema = z.object({
  schemaVersion,
  sha256: sha256.describe('The blob\'s sha256 (also its file name).'),
  mime: z.string().min(1).describe('Its type, from its content (magic bytes), not its name.'),
  ext: z.string().regex(/^[a-z0-9]{1,10}$/).describe('The blob\'s file extension.'),
  originalName: z.string().optional().describe('The name it had when it was added.'),
  bytes: z.number().int().min(0).describe('Its size in bytes.'),
  width: z.number().int().positive().optional().describe('Images: width in pixels.'),
  height: z.number().int().positive().optional().describe('Images: height in pixels.'),
  ocr: OcrSchema.optional().describe('Images: text read from it, which search covers.'),
  createdAt: isoDateTime.describe('When it was added.'),
});
export type EvidenceSidecar = z.infer<typeof EvidenceSidecarSchema>;
