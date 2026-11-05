// Types for scripts/schema-versions.mjs, so its test can import it under `strict`.
export function schemaVersionsFrom(dist: string): Promise<Record<string, number>>;
