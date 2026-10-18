// The worker thread tesseract.js runs OCR in (its `workerPath`): tesseract's own Node entry
// (tesseract.js/src/worker-script/node/index.js, 15 lines), rewritten so the worker can't reach the network or write a
// file, and can't be left hanging (SPEC R4, D52).
//
// - **No network.** tesseract.js fetches in two cases: language data when `langPath` is a URL (its default is a CDN),
//   and an image given as a URL. server/ocr/tesseract.ts never does either (the English data is read from the package,
//   images go in as bytes), and this makes it a guarantee: the adapter's `fetch` only fails. test/ocr.test.ts points the
//   worker at a URL to prove it.
// - **No files written.** tesseract.js caches language data in the current directory unless told not to. Its cache
//   writes and deletes are no-ops here; only reads (of the package's own language data) are real.
// - **No hang.** When language data fails to load or initialise, tesseract.js's createWorker() never settles (with an
//   errorHandler; without one it throws, uncaught), and the thread would keep the process alive. So a failed `load`,
//   `loadLanguage` or `initialize` ends the thread, once its rejection has been posted.
//
// The worker_threads import is the guard's reviewed exception (test/guard-egress.test.ts): it is how a worker talks to
// its parent, and nothing here starts a thread.
import { parentPort } from 'node:worker_threads';

const FATAL = new Set(['load', 'loadLanguage', 'initialize']);

// Anything uncaught here (tesseract.js's internals moved, say) ends the thread rather than reaching the parent as an
// error it must handle; the parent sees the exit (server/ocr/tesseract.ts).
process.on('uncaughtException', () => process.exit(1));

try {
  // CommonJS internals (typed in tesseract-internals.d.ts)
  const [worker, { default: getCore }, { default: gunzip }, { default: cache }] = await Promise.all([
    import('tesseract.js/src/worker-script/index.js'),
    import('tesseract.js/src/worker-script/node/getCore.js'),
    import('tesseract.js/src/worker-script/node/gunzip.js'),
    import('tesseract.js/src/worker-script/node/cache.js'),
  ]);

  worker.setAdapter({
    getCore,
    gunzip,
    fetch: (url: unknown) => Promise.reject(new Error(`BragDoc's OCR worker has no network access (it was asked to fetch ${String(url)})`)),
    readCache: cache.readCache,
    checkCache: cache.checkCache,
    writeCache: () => Promise.resolve(),
    deleteCache: () => Promise.resolve(),
  });

  parentPort!.on('message', (packet: unknown) => {
    worker.dispatchHandlers(packet, (out) => {
      parentPort!.postMessage(out);
      if (out.status === 'reject' && FATAL.has(out.action ?? '')) setTimeout(() => process.exit(1), 50);
    });
  });
} catch {
  process.exit(1);
}
