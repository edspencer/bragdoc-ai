// What the fake model server answers (SPEC R28): a rule table, first match wins, keyed on the request's schema (its
// name, or the properties it asks for) and its content. Deterministic: the same request always gets the same answer.
// Feature PRs add their rows here (the judge's, tidy's, draft's), above the catch-alls at the bottom.
//
// A request the table doesn't cover still gets a valid answer: for a structured request, one made from its JSON
// schema (synthesize below); for plain text, FALLBACK_TEXT.

/** A model request, as the fake sees it, whichever API it came through. */
export interface FakeRequest {
  api: 'ollama' | 'openai' | 'anthropic';
  model: string;
  system: string;
  messages: { role: string; content: string }[];
  /** The last user message. */
  prompt: string;
  /** The JSON schema asked for, if any (json_schema, Ollama's format, Anthropic's output format or json tool). */
  schema: Record<string, unknown> | null;
  schemaName: string | null;
  /** The schema came with the request (not only described in the instructions, as JSON mode does). */
  schemaSent: boolean;
  /** Asked for JSON (a schema, or JSON mode). */
  json: boolean;
  stream: boolean;
}

export interface AnswerRule {
  /** Shown in the fake's request log, so a test can say which row answered. */
  name: string;
  when: (r: FakeRequest) => boolean;
  /** An object (sent as JSON) or text. */
  answer: (r: FakeRequest) => unknown;
}

const props = (r: FakeRequest): string[] => Object.keys(((r.schema?.properties as Record<string, unknown>) ?? {}));
const asks = (r: FakeRequest, ...keys: string[]) => keys.every((k) => props(r).includes(k));

export const FALLBACK_TEXT = 'This is a test answer from the fake model server. Nothing here came from a real model.';

export const ANSWERS: AnswerRule[] = [
  // Settings → AI's Test connection (ctx.ai.test)
  { name: 'connection-test', when: (r) => r.schemaName === 'connection_test' || (r.json && /\{"ok": true\}/.test(r.prompt)), answer: () => ({ ok: true }) },
  // `bragdoc dev ai` and box QA: says what it was asked, so a reader can see the prompt arrived whole
  { name: 'echo', when: (r) => !r.json && /^echo:/i.test(r.prompt), answer: (r) => `You said: ${r.prompt.slice(5).trim()}` },
  // the end of a long prompt (QA's context-size check): names the last line
  { name: 'last-line', when: (r) => /what is the last line/i.test(r.prompt), answer: (r) => (r.json ? { lastLine: lastLine(r.prompt) } : `The last line is: ${lastLine(r.prompt)}`) },
  { name: 'ok-schema', when: (r) => r.json && asks(r, 'ok') && props(r).length === 1, answer: () => ({ ok: true }) },
  // `npm run eval:smoke` (PR22): the date and the percentage in the sentence between the markers, always right
  {
    name: 'eval-smoke',
    when: (r) => r.json && (r.schemaName === 'eval_smoke' || (asks(r, 'date', 'percent') && /<<<\n/.test(r.prompt))),
    answer: (r) => {
      const s = /<<<\n([\s\S]*?)\n>>>/.exec(r.prompt)?.[1] ?? '';
      const pct = /(\d+(?:\.\d+)?)%/.exec(s);
      return { date: /\d{4}-\d{2}-\d{2}/.exec(s)?.[0] ?? null, percent: pct ? Number(pct[1]) : null };
    },
  },
  // "Tidy this up" (PR26): a tidy made from the material's own words, so a grounded answer is the default. Planted
  // traps for the checks: "cut costs" with no number gets an invented 40%, "INVENT-DATE" an invented date, "MADE-UP
  // PROJECT" a project that isn't theirs, and a calendar invite is notAnAchievement.
  { name: 'tidy', when: (r) => r.json && (r.schemaName === 'achievement_tidy' || asks(r, 'title', 'summary', 'notAnAchievement')), answer: (r) => tidyAnswer(r.prompt) },
  // Folio's Draft with AI (PR27): a draft made from the prompt's own clippings, best first, citing each, plus the two
  // mistakes the check must catch: one bullet with no citation, and one planted number ("by 37%") no clipping has.
  // A note containing "(clean)" leaves both out.
  { name: 'draft', when: (r) => !r.json && /^You draft the achievements section/.test(r.system), answer: (r) => fakeDraft(r.prompt) },
  // ---- feature rows go above this line ----
  { name: 'schema', when: (r) => r.json && !!r.schema, answer: (r) => synthesize(r.schema!, r.schema!) },
  { name: 'json', when: (r) => r.json, answer: () => ({ answer: FALLBACK_TEXT }) },
  { name: 'text', when: () => true, answer: () => FALLBACK_TEXT },
];

