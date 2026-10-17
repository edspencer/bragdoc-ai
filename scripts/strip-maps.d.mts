// Types for scripts/strip-maps.mjs, so test/release.test.ts can import it under `strict`.
export function stripSourceMappingUrl(body: string): string;
export function stripMaps(dir: string): { maps: number; comments: number };
