// The recommended local models (SPEC R18): a static table, dated, from the Found spike's measurements. Settings → AI
// (PR23) recommends from it by RAM, and the docs' "choosing a model" table (PR29) is generated from it, so neither can
// drift. Change it only with new measurements, and move `MODELS_AS_OF` when you do.

export const MODELS_AS_OF = '2026-10-18';

export interface RecommendedModel {
  /** The Ollama tag (`ollama pull <name>`). */
  name: string;
  /** Approximate download, in GB. Null for the larger tier, where it varies by model. */
  downloadGb: number | null;
  /** The RAM it wants, in GB. */
  ramGb: number;
  tier: 'default' | 'small' | 'better';
  note: string;
}

export const RECOMMENDED_MODELS: readonly RecommendedModel[] = [
  { name: 'gemma4:e4b', downloadGb: 6.6, ramGb: 16, tier: 'default', note: 'The default. 100% recall in the spike. Bundles vision encoders for later.' },
  { name: 'qwen3.5:4b', downloadGb: 3.3, ramGb: 8, tier: 'small', note: 'The 8 GB pick. Higher precision, slightly lower recall.' },
  { name: 'gemma4:26b-a4b', downloadGb: null, ramGb: 32, tier: 'better', note: 'The "better" tier: about 99% hosted in the spike; not measured locally.' },
  { name: 'qwen3:14b', downloadGb: null, ramGb: 32, tier: 'better', note: 'The "better" tier: about 99% hosted in the spike; not measured locally.' },
  { name: 'phi-4', downloadGb: null, ramGb: 32, tier: 'better', note: 'The "better" tier: about 99% hosted in the spike; not measured locally.' },
];

/** Below this much RAM there's no local recommendation: nothing that small was measured locally (SPEC R18). */
export const MIN_LOCAL_RAM_GB = 8;

/** The model to recommend for `ramGb` of RAM, or null under MIN_LOCAL_RAM_GB. */
export function recommendFor(ramGb: number): RecommendedModel | null {
  if (ramGb >= 16) return RECOMMENDED_MODELS[0]!;
  if (ramGb >= MIN_LOCAL_RAM_GB) return RECOMMENDED_MODELS[1]!;
  return null;
}
