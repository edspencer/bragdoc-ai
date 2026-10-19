// Grounding checks for AI output: SPEC principle 7, "No invention". Any number, amount, date or capitalised name in an
// AI suggestion that isn't in the source text is flagged in the UI, and a judge `quote` that isn't verbatim in the
// input is dropped. The point is to catch invented facts, so it leans toward flagging: a false flag costs a glance, a
// missed invention costs the user's credibility. Pure and dependency-free: shared/ runs in the browser too.

const FOLD: [RegExp, string][] = [
  [/[‘’‚‛]/g, "'"],
  [/[“”„‟]/g, '"'],
  [/[–—‒―]/g, '-'],
  [/…/g, '...'],
];

// NFKC plus the typographic variants OCR and word processors introduce. Case and line breaks are kept: names need
// case, and runs of capitalised words shouldn't span lines.
function clean(s: string, joinHyphens = true): string {
  let out = s.normalize('NFKC');
  for (const [re, to] of FOLD) out = out.replace(re, to);
  // OCR splits words across lines as "impro-\nvement". Joining is usually right; isVerbatim also tries keeping the
  // hyphen, for real compounds like "well-\nknown".
  return out.replace(/(\p{L})-[ \t]*\r?\n\s*(?=\p{L})/gu, joinHyphens ? '$1' : '$1-');
}

/** Normalise text for loose matching: NFKC, folded quotes and dashes, OCR hyphenation joined, whitespace collapsed, lower case. */
export function normaliseForMatch(s: string, joinHyphens = true): string {
  return clean(s, joinHyphens).replace(/\s+/g, ' ').trim().toLowerCase();
}

/** True when `quote` appears in `input`, tolerating whitespace, case, typography and OCR line breaks. */
export function isVerbatim(quote: string, input: string): boolean {
  // Models wrap quotes in quotation marks and end them with a full stop the input may not have.
  const q = normaliseForMatch(quote).replace(/^["'\s]+/, '').replace(/["'\s.,;:!?]+$/, '');
  if (!q) return false;
  return normaliseForMatch(input).includes(q) || normaliseForMatch(input, false).includes(q);
}

interface Fact {
  index: number;
  end: number;
  text: string;
  /** Normalised value(s) that count as the same fact in a source; the first is the fact's own. */
  keys: string[];
  /** A sentence-initial capitalised word that may just be the start of the sentence, not part of the name. */
  loose?: string;
}

// Numbers: an optional currency, digits (with thousands separators), an optional magnitude, then % or a multiplier.
// Money compares by value alone (a symbol isn't a fact worth flagging), but 40% and 3x never match a bare 40 or 3.
const NUMBER =
  /(?<![\p{L}\p{N}.,])(?:(?:[$€£¥]|(?:USD|EUR|GBP)\s?))?(\d{1,3}(?:[, ]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?:([kKmMbB]|bn)|\s?(thousand|million|billion))?(?:\s?(%|percent|per cent)|\s?(×)|(x))?(?![\p{L}\p{N}])/gu;
const MAGNITUDE: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9 };

function numbers(text: string): Fact[] {
  return [...text.matchAll(NUMBER)].map((m) => {
    const value = parseFloat(m[1]!.replace(/[, ]/g, '')) * (MAGNITUDE[(m[2] ?? m[3] ?? '').toLowerCase()] ?? 1);
    const unit = m[4] ? '%' : m[5] || m[6] ? 'x' : '';
    return { index: m.index, end: m.index + m[0].length, text: m[0], keys: [`n:${Number(value.toPrecision(12))}${unit}`] };
  });
}

// Dates: month names count only with a day or year beside them ("March" alone is too often just a word).
const MONTH = '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:tember|t)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?';
const DAY = '(\\d{1,2})(?:st|nd|rd|th)?';
const YEAR = '(\\d{4})';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: string | number) => String(n).padStart(2, '0');
const month = (name: string) => pad(MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1);

// Each pattern returns [year, month, day]; any may be empty. Longer forms first: overlaps keep the earlier pattern.
const DATES: [RegExp, (m: RegExpMatchArray) => [string, string, string] | string][] = [
  [/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g, (m) => [m[1]!, m[2]!, m[3]!]],
  [new RegExp(`\\b${MONTH} ${DAY}(?:,? ${YEAR})?(?!\\d)`, 'g'), (m) => [m[3] ?? '', month(m[1]!), pad(m[2]!)]],
  [new RegExp(`(?<!\\d)${DAY} ${MONTH}(?:,? ${YEAR})?(?!\\d)`, 'g'), (m) => [m[3] ?? '', month(m[2]!), pad(m[1]!)]],
  [new RegExp(`\\b${MONTH},? ${YEAR}(?!\\d)`, 'g'), (m) => [m[2]!, month(m[1]!), '']],
  [/\bQ([1-4]),? (\d{4})(?!\d)/g, (m) => `d:${m[2]}-Q${m[1]}`],
];

function dates(text: string): Fact[] {
  const found: Fact[] = [];
  for (const [re, parse] of DATES) {
    for (const m of text.matchAll(re)) {
      const end = m.index! + m[0].length;
      if (found.some((f) => m.index! < f.end && end > f.index)) continue;
      const p = parse(m);
      let keys: string[];
      if (typeof p === 'string') keys = [p];
      else {
        const [y, mo, d] = p;
        // A source's full date also grounds the partial forms an output might use ("Oct 17", "October 2026").
        keys = [`d:${y || '-'}-${mo}-${d || '-'}`];
        if (y && d) keys.push(`d:--${mo}-${d}`, `d:${y}-${mo}--`);
      }
      found.push({ index: m.index!, end, text: m[0], keys });
    }
  }
  return found;
}

// Names: a run of two or more capitalised words (acronyms included) on one line, separated only by spaces. A lone
// capitalised word is too noisy (every sentence starts with one), and "I" never joins a run.
function names(text: string): Fact[] {
  const found: Fact[] = [];
  let run: RegExpMatchArray[] = [];
  const flush = () => {
    if (run.length >= 2) {
      const first = run[0]!, last = run[run.length - 1]!;
      const index = first.index!, end = last.index! + last[0].replace(/'s$/, '').length;
      const sentenceStart = /(^|[.!?:;]\s+|\n\s*)$/.test(text.slice(0, index));
      const fact: Fact = { index, end, text: text.slice(index, end), keys: [] };
      if (sentenceStart && run.length >= 3) fact.loose = text.slice(run[1]!.index!, end);
      found.push(fact);
    }
    run = [];
  };
  for (const m of text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu)) {
    const prev = run[run.length - 1];
    if (prev && !/^ +$/.test(text.slice(prev.index! + prev[0].length, m.index))) flush();
    if (/^\p{Lu}[\p{L}'-]*$/u.test(m[0]) && m[0] !== 'I') run.push(m);
    else flush();
  }
  flush();
  return found;
}

// Anything else with a digit in it ("v2", "Q3", "1st") is matched verbatim.
const tokens = (text: string): Fact[] =>
  [...text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}._-]*/gu)]
    .filter((m) => /\d/.test(m[0]))
    .map((m) => {
      const t = m[0].replace(/[._-]+$/, '');
      return { index: m.index, end: m.index + t.length, text: t, keys: [] };
    });

