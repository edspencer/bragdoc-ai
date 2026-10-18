// The only place the AI SDK is loaded (SPEC R20, principle 3). Nothing createApp() imports statically may import `ai`
// or `@ai-sdk/*`: this file has only `import type`s of them (erased by the compiler) and loads the real thing with
// import() on the first model call, so with AI off the SDK is never even resolved. test/ai-lazy.test.ts proves it
// with a module loader hook over a whole AI-off session.
//
// On that first load it also closes the SDK's default route out: a model given as a plain string would go to Vercel's
// hosted gateway, so AI_SDK_DEFAULT_PROVIDER becomes a provider that throws (principle 8), and the SDK's console
// warnings are turned off (they'd print to the server's output, beside the banner). Telemetry is never registered.
import type { LanguageModel } from 'ai';
import type { Config } from '../config.js';
import type { ProviderFetch } from '../egress.js';

export type { LanguageModel };
export type Sdk = typeof import('ai');
export type Providers = typeof import('./providers.js');
export type Decisions = typeof import('./decide.js');

/** What the first model call loads: the SDK, the provider factories, and Jev's decision model (D82). */
export interface Loaded {
  sdk: Sdk;
  providers: Providers;
  decisions: Decisions;
}

let loading: Promise<Loaded> | null = null;

const refuse = (what: string) => () => {
  throw new Error(`BragDoc never names a model by string (${what}): every model comes from a connection you set up`);
};

/** The SDK, loaded once, on first use. */
export function loadSdk(): Promise<Loaded> {
  loading ??= (async () => {
    const [sdk, providers, decisions] = await Promise.all([import('ai'), import('./providers.js'), import('./decide.js')]);
    // one assignment, so the egress guard counts one use of the global object here
    Object.assign(globalThis, {
      AI_SDK_DEFAULT_PROVIDER: { specificationVersion: 'v4', languageModel: refuse('languageModel'), embeddingModel: refuse('embeddingModel'), imageModel: refuse('imageModel'), decisionModel: refuse('decisionModel') },
      AI_SDK_LOG_WARNINGS: false,
    });
    return { sdk, providers, decisions };
  })();
  loading.catch(() => {
    loading = null; // a failed load (a broken install) is tried again next time
  });
  return loading;
}

/** What a provider factory needs to build a model: the egress-bound fetch is the only network it gets. */
export interface ModelRequest {
  config: Config;
  connectionId: string;
  model: string;
  /** egress.fetchFor(...) for this call. */
  fetch: ProviderFetch;
  /** The connection's key (its own, or its `via`'s), if it has one. */
  apiKey: string | null;
  /** Use JSON mode rather than a schema (a server that refused schemas once). */
  jsonMode?: boolean;
}
