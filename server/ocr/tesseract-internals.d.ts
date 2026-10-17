// The tesseract.js worker internals server/ocr/tesseract-worker.ts loads (tesseract.js ships no types for them; its
// version is pinned, ~7.0.0, because they're internals). Only what we use.
declare module 'tesseract.js/src/worker-script/index.js' {
  export function setAdapter(adapter: Record<string, unknown>): void;
  export function dispatchHandlers(packet: unknown, send: (out: { status?: string; action?: string }) => void): void;
}
declare module 'tesseract.js/src/worker-script/node/getCore.js' {
  const getCore: unknown;
  export default getCore;
}
declare module 'tesseract.js/src/worker-script/node/gunzip.js' {
  const gunzip: unknown;
  export default gunzip;
}
declare module 'tesseract.js/src/worker-script/node/cache.js' {
  const cache: { readCache: unknown; checkCache: unknown };
  export default cache;
}
