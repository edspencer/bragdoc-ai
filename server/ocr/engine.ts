// What every OCR engine is (SPEC R8): tesseract.js everywhere (server/ocr/tesseract.ts), Apple Vision on macOS
// (server/ocr/vision-macos.ts). server/ocr/index.ts chooses between them, queues the work and caches the results.

/** Engine names, as an evidence sidecar's `ocr.engine` records them. */
export type EngineName = 'tesseract' | 'vision';

export interface OcrText {
  /** The text, a line per line of text in the image. */
  text: string;
  /** The engine's own mean confidence, 0–100, when it gives one. */
  confidence?: number;
}

export interface OcrEngine {
  readonly name: EngineName;
  /** Whether it can run here. Asked once and remembered; never throws. */
  available(): Promise<{ ok: true } | { ok: false; why: string }>;
  /** Read the text in an image's bytes. Rejects with an OcrError. */
  recognize(image: Uint8Array, opts: { timeoutMs: number }): Promise<OcrText>;
  /** Let go of what it holds (a worker thread). */
  close(): Promise<void>;
}

export type OcrErrorCode = 'unsupported' | 'too_large' | 'timeout' | 'unavailable' | 'busy' | 'failed';

export class OcrError extends Error {
  constructor(
    message: string,
    readonly code: OcrErrorCode,
  ) {
    super(message);
    this.name = 'OcrError';
  }
}

/** Run `p`, or reject with a timeout OcrError after `ms` (and call `onTimeout`, which stops the work). */
export function withTimeout<T>(p: Promise<T>, ms: number, what: string, onTimeout: () => void): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout();
      reject(new OcrError(`${what} took longer than ${ms} ms`, 'timeout'));
    }, ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}
