// The screenshot rules (SPEC R7, R8): "is this screenshot praise for me?", decided from its OCR text by plain rules
// you can read. Never a model (D8): this is what makes Found useful with AI off. Adapted from the Found spike's
// prefilter, which was proven on a 218-message labelled set (mentions, name/surname/handle with an alias-exclusion list,
// case-sensitive initials with a time guard, the trivial-ack drop), and reworked for OCR text, which has no structure:
// no author ids, no mentions, no channel types, just lines of text with the odd misread letter.
//
// A screenshot passes when one message in it (a) names you, or (b) has your initials, **and** (c) praises, or states an
// impact (a number with a unit, money, customers, a promotion: the spike's impact signal; on its 218 messages, a third
// of the wins that name you do it with numbers, not praise words). (d), chat-UI cues, only lifts borderline cases: a
// lone "thanks" or "great", or an impact number, counts in a chat window, not on a dashboard (which is all numbers).
// The rules can't read tone: sarcasm that names you and uses praise words passes, by design. That is the future judge's
// job (shared/judge.ts), and Found is where you dismiss it.
//
// shared/ runs in the browser too: no Node APIs here.

export type RuleId = 'name' | 'initials' | 'reply' | 'praise' | 'impact' | 'chat';

export interface RuleMatch {
  rule: RuleId;
  /** The words that matched, as the OCR read them. */
  text: string;
}

export interface RulesResult {
  pass: boolean;
  /** For a pass, the passing message's matches; otherwise the closest miss's, so you can see what was missing. */
  matched: RuleMatch[];
  /** The message that passed, on one line: the words to highlight, or to keep as a quote. */
  quote?: string;
  /** Who wrote it, when the screenshot shows a chat message's author line. */
  from?: string;
  /** Where: the first `#channel` on screen. */
  where?: string;
  /** Why things were set aside: a `notMe` name, your own message, a time that looked like your initials, a bare ack. */
  notes: string[];
}

/** What the rules need from profile.yaml (shared/schema/profile.ts). */
export interface RulesProfile {
  name: string;
  aliases?: readonly string[];
  notMe?: readonly string[];
  githubLogin?: string;
}

/** The longest text the rules read. OCR of a full-page screenshot is a few thousand characters; this bounds the work. */
export const MAX_TEXT = 20_000;
/** Without chat author lines to split messages, a name and a praise word must be within this many lines. */
const NEARBY_LINES = 3;

// ---- normalisation -------------------------------------------------------------------------------------------------

/**
 * OCR text, made regular: NFKC (ligatures, full-width forms), straight quotes, no zero-width characters, one space
 * between words, no trailing spaces, at most one blank line in a row. A `©` before a word is a misread `@`.
 */
