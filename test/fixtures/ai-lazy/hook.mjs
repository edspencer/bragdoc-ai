// A module loader hook for test/ai-lazy.test.ts: it writes down every `ai` or `@ai-sdk/*` module anything asks for,
// then lets the resolution carry on unchanged. Registered by register.mjs; the log file comes from AI_LAZY_LOG.
import fs from 'node:fs';

export async function resolve(specifier, context, next) {
  if (/^(?:ai|@ai-sdk\/[^/]+)(?:\/|$)/.test(specifier)) fs.appendFileSync(process.env.AI_LAZY_LOG, `${specifier}\n`);
  return next(specifier, context);
}
