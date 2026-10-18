// tesseract.js: the OCR engine on every platform (SPEC R8), WebAssembly in a worker thread. Nothing is fetched (R4):
// the English language data is a dependency of the package (@tesseract.js-data/eng's LSTM-only "best_int" model,
// 2.9 MB), read from disk; nothing is cached on disk either (`cacheMethod: 'none'`: by default tesseract.js writes
// the data into the current directory); images go in as bytes; and the worker has no fetch at all
// (server/ocr/tesseract-worker.ts). D52.
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
/** Our worker: tesseract-worker.js once built; from source, a bootstrap that loads the .ts through tsx. */
const WORKER_PATH = fileURLToPath(new URL(import.meta.url.endsWith('.ts') ? './tesseract-worker-source.mjs' : './tesseract-worker.js', import.meta.url));
export const IDLE_MS = 60_000;

export interface TesseractOptions {
  /** Where the language data is (tests point it elsewhere to prove a URL can't be fetched). */
  langPath?: string;
  /** The worker script (tests use a broken one). */
  workerPath?: string;
  idleMs?: number;
}

/** The thread tesseract.js runs our worker in (its createWorker() result's `worker`, a node:worker_threads Worker). */
interface Thread {
  once(event: 'error', fn: (e: Error) => void): void;
  once(event: 'exit', fn: (code: number) => void): void;
}

interface Live {
  worker: Worker;
  /** Rejects when the thread dies (an uncaught error in it, or it exited), so nothing waits on it forever. */
  died: Promise<never>;
}

/** How long close() waits for a worker that never finished starting before letting go of it. */
const CLOSE_GRACE_MS = 2_000;

export class TesseractEngine implements OcrEngine {
  readonly name = 'tesseract' as const;
  private live: Promise<Live> | null = null;
  private idle: NodeJS.Timeout | undefined;
  private readonly langPath: string;
  private readonly workerPath: string;
  private readonly idleMs: number;

  constructor({ langPath = LANG_DIR, workerPath = WORKER_PATH, idleMs = IDLE_MS }: TesseractOptions = {}) {
    this.langPath = langPath;
    this.workerPath = workerPath;
    this.idleMs = idleMs;
  }

  async available() {
    return { ok: true } as const;
  }

  private start(): Promise<Live> {
    if (this.live) return this.live;
    // createWorker() never settles if the language data fails to load (tesseract.js 7), but the error does reach
    // errorHandler, and our worker ends its thread (tesseract-worker.ts). Without a handler it'd be thrown, uncaught.
    let failed: (e: unknown) => void = () => {};
    const failure = new Promise<never>((_, reject) => (failed = reject));
    const created = createWorker('eng', OEM.LSTM_ONLY, {
      langPath: this.langPath,
      cacheMethod: 'none',
      gzip: true,
      workerPath: this.workerPath,
      workerBlobURL: false,
      logger: () => {},
      errorHandler: (e: unknown) => failed(e),
    });
    const live = Promise.race([created, failure]).then(
      (worker): Live => {
        // tesseract.js sets `worker.onerror`, which a node:worker_threads Worker ignores: without a listener of our
        // own, an uncaught error in the thread would be an uncaught 'error' event here, and take the server down
        const thread = (worker as unknown as { worker: Thread }).worker;
        const died = new Promise<never>((_, reject) => {
          thread.once('error', (e) => reject(new OcrError(`tesseract's worker failed: ${e.message}`, 'failed')));
          thread.once('exit', (code) => reject(new OcrError(`tesseract's worker stopped (exit ${code})`, 'failed')));
        });
        died.catch(() => {
          if (this.live === live) this.live = null;
        });
        return { worker, died };
      },
      (e: unknown) => {
        if (this.live === live) this.live = null;
        throw new OcrError(`tesseract couldn't start: ${e instanceof Error ? e.message : String(e)}`, 'unavailable');
      },
    );
    this.live = live;
    return live;
  }

  async recognize(image: Uint8Array, { timeoutMs }: { timeoutMs: number }): Promise<OcrText> {
    const prepared = prepareForTesseract(image);
    clearTimeout(this.idle);
    try {
      const { worker, died } = await withTimeout(this.start(), timeoutMs, 'starting tesseract', () => void this.close());
      const { data } = await withTimeout(Promise.race([worker.recognize(Buffer.from(prepared.bytes)), died]), timeoutMs, 'tesseract', () => void this.close());
      return { text: data.text.replace(/\n+$/, ''), confidence: data.confidence };
    } catch (e) {
      if (e instanceof OcrError) throw e;
      throw new OcrError(`tesseract couldn't read it: ${e instanceof Error ? e.message : String(e)}`, 'failed');
    } finally {
      clearTimeout(this.idle);
      if (this.live) this.idle = setTimeout(() => void this.close(), this.idleMs).unref();
    }
  }

  async close(): Promise<void> {
    clearTimeout(this.idle);
    const live = this.live;
    this.live = null;
    if (!live) return;
    // a worker that never finished starting can't be terminated (tesseract.js hasn't handed it over): don't wait on it
    // forever. Ours ends its own thread when it fails (tesseract-worker.ts).
    let grace: NodeJS.Timeout | undefined;
    await Promise.race([live.then((l) => l.worker.terminate()), new Promise((r) => (grace = setTimeout(r, CLOSE_GRACE_MS)))]).catch(() => {});
    clearTimeout(grace);
  }
}
