// The docs site's AI tables, generated from the code that the app itself runs on (PR29, D83), so the pages can't say
// something the app doesn't: the recommended models and the RAM bands (shared/ai/models.ts, which Settings → AI
// recommends from), what the judge measured (scripts/eval/measured.ts, which the replay test asserts), and each cloud
// provider's consent statement (shared/ai/consent.ts, which the consent dialog shows). `npm run sync:reference`
// rewrites every block between its markers; test/docs.test.ts fails while one is stale.
//
// Markers, in a .md page `<!-- ai-reference:<block>:start -->` … `<!-- ai-reference:<block>:end -->`, and in an .mdx
// page (which has no HTML comments) `{/* ai-reference:<block>:start */}` … `{/* ai-reference:<block>:end */}`.
// Blocks: `models`, `measured`, and `consent-<anthropic | openai | openrouter | jev | custom>`.
import { CONSENT, CONSENT_FEATURE_WORDS, CONSENT_NEVER_SENT, consentWhereTail, type ConsentStatement } from '../shared/ai/consent.ts';
import { KIND_BASE_URL } from '../shared/ai/connections.ts';
import { MIN_LOCAL_RAM_GB, MODELS_AS_OF, RECOMMENDED_MODELS, recommendFor } from '../shared/ai/models.ts';
import type { AiCallFeature } from '../shared/api.ts';
import { JUDGE_MEASURED, SARCASM_PASSED, SARCASM_TOTAL } from './eval/measured.ts';

const TIER: Record<string, string> = { default: 'The default', small: 'The 8 GB pick', better: '“Better” tier' };

/** The recommended local models, and which one Settings → AI suggests for how much RAM. */
export function modelsBlock(): string {
  const rows = RECOMMENDED_MODELS.map((m) => `| \`${m.name}\` | ${TIER[m.tier]} | ${m.downloadGb === null ? 'larger (it varies)' : `about ${m.downloadGb} GB`} | ${m.ramGb} GB | ${m.note} |`);
  const big = recommendFor(16)!.name;
  const small = recommendFor(MIN_LOCAL_RAM_GB)!.name;
  return [
    '| Model | Tier | Download | RAM it wants | Notes |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    `What Settings → AI suggests from this computer's RAM: **16 GB or more**, \`${big}\`; **${MIN_LOCAL_RAM_GB}–16 GB**, \`${small}\`; **under ${MIN_LOCAL_RAM_GB} GB, nothing**. No model that small was measured on a local runner, and the measurements below show a hosted model's score doesn't carry over to the same weights run locally, so BragDoc doesn't guess: it says a local model will struggle there, and suggests a cloud provider or leaving AI off.`,
    '',
    `The table is as of ${MODELS_AS_OF}. Only \`${big}\` and \`${small}\` have a known download size, so they're the only two BragDoc offers to ask Ollama to download (after a confirm). Any other model is \`ollama pull <name>\` in a terminal.`,
  ].join('\n');
}

const pct = (n: number) => `${n}%`;

/** What the judge measured, one row per model. */
export function measuredBlock(): string {
  const rows = JUDGE_MEASURED.map((m) =>
    [
      `\`${m.model}\``,
      m.where === 'this-computer' ? 'local runner' : 'cloud',
      m.ranOn,
      m.input,
      pct(m.precision),
      pct(m.recall),
      `${m.sarcasmKept} of ${SARCASM_TOTAL}`,
      `${m.prsRight} of 20`,
      m.p50s === null ? '—' : `${m.p50s} s`,
      m.recording ? 'yes' : 'no: one live run',
    ].join(' | '),
  );
  return [
    '| Model | Where | Ran on | Screenshots read as | Precision | Recall | Sarcasm kept | Merged PRs right | Median per message | Replayed in CI |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r} |`),
    '',
    `Precision and recall are the judge's own, on the messages the screenshot rules let through, which is all it's ever asked about. "Sarcasm kept" counts sarcastic messages it called a win, of the set's ${SARCASM_TOTAL} (the rules let ${SARCASM_PASSED} of them through on perfect text). A median of "—" means the runner was shared with another job at the time, so its timing says nothing.`,
  ].join('\n');
}

/** Which kind's statement, and where it goes. */
const CONSENT_HOST: Record<keyof typeof CONSENT, string | null> = {
  anthropic: new URL(KIND_BASE_URL.anthropic!).hostname,
  openai: new URL(KIND_BASE_URL.openai!).hostname,
  openrouter: new URL(KIND_BASE_URL.openrouter!).hostname,
  jev: new URL(KIND_BASE_URL.openrouter!).hostname, // through its OpenRouter connection
  custom: null,
};

/** A consent statement as the dialog shows it, word for word, in markdown. */
export function consentBlock(kind: keyof typeof CONSENT): string {
  const st: ConsentStatement = CONSENT[kind];
  const host = CONSENT_HOST[kind];
  const where = `Straight from this computer to ${host ? `\`${host}\`` : 'the host you typed in'}${consentWhereTail(st)}`;
  const sends = (Object.keys(st.sends) as AiCallFeature[]).flatMap((f) => {
    const w = CONSENT_FEATURE_WORDS[f];
    return [`- **${w?.title ?? f}**, ${w?.when ?? ''}:`, ...st.sends[f]!.map((x) => `  - ${x}`)];
  });
  const terms = st.policyUrl
    ? `${st.provider} receives it under your account and their policy: [${st.provider}’s privacy policy](${st.policyUrl}).`
    : 'Unknown provider: check their terms before you allow it.';
  return [
    `**Where it goes.** ${where}`,
    '',
    '**What each feature would send there:**',
    '',
    ...sends,
    '',
    CONSENT_NEVER_SENT,
    '',
    `**Whose terms.** ${terms}`,
    '',
    '**And:**',
    '',
    ...st.notes.map((n) => `- ${n}`),
    '',
    `_This is version ${st.version} of the statement. If a later BragDoc would send more, it asks again._`,
  ].join('\n');
}

const BLOCKS: Record<string, () => string> = {
  models: modelsBlock,
  measured: measuredBlock,
  ...Object.fromEntries((Object.keys(CONSENT) as (keyof typeof CONSENT)[]).map((k) => [`consent-${k}`, () => consentBlock(k)])),
};

const MARKER = /(<!-- ai-reference:([a-z-]+):start -->|\{\/\* ai-reference:([a-z-]+):start \*\/\})\n[\s\S]*?\n(<!-- ai-reference:\2:end -->|\{\/\* ai-reference:\3:end \*\/\})/g;

/** `md` with every ai-reference block regenerated. Throws on a block it doesn't know. */
export function withAiReference(md: string): string {
  return md.replace(MARKER, (_all, start: string, a: string | undefined, b: string | undefined, end: string) => {
    const name = (a ?? b)!;
    const make = BLOCKS[name];
    if (!make) throw new Error(`no ai-reference block called ${name} (${Object.keys(BLOCKS).join(', ')})`);
    return `${start}\n${make()}\n${end}`;
  });
}

/** The blocks a page holds, by name. */
export const aiReferenceBlocks = (md: string): string[] => [...md.matchAll(MARKER)].map((m) => (m[2] ?? m[3])!);
