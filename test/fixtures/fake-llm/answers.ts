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
  // the Found judge (PR24): a merged PR (notable or routine), and a screenshot's message (a win, probably not, or the
  // sarcastic trap a small model falls for: praise words, aimed at you, meant the other way)
  { name: 'judge-pr', when: (r) => r.json && (r.schemaName === 'found_judge_pr' || asks(r, 'keep', 'impact') || /Is this pull request notable/.test(r.prompt)), answer: (r) => judgePr(r.prompt) },
  { name: 'judge', when: (r) => r.json && (r.schemaName === 'found_judge' || asks(r, 'keep', 'quote', 'why') || /Is the message to judge a win/.test(r.prompt)), answer: (r) => judgeMessage(r.prompt) },
  // ---- feature rows go above this line ----
  { name: 'schema', when: (r) => r.json && !!r.schema, answer: (r) => synthesize(r.schema!, r.schema!) },
  { name: 'json', when: (r) => r.json, answer: () => ({ answer: FALLBACK_TEXT }) },
  { name: 'text', when: () => true, answer: () => FALLBACK_TEXT },
];

/** The judge's fake opinion of the message to judge in the material (server/ai/judge/input.ts's layout). */
function judgeMessage(prompt: string) {
  const line = /The (?:message|part) to judge[^\n]*:\n {2}([^\n]*)/.exec(prompt)?.[1] ?? '';
  const m = /^(.+?)(?: \((the user|not the user|a bot)\))?: (.*)$/.exec(line);
  const author = m && !m[1]!.startsWith('(') ? m[1]! : '';
  const mark = m?.[2] ?? '';
  const text = (m ? m[3]! : line).trim();
  if (/really loving|love that for us|very efficient|10\/10|great timing|🙃|once anyone can|most creative interpretation/i.test(text))
    return { keep: false, confidence: 0.8, quote: '', from: author, why: 'Reads as sarcasm, not praise.', projects: [] };
  if (mark === 'the user') return { keep: false, confidence: 0.75, quote: '', from: author, why: "The user's own message, not praise for them.", projects: [] };
  if (/\b(?:thank|thanks|great|kudos|amazing|awesome|saved|well done|nice work|impressive|shout ?out|congrat\w*|legend|brilliant)\b/i.test(text)) {
    const quote = (/^.*?[.!?](?=\s|$)/.exec(text)?.[0] ?? text).trim();
    return { keep: true, confidence: 0.86, quote, from: author, why: 'Specific praise for something the user did.', projects: [] };
  }
  return { keep: false, confidence: 0.7, quote: '', from: author, why: "Routine chatter, not about the user's work.", projects: [] };
}

/** The judge's fake opinion of a merged PR: routine when its title says so. */
function judgePr(prompt: string) {
  const title = /^Title: (.*)$/m.exec(prompt)?.[1] ?? '';
  if (/\b(?:bump|bumps|chore|typo|revert|deps?|dependabot|version|lint|format)\b/i.test(title)) return { keep: false, confidence: 0.8, why: 'Routine maintenance.', impact: 1, projects: [] };
  return { keep: true, confidence: 0.75, why: 'A notable change worth a brag.', impact: 5, projects: [] };
}

function lastLine(prompt: string): string {
  const lines = prompt.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.filter((l) => !/what is the last line/i.test(l)).at(-1) ?? '';
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
