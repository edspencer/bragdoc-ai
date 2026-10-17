// Types for scripts/build-info.mjs, so test/release.test.ts can import it under `strict`.
import type { BuildInfo } from '../shared/api.ts';

export function buildInfo(env?: NodeJS.ProcessEnv, commit?: () => string | null): BuildInfo;
