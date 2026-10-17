// Evidence files: store bytes or a file from disk (content-addressed, typed by magic bytes; store/blobs.ts), turn the
// result into an Evidence item, and record OCR text on the sidecar (PR11), which makes it searchable.
import fs from 'node:fs';
import { OcrSchema, type Evidence, type EvidenceSidecar } from '../../shared/schema/index.js';
import { ulid } from '../../shared/ulid.js';
import { blobPath, checkIngestPath, ingestBytes, ingestPath, sniff, type IngestOptions, type Ingested } from '../store/blobs.js';
import { NotFoundError, type Store } from '../store/index.js';
import { validate } from './util.js';

/**
 * What agents may add from disk (sniffed from the content, D42): pictures, documents, text and short videos. Applied
 * when an MCP tool stores a file, and again when a Found candidate an agent sent is kept (the file may have changed).
 */
export const ATTACHABLE = {
  mimes:
    /^(?:image\/(?:png|jpeg|gif|webp|avif|svg\+xml|heic|heif|bmp|tiff)|application\/pdf|text\/(?:plain|markdown|csv)|application\/json|video\/(?:mp4|quicktime|webm)|application\/vnd\.openxmlformats-officedocument\.(?:wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|application\/vnd\.oasis\.opendocument\.(?:text|spreadsheet|presentation))$/,
  what: 'images, PDFs, office documents, text files and videos',
};

export class EvidenceService {
  constructor(private store: Store) {}

  /** Store bytes (an upload, a paste). */
  ingestBytes(bytes: Uint8Array, opts: IngestOptions = {}): Promise<Ingested> {
    return ingestBytes(this.store, bytes, opts);
  }

  /** Store a regular file from disk (a screenshot, an MCP attach_evidence path). */
  ingestPath(file: string, opts: IngestOptions = {}): Promise<Ingested> {
    return ingestPath(this.store, file, opts);
  }

  /**
   * What a file would be stored as, without storing it: ingestPath's checks, then its type from its content. For a file
   * a Found candidate points at, which is only copied into evidence/ when it's kept (D24).
   */
  async inspectPath(file: string): Promise<{ real: string; bytes: number; mime: string }> {
    const { real, bytes } = checkIngestPath(this.store, file);
    const { mime } = await sniff(fs.readFileSync(real), file);
    return { real, bytes, mime };
  }

  /** An Evidence item for a stored file, ready to attach. */
  toEvidence(i: Ingested, title?: string): Evidence {
    return { id: ulid(this.store.now().getTime()), kind: i.kind, blob: i.sha256, ...(title ? { title } : {}) };
  }

  sidecar(sha: string): EvidenceSidecar {
    const s = this.store.get('evidence', sha);
    if (!s) throw new NotFoundError(`there's no stored file ${sha}`);
    return s;
  }

  /** The stored file's absolute path and type, for serving it (PR7), or NotFoundError. */
  file(sha: string): { path: string; sidecar: EvidenceSidecar } {
    const sidecar = this.sidecar(sha);
    const p = blobPath(this.store, sha);
    if (!p) throw new NotFoundError(`the stored file ${sha} is missing from evidence/`);
    return { path: p, sidecar };
  }

  /** Record what OCR read on an image (PR11). Replaces any earlier reading. */
  setOcr(sha: string, ocr: unknown): EvidenceSidecar {
    const v = validate(OcrSchema, ocr);
    return this.store.write('evidence', sha, () => ({ patch: { ocr: v } }), { mustExist: true });
  }
}
