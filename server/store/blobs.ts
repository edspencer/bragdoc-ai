// Evidence files (SPEC R2, R3): stored once, content-addressed, as evidence/<aa>/<sha256>.<ext>, each with a YAML
// sidecar (evidence/<aa>/<sha256>.yaml) that the store indexes. The type comes from the content (magic bytes, via
// `file-type`), never from the name or what the client claims, because the blob route serves it back with that type.
// Adding the same bytes twice stores them once.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import type { EvidenceKind, EvidenceSidecar } from '../../shared/schema/index.js';
import { ValidationError } from './errors.js';
import { blobRelPath } from './files.js';
import type { Store } from './index.js';
import { atomicWrite } from './safefs.js';

/** 25 MB per file (SPEC R3's upload limit). */
export const MAX_BLOB_BYTES = 25 * 1024 * 1024;

export interface Ingested {
  sha256: string;
  sidecar: EvidenceSidecar;
  /** The evidence kind its type implies: image, pdf or file. */
  kind: EvidenceKind;
  /** False when these bytes were already stored. */
  created: boolean;
}

export const evidenceKindFor = (mime: string): EvidenceKind => (mime.startsWith('image/') ? 'image' : mime === 'application/pdf' ? 'pdf' : 'file');

/** The type of `bytes`: from magic bytes; else SVG or plain text if it's clearly that; else unknown binary. */
export async function sniff(bytes: Uint8Array, originalName?: string): Promise<{ mime: string; ext: string }> {
  const ft = await fileTypeFromBuffer(bytes);
  // file-type calls an SVG "XML": look for the <svg> root (SVG is only ever shown through <img>, SPEC R3)
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 4096));
  if ((!ft || ft.ext === 'xml') && /^\uFEFF?\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>/]/i.test(head)) return { mime: 'image/svg+xml', ext: 'svg' };
  if (ft) return { mime: ft.mime, ext: ft.ext };
  let text = true;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = false;
  }
  if (text && !bytes.includes(0)) {
    const ext = /\.(md|markdown|txt|csv|json|log)$/i.exec(originalName ?? '')?.[1].toLowerCase();
    return { mime: ext === 'md' || ext === 'markdown' ? 'text/markdown' : ext === 'csv' ? 'text/csv' : ext === 'json' ? 'application/json' : 'text/plain', ext: ext ?? 'txt' };
  }
  return { mime: 'application/octet-stream', ext: 'bin' };
}

/** Width and height of a PNG, GIF, JPEG or WebP, from its header; undefined for anything else. */
export function imageSize(b: Uint8Array): { width: number; height: number } | undefined {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const ascii = (o: number, n: number) => String.fromCharCode(...b.subarray(o, o + n));
  try {
    if (b.length >= 24 && b[0] === 0x89 && ascii(1, 3) === 'PNG') return { width: dv.getUint32(16), height: dv.getUint32(20) };
    if (b.length >= 10 && ascii(0, 3) === 'GIF') return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) };
    if (b.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
      const chunk = ascii(12, 4);
      if (chunk === 'VP8X') return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
      if (chunk === 'VP8L') return { width: 1 + (dv.getUint16(21, true) & 0x3fff), height: 1 + ((dv.getUint32(21, true) >> 14) & 0x3fff) };
      if (chunk === 'VP8 ') return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      // walk the JPEG segments to the first start-of-frame
      for (let o = 2; o + 9 < b.length; ) {
        if (b[o] !== 0xff) return undefined;
        const marker = b[o + 1];
        const len = dv.getUint16(o + 2);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { width: dv.getUint16(o + 7), height: dv.getUint16(o + 5) };
        o += 2 + len;
      }
    }
  } catch {
    /* a truncated header */
  }
  return undefined;
}

/** A display-safe original name: the base name, no control characters, at most 200 characters. */
const cleanName = (n: string | undefined) => (n ? path.basename(n).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200) || undefined : undefined);

/** Store `bytes` as an evidence file (or find them already stored). */
export interface IngestOptions {
  originalName?: string;
  /** Only these evidence kinds (checked from the content, before anything is stored). */
  only?: readonly EvidenceKind[];
  /** Only these types (checked from the content, before anything is stored); `what` names them in the refusal. */
  accept?: { mimes: RegExp; what: string };
}