export function normaliseOcr(text: string): string {
  return text
    .slice(0, MAX_TEXT)
    .normalize('NFKC')
    .replace(/[​-‍⁠﻿]/g, '')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/©(?=\p{L})/gu, '@')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ +$/gm, '')
    .replace(/^ +/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---- patterns ------------------------------------------------------------------------------------------------------

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BEFORE = '(?<![\\p{L}\\p{N}_])';
const AFTER = '(?![\\p{L}\\p{N}_])';

/** Letters OCR confuses, as a class each: `AIex` is `Alex`, `kud0s` is `kudos`, `rn` is `m`. Case-insensitive. */
const CONFUSABLE: Record<string, string> = {
  l: '[l1|I]',
  i: '[il1|!]',
  o: '[o0]',
  s: '[s5]',
  m: '(?:m|rn)',
  w: '(?:w|vv)',
  '0': '[0o]',
  '1': '[1li|]',
};

/** A word or phrase as an OCR-tolerant pattern: confusable letters, any spacing (or none) between words, loose dots. */
function tolerant(phrase: string): string {
  let out = '';
  for (const c of phrase) {
    const lower = c.toLowerCase();
    if (c === ' ') out += '\\s*';
    else if (c === '.') out += '[.,]?\\s?';
    else if (c === '-') out += '[-\\s]?';
    else if (c === "'") out += "'?";
    else if (c === '*') out += '\\p{L}*'; // a stem: congrat* is congrats, congratulations
    else out += CONFUSABLE[lower] ?? escape(c);
  }
  return out;
}

const words = (list: readonly string[]) => new RegExp(`${BEFORE}(?:${list.map(tolerant).join('|')})${AFTER}`, 'giu');

/** Praise on its own: these say "well done" whatever the window. */
const STRONG_PRAISE = words([
  'kudos', 'shout out*', 'shoutout*', 'props', 'congrat*', 'well done', 'well deserved', 'bravo', 'hats off',
  'great job', 'great work', 'great stuff', 'great call', 'great catch', 'great idea', 'great talk', 'great write-up',
  'nice job', 'nice work', 'nice one', 'nice catch', 'good job', 'good work', 'good catch', 'good call',
  'amazing', 'amazed', 'awesome', 'incredibl*', 'outstanding', 'excellent', 'fantastic', 'brilliant*', 'stellar',
  'phenomenal', 'superb', 'impressive', 'impressed', 'legend*', 'hero', 'heroic', 'rock star', 'rockstar', 'mvp',
  'nailed it', 'crushed it', 'killed it', 'knocked it out', 'above and beyond', 'next level', 'first-class',
  "chef's kiss", 'saved us', 'saved the day', 'saved my', 'saved our', 'saved me', 'life saver', 'lifesaver',
  'game changer', 'game-changer', 'thank you', 'thanks so much', 'thanks a ton', 'thanks a lot', 'thanks again',
  'thanks to', 'many thanks', 'big thanks', 'huge thanks', 'grateful', 'appreciate*', 'proud', 'beautifully',
  "couldn't have done", "couldn't have shipped", 'made my day', 'made our day', 'made my week', 'called out',
  'so much better', 'exactly the kind of', 'the reason we', 'the only reason', 'credit to', 'credit goes to', 'a big reason', 'the model for',
]);
/** Praise only in a chat window (d): alone, these are too common to mean anything. */
const WEAK_PRAISE = words(['thanks', 'thank', 'thx', 'ty', 'tysm', 'cheers', 'great', 'nice', 'good', 'love*', 'huge', 'solid', 'helpful', 'cool', 'wow', 'sweet', 'clutch']);
/** Emoji and Slack's shortcodes for them; weak, like the words above. OCR rarely reads an emoji, but Vision sometimes does. */
const PRAISE_EMOJI = /(?:🎉|🙌|🙏|❤️?|👏|🚀|🏆|💯|🔥|⭐|🌟|✨|💪|🥇|🤩|😍|🥳|:(?:tada|raised_hands|pray|clap|heart|rocket|trophy|100|fire|star2?|sparkles|muscle|first_place_medal|star-struck|heart_eyes|partying_face):)/gu;
/**
 * Impact (c): a number with a unit, money, customers, a promotion (the spike's impact words, plus a few). A short ack
 * with one of these isn't trivial either.
 */
const IMPACT = /(?<![\p{L}\p{N}])(?:\d+(?:[.,]\d+)?\s?%|[$€£]\s?\d[\d,.]*\s?[kmb]?|\d+(?:[.,]\d+)?\s?(?:k|ms|min|mins|minutes|hours|hrs|seconds|x)(?![\p{L}])|customers|revenue|renew(?:al|ed)?|saved|down from|up from|from \d[\d.,]*\s?\S* to \d|promo(?:tion)?|nominat\p{L}*|award\p{L}*|calibration|staff level|adopted by|root cause|deciding factor|zero downtime)/giu;
/** The shape of a bare acknowledgement ("thanks!", "ty 🙏", "thx AM"); isTrivialAck decides (the spike's rule). */
const TRIVIAL_ACK = /^\s*(?:thanks?(?: you)?|ty(?:sm)?|thx|cheers|ack|ok|👍|🙏)[\s!.,:;'"—–\-a-z@<>0-9\p{Extended_Pictographic}\u{fe0f}]*$/iu;

/** Chat-UI cues (d), by kind. A `#channel` or a thread is enough; otherwise two different kinds. */
const CHAT_CUES: [kind: string, re: RegExp, enough: boolean][] = [
  // a letter somewhere: `#412` is a pull request, not a channel
  ['channel', /(?:^|\s)#\s?(?=[a-z0-9_-]*[a-z])[a-z0-9][a-z0-9_-]{1,79}(?![\p{L}\p{N}_])/gmu, true],
  ['thread', /\b\d+\s+repl(?:y|ies)\b|\bLast reply\b|\bView thread\b|\bReply in thread\b|^Thread\b/gim, true],
  ['timestamp', /\b\d{1,2}[:.]\d{2}\s?[AaPp]\.?[Mm]\b|\b(?:Today|Yesterday) at\b/g, false],
  ['mention', /(?:^|\s)@(?:here|channel|everyone|[\p{L}][\p{L}.-]+)/gmu, false],
  ['composer', /\bMessage\s+[#@]|\bAlso send to\b|\bjoined #/gi, false],
];

/** A time: `9 AM`, `9:30 AM`, `10AM` (a digit right before), and `AM PT`, `AM/PM`, `AM or PM` (after). */
const TIMEZONES = 'PT|ET|CT|MT|[PECM][SD]T|UTC|GMT|BST|CET|CEST|EET|IST|JST|AEST|AEDT|NZST|NZDT|SGT|HKT';
const TIME_BEFORE = '(?<![0-9§$]\\s{0,2})';
const TIME_AFTER = `(?!\\s*(?:[-–/]|or|to|and)\\s*PM\\b)(?!\\s*\\(?(?:${TIMEZONES})\\b)`;

/**
 * A chat message's author line: a name (one to four capitalised words, or a bot's one lower-case word) and a time,
 * and nothing else: `Dana Whitfield 4:52 PM`, `Priya Raman APP 9:14 AM`, `Priya — Today at 9:14 AM`. OCR may put an
 * avatar's initials or a stray mark in front (`[J] Dana Whitfield 4:52 pm`), tried only if the line fails without.
 */
const NAME_WORD = "[@\\p{Lu}][\\p{L}\\p{M}.'-]*";
const HEADER = new RegExp(
  `^(?:\\S{1,4}\\s+)??[^\\p{L}\\p{N}@#]{0,4}((?:${NAME_WORD}(?:\\s+${NAME_WORD}){0,3})|([\\p{Ll}][\\p{L}\\p{N}._-]*bot))` +
    `\\s*(?:\\(you\\)\\s*)?(?:(APP|BOT)\\s+)?(?:[-–—·•|]\\s*)?(?:(?:[Tt]oday|[Yy]esterday)\\s+at\\s+)?\\d{1,2}[:.]\\d{2}(?:\\s*[AaPp]\\.?[Mm]\\.?)?\\s*$`,
  'u',
);

// ---- the rules -----------------------------------------------------------------------------------------------------

interface Hit {
  rule: RuleId;
  text: string;
  line: number;
}

interface Block {
  /** Who wrote it (its author line), if the screenshot shows one. */
  author?: string;
  own: boolean;
  /** A bot or an app (`deploybot`, `Jira APP`): never praise from a person (the spike drops bots). */
  bot?: boolean;
  /** Line indexes: the body, after the author line. */
  start: number;
  end: number;
}

/** Your name, surname, full name, handles and non-initial aliases: matched case-insensitively, OCR-tolerantly. */
function nameTerms(p: RulesProfile): string[] {
  const parts = p.name.trim().split(/\s+/).filter(Boolean);
  const terms = new Set<string>();
  const add = (t: string) => {
    const s = t.trim().replace(/^@/, '');
    if (s.length >= 2) terms.add(s);
  };
  add(parts.join(' '));
  if (parts.length > 1) {
    add(parts[0]!);
    add(parts[parts.length - 1]!);
  }
  if (p.githubLogin) add(p.githubLogin);
  for (const a of p.aliases ?? []) if (!isInitials(a)) add(a);
  // the longest first, so "Alex Marlowe" is reported as itself rather than as "Alex"
  return [...terms].sort((a, b) => b.length - a.length);
}

/** `AM`, `A.M.`: two to four capitals, matched case-sensitively and never as a time (b). */
const isInitials = (a: string) => /^(?:\p{Lu}\.?){2,4}$/u.test(a.trim());

/** Mostly capitals: a heading or someone shouting, where "AM" is a word, not initials. */
function shouting(line: string): boolean {
  const letters = line.replace(/[^\p{L}]/gu, '');
  const upper = line.replace(/[^\p{Lu}]/gu, '');
  return letters.length >= 8 && upper.length / letters.length > 0.6 && (line.match(/\b\p{Lu}{2,}\b/gu)?.length ?? 0) >= 3;
}

/** "Sam Okafor" → "SO": what an avatar without a photo shows. */
const initialsOfName = (n: string) =>
  n
    .replace(/^@/, '')
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 3)
    .toUpperCase();

const allMatches = (re: RegExp, s: string) => [...s.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))];

/** The rules for one person, compiled once: call the result with each screenshot's OCR text. */
export function compileRules(profile: RulesProfile): (text: string) => RulesResult {
  const terms = nameTerms(profile);
  // a name of three letters or fewer is matched as written (case and all): tolerantly, "Al" would be every "AI"
  // and "Li" every "11"
  const long = terms.filter((t) => t.replace(/\s/g, '').length > 3);
  const short = terms.filter((t) => t.replace(/\s/g, '').length <= 3);
  const longRe = long.length ? new RegExp(`${BEFORE}@?(?:${long.map(tolerant).join('|')})${AFTER}`, 'giu') : null;
  const shortRe = short.length ? new RegExp(`${BEFORE}@?(?:${short.map(escape).join('|')})${AFTER}`, 'gu') : null;
  const names = (s: string) => [...(longRe ? allMatches(longRe, s) : []), ...(shortRe ? allMatches(shortRe, s) : [])].sort((a, b) => a.index - b.index);
  const ownExact = (a: string) => names(a).some((m) => m.index === 0 && m[0].length === a.length);
  const full = profile.name.trim().replace(/\s+/g, ' ');
  const fullRe = full.length >= 2 ? new RegExp(`${BEFORE}${tolerant(full)}${AFTER}`, 'iu') : null;
  const initials = [...new Set((profile.aliases ?? []).filter(isInitials).map((a) => a.trim()))];
  const initialsRe = initials.length ? new RegExp(`${BEFORE}(?:${initials.map(escape).join('|')})${AFTER}`, 'gu') : null;
  const initialsTimedRe = initials.length ? new RegExp(`${TIME_BEFORE}${BEFORE}(?:${initials.map(escape).join('|')})${AFTER}${TIME_AFTER}`, 'gu') : null;
  const notMe = (profile.notMe ?? []).map((n) => n.trim()).filter((n) => n.length >= 2);
  const notMeRe = notMe.length ? new RegExp(`${BEFORE}@?(?:${notMe.sort((a, b) => b.length - a.length).map(tolerant).join('|')})(?![\\p{L}\\p{N}_])`, 'giu') : null;

  /** Is this author line's name you? Your full name anywhere in it, or exactly one of your other names. */
  const isMe = (author: string) => {
    const a = author.replace(/\s+(?:APP|BOT)$/, '').trim();
    if (notMeRe && new RegExp(`^(?:${notMeRe.source})$`, 'iu').test(a)) return false;
    return ownExact(a) || !!fullRe?.test(a);
  };

  return function rules(raw: string): RulesResult {
    const notes: string[] = [];
    const text = normaliseOcr(raw);
    let lines = text.split('\n');

    // notMe names are blanked out first ("Alex P" isn't Alex), keeping every other offset where it was
    if (notMeRe)
      lines = lines.map((l) =>
        l.replace(notMeRe, (m) => {
          notes.push(`not you: "${m}"`);
          return ' '.repeat(m.length);
        }),
      );

    // the chat cues are about the window, not one message
    const cues: Hit[] = [];
    let chat = false;
    for (const [, re, enough] of CHAT_CUES) {
      const m = allMatches(re, lines.join('\n'))[0];
      if (!m) continue;
      cues.push({ rule: 'chat', text: m[0].trim(), line: -1 });
      if (enough) chat = true;
    }
    if (cues.length >= 2) chat = true;
    const where = allMatches(CHAT_CUES[0]![1], lines.join('\n'))[0]?.[0].trim().replace(/^#\s+/, '#');
    const thread = !!allMatches(CHAT_CUES[1]![1], lines.join('\n')).length;

    // messages: split at author lines when there are any; otherwise the whole text is one, with a nearness rule
    const headers = lines.map((l) => HEADER.exec(l));
    const blocks: Block[] = [];
    const chatLayout = headers.some((h) => h);
    if (chatLayout) {
      let cur: Block = { own: false, start: 0, end: -1 };
      lines.forEach((_, i) => {
        // "AM Alex Marlowe": the avatar's initials, read onto the author line
        const h = headers[i];
        const author = h?.[1]!.replace(/^(\p{Lu}{1,3})\s+(.+)$/u, (all, ini: string, rest: string) => (initialsOfName(rest) === ini ? rest : all));
        if (author) {
          if (cur.author || cur.end >= cur.start) blocks.push(cur);
          cur = { author, own: isMe(author), bot: !!(h![2] || h![3]) || /\s(?:APP|BOT)$/.test(author), start: i + 1, end: i };
        } else cur.end = i;
      });
      blocks.push(cur);
    } else blocks.push({ own: false, start: 0, end: lines.length - 1 });

    // an avatar's initials, read as text at the start of its message ("SO thx AM"), and the bits of drawn emoji OCR
    // reads as brackets and bars ("GA [|"): neither is something anyone wrote
    for (const b of blocks) {
      const avatar = b.author ? initialsOfName(b.author) : '';
      for (let i = b.start; i <= b.end; i++) {
        let l = lines[i]!;
        if (avatar && i <= b.start + 1) l = l.replace(new RegExp(`^${escape(avatar)}(?:\\s+|$)`), '');
        lines[i] = l.replace(/(?:^|\s)[[\]|{}()]+(?=\s|$)/g, '').trim();
      }
    }

    const authors = new Set(blocks.flatMap((b) => (b.author && !b.own ? [b.author.trim()] : [])));
    let best: { hits: Hit[]; score: number } = { hits: cues.map((c) => ({ ...c })), score: -1 };
    let sawOwn: string | undefined;

    for (const b of blocks) {
      if (b.own) {
        notes.push(`your own message ("${b.author}")`);
        sawOwn = b.author;
        continue;
      }
      if (b.bot) {
        notes.push(`a bot's message ("${b.author}")`);
        continue;
      }
      const hits: Hit[] = [];
      for (let i = b.start; i <= b.end; i++) {
        const line = lines[i]!;
        for (const m of names(line)) hits.push({ rule: 'name', text: m[0], line: i });
        if (initialsRe && initialsTimedRe) {
          const notTimes = new Set(allMatches(initialsTimedRe, line).map((m) => m.index));
          for (const m of allMatches(initialsRe, line)) {
            if (!notTimes.has(m.index)) notes.push(`a time, not your initials: "${line.slice(Math.max(0, m.index - 6), m.index + m[0].length + 3).trim()}"`);
            else if (shouting(line)) notes.push(`capitals, not your initials: "${m[0]}"`);
            else hits.push({ rule: 'initials', text: m[0], line: i });
          }
        }
        // impact is borderline like weak praise: a dashboard is all numbers
        if (chat) for (const m of allMatches(IMPACT, line)) hits.push({ rule: 'impact', text: m[0], line: i });
        const strong = allMatches(STRONG_PRAISE, line);
        for (const m of strong) hits.push({ rule: 'praise', text: m[0], line: i });
        if (chat)
          for (const m of [...allMatches(WEAK_PRAISE, line), ...allMatches(PRAISE_EMOJI, line)])
            // not the "thank" inside a "thank you" that already counted
            if (!strong.some((s) => m.index < s.index + s[0].length && s.index < m.index + m[0].length)) hits.push({ rule: 'praise', text: m[0], line: i });
      }
      const body = lines.slice(b.start, b.end + 1).join(' ').trim();
      const who = hits.filter((h) => h.rule === 'name' || h.rule === 'initials');
      const praise = hits.filter((h) => h.rule === 'praise' || h.rule === 'impact');
      // (a), in a thread: a reply under your own message, that names nobody else on screen
      if (!who.length && sawOwn && thread && praise.length && !namesSomeoneElse(body, authors, (t) => names(t).length > 0)) who.push({ rule: 'reply', text: `a reply to ${sawOwn}`, line: b.start });

      // a name and a praise word in the same message (or, without author lines, within a few lines of each other)
      const near = who.some((w) => praise.some((p) => chatLayout || Math.abs(w.line - p.line) <= NEARBY_LINES));
      const all = dedupe([...who, ...praise, ...(near ? cues : [])]);
      const score = (who.length ? 2 : 0) + (praise.length ? 1 : 0) + (near ? 1 : 0);
      if (score > best.score) best = { hits: dedupe([...who, ...praise, ...cues]), score };
      if (!near) continue;
      if (isTrivialAck(body, names)) {
        notes.push(`just an acknowledgement: "${body}"`);
        continue;
      }
      const lineNos = [...who, ...praise].map((h) => h.line).filter((n) => n >= 0);
      return {
        pass: true,
        matched: all.map(({ rule, text }) => ({ rule, text })),
        quote: quoteOf(lines, b, Math.min(...lineNos), Math.max(...lineNos)),
        ...(b.author ? { from: b.author.trim() } : {}),
        ...(where ? { where } : {}),
        notes,
      };
    }
    return { pass: false, matched: best.hits.map(({ rule, text }) => ({ rule, text })), ...(where ? { where } : {}), notes };
  };
}

/** Does this message name someone other than you: another author on screen, or an @mention that isn't you? */
function namesSomeoneElse(body: string, authors: Set<string>, isMine: (text: string) => boolean): boolean {
  for (const a of authors) {
    const first = a.replace(/^@/, '').split(/\s+/)[0]!;
    if (first.length >= 2 && new RegExp(`${BEFORE}${escape(first)}${AFTER}`, 'iu').test(body)) return true;
  }
  for (const m of body.matchAll(/(?:^|\s)@([\p{L}][\p{L}.-]+(?:\s\p{Lu}[\p{L}-]+)?)/gu)) {
    if (!isMine(m[1]!)) return true;
  }
  return false;
}

/**
 * A bare acknowledgement: short, starts with a thanks or an ok, and after that says nothing but your name, a mention,
 * a time, an emoji or a few plain words ("thx AM", "thanks for the quick reply", "thanks @alex, appreciate it"). Not
 * when anything after the thanks is praise ("thanks for the great review", "you are a legend") or an impact ("saved
 * us 2 hours").
 */
function isTrivialAck(body: string, names: (s: string) => RegExpMatchArray[]): boolean {
  if (body.length >= 40 || !TRIVIAL_ACK.test(body) || allMatches(IMPACT, body).length) return false;
  const lead = /^(?:\s*(?:thanks?(?: you)?|ty(?:sm)?|thx|cheers|ack|ok)\b[\s,!.]*)+/i.exec(body)?.[0] ?? '';
  let rest = body.slice(lead.length).replace(/\bappreciate (?:it|you|that)\b/gi, ' ');
  if (allMatches(STRONG_PRAISE, rest).length || allMatches(WEAK_PRAISE, rest).length) return false;
  for (const m of names(rest).reverse()) rest = rest.slice(0, m.index) + ' ' + rest.slice(m.index! + m[0].length);
  rest = rest
    .replace(/\b\d{1,2}(?::\d{2})?\s?[AaPp]\.?[Mm]\b\.?/g, ' ')
    .replace(/@\S+/g, ' ')
    .replace(/\b\p{Lu}{2,4}\b/gu, ' ')
    .replace(/[^\p{L}\p{N}\s']/gu, ' ');
  return rest.split(/\s+/).filter(Boolean).length <= 5;
}

function dedupe(hits: Hit[]): Hit[] {
  const seen = new Set<string>();
  return hits.filter((h) => {
    const k = `${h.rule}:${h.text.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** The lines that hold the match, joined: the whole message if it's short, else the matched lines and one either side. */
function quoteOf(lines: string[], b: Block, from: number, to: number): string {
  const short = b.end - b.start <= 5;
  const s = short ? b.start : Math.max(b.start, from - 1);
  const e = short ? b.end : Math.min(b.end, to + 1);
  const text = lines
    .slice(s, e + 1)
    // not the thread's reply count, and not a reaction row (emoji pills read as "B22 In 8": short bits with numbers)
    .filter((l) => l.trim() && !/^(?:\d+\s+repl(?:y|ies)\b|Last reply\b|View thread\b)/i.test(l.trim()) && !(/^\S{1,3}(?:\s+\S{1,3})*$/.test(l.trim()) && /\d/.test(l)))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 400 ? text.slice(0, 399).trimEnd() + '…' : text;
}

/** A match in words, for a Found card's "which rules it passed" (FoundCandidate.matchedRules). */
export function describeMatch(m: RuleMatch): string {
  switch (m.rule) {
    case 'name':
      return `Says your name: "${m.text}"`;
    case 'initials':
      return `Your initials: "${m.text}"`;
    case 'reply':
      return `Replies to your message`;
    case 'praise':
      return `Praise: "${m.text}"`;
    case 'impact':
      return `Impact: "${m.text}"`;
    case 'chat':
      return `Looks like a chat: "${m.text}"`;
  }
}
