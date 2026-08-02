import { defineConfig } from 'tsup';

/**
 * The CLI is published to npm, but it depends on the private workspace package
 * `@bragdoc/ai`, which is never published. The published artifact therefore has
 * to be self-contained: `@bragdoc/ai` is bundled in (tsconfig.json maps it to
 * source and it lives in devDependencies, so tsup inlines it; `noExternal`
 * makes that explicit), while every real npm dependency stays external and is
 * installed from the registry as usual.
 */
export default defineConfig({
  entry: ['src/index.ts', 'src/lib.ts'],
  outDir: 'dist',
  format: ['cjs'],
  platform: 'node',
  target: 'node18',
  // Bundle the private workspace package into the output.
  noExternal: ['@bragdoc/ai'],
  // Everything listed in `dependencies` is external by default; spelled out
  // here so an accidental inlining of a real npm dep is obvious in review.
  external: [
    '@ai-sdk/anthropic',
    '@ai-sdk/google',
    '@ai-sdk/openai',
    'ai',
    'boxen',
    'chalk',
    'commander',
    'inquirer',
    'mdx-prompt',
    'node-fetch',
    'ollama-ai-provider-v2',
    'open',
    'p-limit',
    'react',
    'winston',
    'yaml',
    'zod',
  ],
  // Only the library entrypoint has a public type surface; src/index.ts is the
  // bin and would otherwise emit a declaration file containing just a shebang.
  dts: { entry: 'src/lib.ts' },
  sourcemap: true,
  clean: true,
  splitting: false,
  shims: false,
  // `boxen`, `open` and `p-limit` are ESM-only and are reached through dynamic
  // `import()`. esbuild would otherwise rewrite those to `require()` in CJS
  // output, which throws ERR_REQUIRE_ESM at runtime.
  esbuildOptions(options) {
    options.supported = { ...options.supported, 'dynamic-import': true };
  },
});
