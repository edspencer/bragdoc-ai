---
"@bragdoc/cli": major
---

**Breaking:** `createLLMFromConfig` and `getLLMDisplayName` now take an `LLMConfig` instead of a `BragdocConfig`

The multi-provider LLM factory moved into a shared internal package that the web app and the CLI both use, and its functions now accept the LLM configuration directly rather than the whole CLI config object. Anyone calling these through the library entrypoint needs to pass `config.llm` instead of `config`:

```typescript
// Before
import { createLLMFromConfig } from '@bragdoc/cli';
const model = createLLMFromConfig(config);

// After
import { createLLMFromConfig } from '@bragdoc/cli';
const model = createLLMFromConfig(config.llm);
```

`isLLMConfigured` and `verifyLLMConfig` already took an `LLMConfig` and are unchanged. `getExtractionModel` and `renderExecute` are unaffected.

Both functions also accept an optional second argument: `allowEnvFallback` (default `true`) controls whether a missing `apiKey` may fall back to the provider's `<PROVIDER>_API_KEY` environment variable, and `remediationHint` appends caller-specific guidance to configuration errors.

Other changes in this release:

- The published package is now bundled with `tsup`, so the tarball is self-contained. Third-party dependencies are unchanged and still installed from the registry; only the private internal package is inlined. The `bragdoc` bin, the `@bragdoc/cli` and `@bragdoc/cli/lib` entrypoints, and the emitted type declarations all behave as before.
- LLM configuration errors again tell you how to fix them (`bragdoc llm set` / `bragdoc init`).
- Configuration verification no longer reports a spurious failure for OpenAI reasoning models, which reject a `max_completion_tokens` probe below 16.
