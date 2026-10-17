// Evidence files (SPEC R3, R5): upload one, and serve one back.
//
//   POST /api/evidence              a typed upload (raw bytes; Content-Type; X-Filename) → EvidenceUploaded
//   GET  /api/evidence/:sha         the file, with the blob headers (sandboxed; anything but a picture downloads)
//   GET  /api/evidence/:sha/thumb   a picture for a card (D46: the picture itself, until there's an image library)
//
// The bytes decide what a file is (store/blobs.ts sniffs magic bytes), never its name or the Content-Type the browser
// sent. But the Content-Type is a claim we can check: a file sent as image/png that isn't a picture (an HTML page named
// .png, say) is refused, so is one sent as a PDF that isn't one, and so is a picture whose header is unreadable.
import fs from 'node:fs';
import type { Hono } from 'hono';
import type { EvidenceUploaded } from '../../shared/api.js';
import type { Evidence } from '../../shared/schema/index.js';
import type { AppContext } from '../context.js';
import { apiError, storeErrorResponse } from '../http.js';
import { UPLOAD_LIMIT, blobHeaders } from '../security.js';
import { evidenceKindFor, imageSize, sniff } from '../store/blobs.js';
import { evidenceFile } from '../views.js';

/**
 * Any specific type, except the three CORS-safelisted ones (which a cross-site page could send without a preflight;
 * the client sends those files as application/octet-stream, and the bytes say what they are anyway).
 */
const UPLOAD_TYPES = /^(?!text\/plain$|multipart\/form-data$|application\/x-www-form-urlencoded$)[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;

/**
 * The types a stored file is served as. A sidecar is hand-editable, so its `mime` is only trusted from this list;
 * anything else goes out as application/octet-stream (and, like every non-picture, as a download).
 */
const SERVE_AS = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'image/heic',
  'image/bmp',
  'image/tiff',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/zip',
]);

/** Pictures whose header we can read (blobs.ts imageSize): one of these without a readable size is damaged. */
const SIZED = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

const SHA = /^[0-9a-f]{64}$/;

/** What the browser said the file is, as an evidence kind; null when it didn't say (octet-stream, nothing). */
function claimedKind(contentType: string): 'image' | 'pdf' | null {
  const t = contentType.split(';')[0].trim().toLowerCase();
  if (t.startsWith('image/')) return 'image';
  if (t === 'application/pdf') return 'pdf';
  return null;
}

function decodeName(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function registerEvidence(app: Hono, ctx: AppContext): void {
  ctx.uploads.accept({ method: 'POST', path: /^\/api\/evidence$/, types: UPLOAD_TYPES, maxBytes: UPLOAD_LIMIT });

  app.post('/api/evidence', async (c) => {
    const name = decodeName(c.req.header('x-filename'));
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    if (!bytes.byteLength) return c.json(apiError('invalid', 'That file is empty.'), 400);
    const { mime } = await sniff(bytes, name);
    const claimed = claimedKind(c.req.header('content-type') ?? '');
    const actual = evidenceKindFor(mime);
    if (claimed && claimed !== actual)
      return c.json(apiError('type_mismatch', `${name ? `“${name}”` : 'That file'} says it's ${claimed === 'image' ? 'a picture' : 'a PDF'}, but it isn't one, so BragDoc didn't keep it.`), 415);
    if (SIZED.has(mime) && !imageSize(bytes)) return c.json(apiError('damaged', `${name ? `“${name}”` : 'That picture'} looks damaged (its header can't be read), so BragDoc didn't keep it.`), 415);
    try {
      const ingested = await ctx.services.evidence.ingestBytes(bytes, { originalName: name });
      const evidence: Evidence = ctx.services.evidence.toEvidence(ingested, ingested.kind === 'image' ? undefined : (ingested.sidecar.originalName ?? name));
      return c.json({ evidence, file: evidenceFile(ingested.sidecar), created: ingested.created } satisfies EvidenceUploaded<Evidence>, ingested.created ? 201 : 200);
    } catch (e) {
      return storeErrorResponse(c, e);
    }
  });

  const serve = (thumb: boolean) => (c: import('hono').Context) => {
    const sha = c.req.param('sha') ?? '';
    if (!SHA.test(sha)) return c.json(apiError('not_found', 'There is no such file.'), 404);
    let file: { path: string; sidecar: { mime: string; originalName?: string; ext: string } };
    try {
      file = ctx.services.evidence.file(sha);
    } catch (e) {
      return storeErrorResponse(c, e);
    }
    const mime = SERVE_AS.has(file.sidecar.mime) ? file.sidecar.mime : 'application/octet-stream';
    if (thumb && !mime.startsWith('image/')) return c.json(apiError('not_found', 'Only pictures have a thumbnail.'), 404);
    let bytes: Buffer;
    try {
      bytes = fs.readFileSync(file.path);
    } catch {
      return c.json(apiError('not_found', 'That file is missing from evidence/.'), 404);
    }
    const headers: Record<string, string> = {
      ...blobHeaders(mime, file.sidecar.originalName ?? `evidence.${file.sidecar.ext}`),
      // content-addressed: these bytes never change under this name
      'Cache-Control': 'private, max-age=31536000, immutable',
      ETag: `"${sha.slice(0, 32)}"`,
    };
    if (c.req.header('if-none-match') === headers.ETag) return c.body(null, 304, headers);
    return c.body(new Uint8Array(bytes), 200, headers);
  };
  app.get('/api/evidence/:sha', serve(false));
  app.get('/api/evidence/:sha/thumb', serve(true));
}
