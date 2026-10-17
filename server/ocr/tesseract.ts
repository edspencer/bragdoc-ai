// tesseract.js: the OCR engine on every platform (SPEC R8), WebAssembly in a worker thread. Nothing is fetched (R4):
// the English language data is a dependency of the package (@tesseract.js-data/eng's LSTM-only "best_int" model,
// 2.9 MB), read from disk; nothing is cached on disk either (`cacheMethod: 'none'`: by default tesseract.js writes
// the data into the current directory); images go in as bytes; and the worker has no fetch at all
// (server/ocr/tesseract-worker.ts). D40.
//
// One worker, one image at a time (server/ocr/index.ts queues). It starts on first use, which takes about half a
// second, and stops after a minute idle, giving back its ~100 MB. A recognition that runs past its timeout terminates
// the worker; the next one starts a fresh worker.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorker, OEM, type Worker } from 'tesseract.js';
import { type OcrEngine, OcrError, type OcrText, withTimeout } from './engine.js';
import { prepareForTesseract } from './image.js';

/** The English model, inside the installed package: never the CDN tesseract.js would use by default. */
export const LANG_DIR = path.join(path.dirname(fileURLToPath(import.meta.resolve('@tesseract.js-data/eng/package.json'))), '4.0.0_best_int');
/** Our worker wrapper: `.ts` when running from source (tsx; the worker inherits its --import), `.js` once built. */
const WORKER_PATH = fileURLToPath(new URL(`./tesseract-worker${path.extname(fileURLToPath(import.meta.url))}`, import.meta.url));
export const IDLE_MS = 60_000;

export interface TesseractOptions {
  /** Where the language data is (tests point it elsewhere to prove a URL can't be fetched). */
  langPath?: string;
  idleMs?: number;
}

export class TesseractEngine implements OcrEngine {
  readonly name = 'tesseract' as const;
  private worker: Promise<Worker> | null = null;
  private idle: NodeJS.Timeout | undefined;
  private readonly langPath: string;
  private readonly idleMs: number;

  constructor({ langPath = LANG_DIR, idleMs = IDLE_MS }: TesseractOptions = {}) {
    this.langPath = langPath;
    this.idleMs = idleMs;
  }

  async available() {
    return { ok: true } as const;
  }

  private start(): Promise<Worker> {
    if (this.worker) return this.worker;
    // createWorker() never settles if the language data fails to load (tesseract.js 7), but the error does reach
    // errorHandler, and our worker ends its thread (tesseract-worker.ts). Without a handler it'd be thrown, uncaught.
    let failed: (e: unknown) => void = () => {};
    const failure = new Promise<never>((_, reject) => (failed = reject));
    const created = createWorker('eng', OEM.LSTM_ONLY, {
      langPath: this.langPath,
      cacheMethod: 'none',
      gzip: true,
      workerPath: WORKER_PATH,
      workerBlobURL: false,
      logger: () => {},
      errorHandler: (e: unknown) => failed(e),
    });
    this.worker = Promise.race([created, failure]).catch((e: unknown) => {
      this.worker = null;
      throw new OcrError(`tesseract couldn't start: ${e instanceof Error ? e.message : String(e)}`, 'unavailable');
    });
    return this.worker;
  }

  async recognize(image: Uint8Array, { timeoutMs }: { timeoutMs: number }): Promise<OcrText> {
    const prepared = prepareForTesseract(image);
    clearTimeout(this.idle);
    try {
      const worker = await withTimeout(this.start(), timeoutMs, 'starting tesseract', () => void this.close());
      const { data } = await withTimeout(worker.recognize(Buffer.from(prepared.bytes)), timeoutMs, 'tesseract', () => void this.close());
      return { text: data.text.replace(/\n+$/, ''), confidence: data.confidence };
    } catch (e) {
      if (e instanceof OcrError) throw e;
      throw new OcrError(`tesseract couldn't read it: ${e instanceof Error ? e.message : String(e)}`, 'failed');
    } finally {
      clearTimeout(this.idle);
      if (this.worker) this.idle = setTimeout(() => void this.close(), this.idleMs).unref();
    }
  }

  async close(): Promise<void> {
    clearTimeout(this.idle);
    const w = this.worker;
    this.worker = null;
    if (w) await w.then((x) => x.terminate()).catch(() => {});
  }
}