/** The fake's draft: the clippings in the prompt grouped by project, each a bullet citing it. */
function fakeDraft(prompt: string): string {
  const block = /<<<CLIPPINGS\n([\s\S]*?)\nCLIPPINGS>>>/.exec(prompt)?.[1] ?? '';
  const clips = block
    .split(/\n\n(?=\[\d+\] )/)
    .map((c) => {
      const m = /^\[(\d+)\] (.*)$/m.exec(c);
      const project = /^Project: ([^(\n]*?)(?: \(|$)/m.exec(c)?.[1]?.trim() ?? 'Other work';
      return m ? { n: Number(m[1]), title: m[2]!.trim(), project } : null;
    })
    .filter((c): c is { n: number; title: string; project: string } => !!c);
  if (!clips.length) return 'There was nothing to draft from.';
  const clean = /\(clean\)/.test(prompt);
  const groups = new Map<string, typeof clips>();
  for (const c of clips) groups.set(c.project, [...(groups.get(c.project) ?? []), c]);
  const out = [`This period was mostly about ${[...groups.keys()].slice(0, 2).join(' and ')}. This draft came from the fake model server, not a real model.`];
  let planted = clean;
  for (const [project, cs] of groups) {
    out.push('', `## ${project}`, '');
    for (const c of cs) {
      const lower = c.title.charAt(0).toLowerCase() + c.title.slice(1);
      if (!planted) {
        out.push(`- I ${lower}, cutting review time by 37% [${c.n}]`);
        planted = true;
      } else out.push(`- I ${lower} [${c.n}]`);
    }
  }
  if (!clean) out.push('', '## Also', '', '- I helped wherever I was needed');
  return `${out.join('\n')}\n`;
}

function lastLine(prompt: string): string {
  const lines = prompt.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.filter((l) => !/what is the last line/i.test(l)).at(-1) ?? '';
}

/** The fake's tidy (PR26), from the prompt alone: deterministic, and only the material's own words unless planted. */
export function tidyAnswer(prompt: string): Record<string, unknown> {
  const material = /<<<MATERIAL\n([\s\S]*?)\nMATERIAL>>>/.exec(prompt)?.[1] ?? '';
  const today = /Today is (?:\w+ )?(\d{4}-\d{2}-\d{2})/.exec(prompt)?.[1] ?? '2026-01-01';
  const projects = [.../Their projects: (.*)\.\n/.exec(prompt)?.[1]?.matchAll(/"([^"]+)"/g) ?? []].map((m) => m[1]!);
  // each part (and line) a sentence of its own, so an achievement's title and summary don't run together
  const text = material
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^\[.*\]$/.test(l))
    .map((l) => (/[.!?]$/.test(l) ? l : `${l}.`))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const empty = { title: '', summary: '', body: null, happenedAt: null, endedAt: null, impact: null, impactWhy: null, projects: [], unclear: null };
  if (/\b(invitation|you(?:'ve| have) been invited|calendar|join (?:zoom|the) meeting)\b/i.test(text))
    return { ...empty, notAnAchievement: 'It reads like a calendar invite: something planned, not something you did.' };
  const sentences = text
    .replace(/^(?:(?:hey|hi|hello|so|ok|okay|um+|just wanted to say)[,!.]?\s+)+/i, '')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  const first = (sentences[0] ?? text).replace(/[.!?]+$/, '');
  const cap = first.charAt(0).toUpperCase() + first.slice(1);
  const title = cap.length > 80 ? cap.slice(0, 80).replace(/\s+\S*$/, '') : cap;
  let summary = sentences.slice(0, 2).join(' ').slice(0, 260);
  if (/\bcut costs\b/i.test(text) && !/\d/.test(text)) summary = `${summary.replace(/[.!?]?$/, '')}, cutting costs by 40%.`;
  let happenedAt: string | null = /\d{4}-\d{2}-\d{2}/.exec(text)?.[0] ?? null;
  if (!happenedAt && /\byesterday\b/i.test(text)) happenedAt = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  if (/INVENT-DATE/.test(text)) happenedAt = '2019-03-14';
  const named = projects.filter((p) => text.toLowerCase().includes(p.toLowerCase()));
  if (/MADE-UP PROJECT/.test(text)) named.push('Project Nightjar');
  const praise = /\b(thank|thanks|great job|kudos|shout-?out|amazing)\b/i.test(text);
  return {
    ...empty,
    title,
    summary,
    happenedAt,
    impact: praise ? 3 : 4,
    impactWhy: praise ? 'Someone took the time to thank me for it.' : 'The team relied on it, from what I wrote.',
    projects: named,
    notAnAchievement: null,
    unclear: /\bwe\b/i.test(text) ? 'Who "we" is.' : null,
  };
}

/** The answer for a request: from `extra` first (a replayed recording's rows; test/ai-replay.ts), then the table. */
export function answerFor(r: FakeRequest, extra: AnswerRule[] = []): { rule: string; value: unknown } {
  const rule = extra.find((a) => a.when(r)) ?? ANSWERS.find((a) => a.when(r))!;
  return { rule: rule.name, value: rule.answer(r) };
}

/** A small valid value for a JSON schema: the first enum, booleans true, numbers at their minimum (or 0.5 in 0–1). */
export function synthesize(s: Record<string, unknown>, root: Record<string, unknown>): unknown {
  if (typeof s.$ref === 'string') {
    const name = s.$ref.replace(/^#\/(?:\$defs|definitions)\//, '');
    const defs = (root.$defs ?? root.definitions ?? {}) as Record<string, Record<string, unknown>>;
    return defs[name] ? synthesize(defs[name]!, root) : null;
  }
  if ('const' in s) return s.const;
  if (Array.isArray(s.enum)) return s.enum[0];
  for (const k of ['anyOf', 'oneOf', 'allOf'] as const) {
    const opts = s[k] as Record<string, unknown>[] | undefined;
    if (opts?.length) return synthesize(opts.find((o) => o.type !== 'null') ?? opts[0]!, root);
  }
  const type = Array.isArray(s.type) ? (s.type as string[]).find((t) => t !== 'null') : (s.type as string | undefined);
  switch (type) {
    case 'object': {
      const p = (s.properties ?? {}) as Record<string, Record<string, unknown>>;
      return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, synthesize(v, root)]));
    }
    case 'array': {
      const n = typeof s.minItems === 'number' ? s.minItems : 0;
      return Array.from({ length: n }, () => synthesize((s.items ?? {}) as Record<string, unknown>, root));
    }
    case 'string': {
      const min = typeof s.minLength === 'number' ? s.minLength : 0;
      return 'fake answer'.padEnd(min, '.');
    }
    case 'integer':
    case 'number': {
      const lo = typeof s.minimum === 'number' ? s.minimum : typeof s.exclusiveMinimum === 'number' ? s.exclusiveMinimum + 1 : 0;
      const hi = typeof s.maximum === 'number' ? s.maximum : undefined;
      if (type === 'number' && lo === 0 && hi === 1) return 0.5;
      return lo;
    }
    case 'boolean':
      return true;
    case 'null':
      return null;
    default:
      return null;
  }
}