/** `needle` occurs in `hay` with no letter or digit either side, so "40" isn't found in "400". */
function containsWord(hay: string, needle: string): boolean {
  if (!needle) return false;
  for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + 1)) {
    const before = hay[i - 1] ?? ' ', after = hay[i + needle.length] ?? ' ';
    if (!/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after)) return true;
  }
  return false;
}

/** Sources made ready once, for checking many outputs against them (a draft's lines): normalised text and fact keys. */
export interface GroundingIndex {
  haystacks: string[];
  keys: Set<string>;
}

export function groundingIndex(sources: string | string[]): GroundingIndex {
  const texts = (Array.isArray(sources) ? sources : [sources]).map((s) => clean(s));
  return { haystacks: texts.map((s) => normaliseForMatch(s)), keys: new Set(texts.flatMap((s) => [...dates(s), ...numbers(s)].flatMap((f) => f.keys))) };
}

/** Several indexes as one (a line's cited clippings plus the shared context), without re-reading any source. */
export function joinIndexes(...ix: GroundingIndex[]): GroundingIndex {
  return { haystacks: ix.flatMap((i) => i.haystacks), keys: new Set(ix.flatMap((i) => [...i.keys])) };
}

/** The distinct facts (numbers, amounts, dates, capitalised names) in `output` found in none of `sources`, in order. */
export function ungrounded(output: string, sources: string | string[] | GroundingIndex): string[] {
  const { haystacks, keys } = typeof sources === 'object' && !Array.isArray(sources) ? sources : groundingIndex(sources);
  const appears = (fact: string) => haystacks.some((h) => containsWord(h, normaliseForMatch(fact)));

  const text = clean(output);
  const facts: Fact[] = [];
  // Dates claim their digits first, then numbers, then any leftover digit tokens; names come last.
  for (const f of [...dates(text), ...numbers(text), ...tokens(text)]) {
    if (!facts.some((g) => f.index < g.end && f.end > g.index)) facts.push(f);
  }
  // Names run on a copy with dates masked, so "Shipped Oct 17" isn't the name "Shipped Oct".
  let masked = text;
  for (const f of facts) masked = masked.slice(0, f.index) + '#'.repeat(f.end - f.index) + masked.slice(f.end);
  facts.push(...names(masked));
  facts.sort((a, b) => a.index - b.index);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of facts) {
    const key = normaliseForMatch(f.text);
    if (seen.has(key)) continue;
    seen.add(key);
    const grounded = appears(f.text) || (f.keys[0] !== undefined && keys.has(f.keys[0])) || (f.loose !== undefined && appears(f.loose));
    if (!grounded) out.push(f.text.trim());
  }
  return out;
}
