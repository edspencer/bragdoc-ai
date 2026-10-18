// From source only (tests, `npm run bragdoc`, `npm run dev`): tesseract.js's worker thread, when the worker is still
// TypeScript. Node 22.12's worker threads don't get the tsx loader the main thread was started with (later 22.x do),
// so this registers it in the thread and then loads the real worker. The build never ships it: tsc doesn't copy .mjs
// files, and a built server uses dist/server/ocr/tesseract-worker.js directly (server/ocr/tesseract.ts).
import { register } from 'tsx/esm/api';

register();
await import('./tesseract-worker.ts');
