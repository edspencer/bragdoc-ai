// OCR (SPEC R8): reads the text in an image, on this machine, with no AI and no network. Apple Vision on macOS when it
// works, tesseract.js everywhere else and as the fallback. Callers (the screenshots source and pasted evidence, PR15)
// use createOcr() and then the screenshot rules (shared/rules/screenshot.ts) on the text.
//
// - **Which engine:** the first one that's available, in order (Vision, then tesseract.js on macOS); if it fails on an
//   image, the next one tries, and the result says which engine ran and why an earlier one didn't.
// - **One at a time:** reads are queued, so a burst of screenshots can't pin the CPU; the same image asked for twice
//   while queued is read once. Past MAX_QUEUE waiting, a read is refused (`busy`) rather than queued forever.
// - **Cached by the image's sha256.** In memory by default. evidenceOcrCache() keeps the text of evidence files in
//   their sidecars (where search reads it) and holds anything else in memory only: a screenshot that isn't kept
//   leaves no text on disk (R7).
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import type { Services } from '../services/index.js';
import type { Store } from '../store/index.js';
import { type EngineName, type OcrEngine, OcrError } from './engine.js';
import { TesseractEngine } from './tesseract.js';
import { VisionEngine } from './vision-macos.js';

export { OcrError, type EngineName, type OcrEngine } from './engine.js';

export const DEFAULT_TIMEOUT_MS = 60_000;
export const MAX_QUEUE = 100;

export interface OcrResult {
  engine: EngineName;
  text: string;
  confidence?: number;
  sha256: string;
  /** How long it took (0 from the cache). */
  ms: number;
  cached: boolean;
  /** Engines that were tried first and why they weren't used, e.g. "vision: Apple Vision is only on macOS". */
  skipped: string[];
}

export interface CachedOcr {
  engine: EngineName;
  text: string;
  confidence?: number;
}

export interface OcrCache {
  get(sha256: string): CachedOcr | undefined;
  set(sha256: string, value: CachedOcr): void;
}

/** The last `limit` results, in memory. */
export function memoryCache(limit = 500): OcrCache {
  const m = new Map<string, CachedOcr>();
  return {
    get: (sha) => {
      const v = m.get(sha);
      if (v) m.delete(sha), m.set(sha, v); // most recently used last
      return v;
    },
    set: (sha, v) => {
      m.delete(sha);
      m.set(sha, v);
      while (m.size > limit) m.delete(m.keys().next().value!);
    },
  };
}

/**
 * Evidence files keep their text in their sidecar's `ocr` (the store's index makes it searchable); anything else (a
 * screenshot not kept) is held by `others`, in memory. Writes go through the evidence service, like every write.
 */
export function evidenceOcrCache(store: Store, services: Services, others: OcrCache = memoryCache()): OcrCache {
  const isEngine = (e: string): e is EngineName => e === 'tesseract' || e === 'vision';
  return {
    get(sha) {
      const ocr = store.get('evidence', sha)?.ocr;
      if (ocr && isEngine(ocr.engine)) return { engine: ocr.engine, text: ocr.text };
      return others.get(sha);
    },
    set(sha, v) {
      if (store.get('evidence', sha)) services.evidence.setOcr(sha, { engine: v.engine, text: v.text, at: new Date().toISOString() });
      else others.set(sha, v);
    },
  };
}

export interface OcrOptions {
  /** In order of preference. Default: defaultEngines(). */
  engines?: OcrEngine[];
  cache?: OcrCache;
  timeoutMs?: number;
  now?: () => number;
}

export type ImageInput = { bytes: Uint8Array } | { path: string };

export interface ReadOptions {
  /** Use only this engine (and skip the cache). Default: the first that's available. */
  engine?: EngineName;
}

export interface Ocr {
  read(input: ImageInput, opts?: ReadOptions): Promise<OcrResult>;
  /** Each engine and whether it can run here. */
  engines(): Promise<{ name: EngineName; ok: boolean; why?: string }[]>;
  /** How many reads are waiting. */
  queued(): number;
  close(): Promise<void>;
}

/** Vision then tesseract.js on macOS; tesseract.js elsewhere. */
export function defaultEngines(platform: NodeJS.Platform = process.platform): OcrEngine[] {
  return platform === 'darwin' ? [new VisionEngine({ platform }), new TesseractEngine()] : [new TesseractEngine()];
}

export const sha256Of = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

export function createOcr({ engines = defaultEngines(), cache = memoryCache(), timeoutMs = DEFAULT_TIMEOUT_MS, now = Date.now }: OcrOptions = {}): Ocr {
  let tail: Promise<unknown> = Promise.resolve();
  let waiting = 0;
  const inflight = new Map<string, Promise<OcrResult>>();

  async function readNow(bytes: Uint8Array, sha: string, only: EngineName | undefined): Promise<OcrResult> {
    const skipped: string[] = [];
    let last: unknown = new OcrError('no OCR engine is available', 'unavailable');
    for (const e of engines) {
      if (only && e.name !== only) continue;
      const ok = await e.available();
      if (!ok.ok) {
        skipped.push(`${e.name}: ${ok.why}`);
        last = new OcrError(ok.why, 'unavailable');
        continue;
      }
      const start = now();
      try {
        const r = await e.recognize(bytes, { timeoutMs });
        if (!only) cache.set(sha, { engine: e.name, text: r.text, ...(r.confidence !== undefined ? { confidence: r.confidence } : {}) });
        return { engine: e.name, text: r.text, ...(r.confidence !== undefined ? { confidence: r.confidence } : {}), sha256: sha, ms: now() - start, cached: false, skipped };
      } catch (err) {
        // the image itself is the problem: another engine won't do better
        if (err instanceof OcrError && (err.code === 'unsupported' || err.code === 'too_large')) throw err;
        skipped.push(`${e.name}: ${err instanceof Error ? err.message : String(err)}`);
        last = err;
      }
    }
    if (only && !engines.some((e) => e.name === only)) throw new OcrError(`the ${only} engine isn't one BragDoc can use here`, 'unavailable');
    throw last instanceof OcrError ? Object.assign(last, { message: skipped.length > 1 ? `${last.message} (also tried: ${skipped.slice(0, -1).join('; ')})` : last.message }) : last;
  }

  return {
    async read(input, opts = {}) {
      const bytes = 'bytes' in input ? input.bytes : new Uint8Array(await fs.readFile(input.path));
      const sha = sha256Of(bytes);
      if (!opts.engine) {
        const hit = cache.get(sha);
        if (hit) return { ...hit, sha256: sha, ms: 0, cached: true, skipped: [] };
      }
      const key = `${opts.engine ?? ''}:${sha}`;
      const pending = inflight.get(key);
      if (pending) return pending;
      if (waiting >= MAX_QUEUE) throw new OcrError(`too many images are waiting to be read (${waiting}); try again in a moment`, 'busy');
      waiting++;
      const job = tail.then(() => readNow(bytes, sha, opts.engine)).finally(() => {
        waiting--;
        inflight.delete(key);
      });
      tail = job.catch(() => {});
      inflight.set(key, job);
      return job;
    },
    async engines() {
      return Promise.all(
        engines.map(async (e) => {
          const a = await e.available();
          return a.ok ? { name: e.name, ok: true } : { name: e.name, ok: false, why: a.why };
        }),
      );
    },
    queued: () => waiting,
    async close() {
      await tail.catch(() => {});
      await Promise.all(engines.map((e) => e.close()));
    },
  };
}