export async function ingestBytes(store: Store, bytes: Uint8Array, opts: IngestOptions = {}): Promise<Ingested> {
  if (bytes.byteLength > MAX_BLOB_BYTES) throw new ValidationError(`that file is ${(bytes.byteLength / 1048576).toFixed(1)} MB; the limit is ${MAX_BLOB_BYTES / 1048576} MB`);
  if (bytes.byteLength === 0) throw new ValidationError('that file is empty');
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  const existing = store.get('evidence', sha);
  const blobAbs = existing ? path.join(store.home, blobRelPath(sha, existing.ext)) : null;
  const { mime, ext } = existing ?? (await sniff(bytes, opts.originalName));
  if (opts.only && !opts.only.includes(evidenceKindFor(mime))) throw new ValidationError(`that file is ${mime}, not ${opts.only.join(' or ')}`);
  if (opts.accept && !opts.accept.mimes.test(mime)) throw new ValidationError(`that file is ${mime}; only ${opts.accept.what} can be added as evidence`);
  if (existing && blobAbs && fs.existsSync(blobAbs)) return { sha256: sha, sidecar: existing, kind: evidenceKindFor(existing.mime), created: false };
  const abs = path.join(store.home, blobRelPath(sha, ext));
  // content-addressed: a file already at this name holds these very bytes, so it's never replaced
  if (!fs.existsSync(abs)) atomicWrite(abs, bytes, { createOnly: true });
  const size = mime.startsWith('image/') ? imageSize(bytes) : undefined;
  const sidecar = store.write('evidence', sha, (cur) =>
    cur
      ? null
      : {
          patch: {
            sha256: sha,
            mime,
            ext,
            ...(cleanName(opts.originalName) ? { originalName: cleanName(opts.originalName) } : {}),
            bytes: bytes.byteLength,
            ...(size ?? {}),
            createdAt: store.now().toISOString(),
          },
        },
  );
  return { sha256: sha, sidecar, kind: evidenceKindFor(mime), created: !existing };
}

/**
 * Check that `file` may be stored as evidence, without reading it: an absolute path to a regular file (not a directory,
 * device or socket), within the size cap; never one in the data home or a hidden directory. Symlinks are followed (a
 * screenshot folder may be one), and the checks apply to where they lead. Returns the real path and its size.
 */
export function checkIngestPath(store: Store, file: string): { real: string; bytes: number } {
  if (!path.isAbsolute(file)) throw new ValidationError(`${file} isn't an absolute path`);
  // never BragDoc's own files (secrets.yaml, runtime.json), and nothing in a hidden directory (~/.ssh, ~/.config): an
  // agent asking for those is never asking for evidence
  let real: string;
  try {
    real = fs.realpathSync(file);
  } catch {
    throw new ValidationError(`there's no file at ${file}`);
  }
  const home = (() => {
    try {
      return fs.realpathSync(store.home);
    } catch {
      return path.resolve(store.home);
    }
  })();
  if (real === home || real.startsWith(home + path.sep)) throw new ValidationError(`${file} is inside BragDoc's data folder, so it can't be added as evidence`);
  if (real.split(path.sep).slice(0, -1).some((seg) => seg.startsWith('.'))) throw new ValidationError(`${file} is in a hidden folder, so it can't be added as evidence`);
  let st: fs.Stats;
  try {
    st = fs.statSync(real);
  } catch {
    throw new ValidationError(`there's no file at ${file}`);
  }
  if (!st.isFile()) throw new ValidationError(`${file} is not a regular file`);
  if (st.size > MAX_BLOB_BYTES) throw new ValidationError(`${file} is ${(st.size / 1048576).toFixed(1)} MB; the limit is ${MAX_BLOB_BYTES / 1048576} MB`);
  return { real, bytes: st.size };
}

/** Store the file at `file` as evidence, after checkIngestPath's checks. */
export async function ingestPath(store: Store, file: string, opts: IngestOptions = {}): Promise<Ingested> {
  const { real } = checkIngestPath(store, file);
  return ingestBytes(store, fs.readFileSync(real), { ...opts, originalName: opts.originalName ?? path.basename(file) });
}

/** The absolute path of a stored evidence file, or null if there's no such blob (or its file is missing). */
export function blobPath(store: Store, sha: string): string | null {
  const s = store.get('evidence', sha);
  if (!s) return null;
  const abs = path.join(store.home, blobRelPath(sha, s.ext));
  return fs.existsSync(abs) ? abs : null;
}
