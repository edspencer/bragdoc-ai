// The worker thread tesseract.js runs OCR in (its `workerPath`): tesseract's own Node entry
// (tesseract.js/src/worker-script/node/index.js, 15 lines), rewritten so the worker can't reach the network or write a
// file, and can't be left hanging (SPEC R4, D40).
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
// @ts-expect-error: tesseract.js ships no types for its worker internals (CommonJS)
import worker from 'tesseract.js/src/worker-script/index.js';
// @ts-expect-error: as above
import getCore from 'tesseract.js/src/worker-script/node/getCore.js';
// @ts-expect-error: as above
import gunzip from 'tesseract.js/src/worker-script/node/gunzip.js';
// @ts-expect-error: as above
import cache from 'tesseract.js/src/worker-script/node/cache.js';

interface Packet {
  status?: string;
  action?: string;
}
const FATAL = new Set(['load', 'loadLanguage', 'initialize']);

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
  worker.dispatchHandlers(packet, (out: Packet) => {
    parentPort!.postMessage(out);
    if (out.status === 'reject' && FATAL.has(out.action ?? '')) setTimeout(() => process.exit(1), 50);
  });
});
