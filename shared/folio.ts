// Folio (SPEC R9): a date window of achievements, filtered, with some left out, as a document you can paste into a
// self-review. Everything here is pure (no Node, no DOM), so the server (GET /api/folio reduces achievements to
// clippings), the page (filters, the printout, Copy and Export) and the tests share one copy.
//
// What a folio may contain is deliberately narrow (D53): titles, summaries, dates, impact, project and company names,
// and evidence as something a reviewer can follow. PRs and links are links; quotes are blockquotes; files are named,
// never located. No ids, no file paths, no URLs of this machine (`localhost`, the evidence routes), since the
// document is made to leave it. No AI: it's exactly what you picked (D8).
// Adapted from the Scrapbook prototype's shared/review.ts (applyFilter, toMarkdown, PRESETS) and Folio.tsx.

import type { FolioCompany, FolioEvidence, FolioItem, FolioProject, FolioResponse } from './api.js';

export type { FolioCompany, FolioEvidence, FolioItem, FolioProject, FolioResponse };

// ---------------------------------------------------------------- dates

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = MONTHS.map((m) => m.slice(0, 3));
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day, `YYYY-MM-DD` (not 2026-02-30). */
export function isDay(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = DAY_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

const parts = (d: string) => d.split('-').map(Number) as [number, number, number];
const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
/** 13 Oct 2026 */
export const shortDate = (d: string) => `${parts(d)[2]} ${MON[parts(d)[1] - 1]} ${parts(d)[0]}`;
/** 13 October 2026 */
export const longDate = (d: string) => `${parts(d)[2]} ${MONTHS[parts(d)[1] - 1]} ${parts(d)[0]}`;

// ---------------------------------------------------------------- presets

export const PRESET_IDS = ['this-quarter', 'last-quarter', 'last-6-months', 'this-year', 'last-year'] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export interface Preset {
  id: PresetId;
  label: string;
  from: string;
  to: string;
}

/**
 * The date presets (SPEC R9), worked out from the user's local `today` (YYYY-MM-DD). "This …" windows run to today,
 * not to the end of the quarter or year: nothing has happened after today yet.
 */
export function presets(today: string): Preset[] {
  const [y, m] = parts(today);
  const q = Math.floor((m - 1) / 3); // 0–3
  const [ly, lq] = q === 0 ? [y - 1, 3] : [y, q - 1];
  return [
    { id: 'this-quarter', label: 'This quarter', from: iso(y, q * 3 + 1, 1), to: today },
    { id: 'last-quarter', label: 'Last quarter', from: iso(ly, lq * 3 + 1, 1), to: iso(ly, lq * 3 + 4, 0) },
    { id: 'last-6-months', label: 'Last 6 months', from: sixMonthsBefore(today), to: today },
    { id: 'this-year', label: 'This year', from: iso(y, 1, 1), to: today },
    { id: 'last-year', label: 'Last year', from: iso(y - 1, 1, 1), to: iso(y - 1, 12, 31) },
  ];
}

/** The same day six months back (31 Oct → 30 Apr: clamped to the end of a shorter month). */
function sixMonthsBefore(today: string): string {
  const [y, m, d] = parts(today);
  const monthEnd = new Date(Date.UTC(y, m - 6, 0)).getUTCDate(); // day 0 of the month after (m - 5): the last day of m - 6
  return iso(y, m - 6, Math.min(d, monthEnd));
}

/** Which preset a window is, if it's one. */
export function presetOf(from: string, to: string, today: string): PresetId | undefined {
  return presets(today).find((p) => p.from === from && p.to === to)?.id;
}

// ---------------------------------------------------------------- the page's state (it lives in the URL)

export const GROUPS = ['project', 'month', 'week'] as const;
export type FolioGroup = (typeof GROUPS)[number];

/** The project filter's id for "no project". */
export const NO_PROJECT = 'none';

export interface FolioFilter {
  from: string;
  to: string;
  /** Project ids to keep (plus NO_PROJECT for achievements with none); empty: every project. */
  projects: string[];
  /** A company id; achievements whose own company or one of whose projects' company it is. */
  company?: string;
  /** 0: any impact, unrated included. 1–10: at least that, so unrated ones are left out. */
  minImpact: number;
  /** Achievements unticked in the clippings list. */
  exclude: string[];
  group: FolioGroup;
}

/** The URL's search params, as TanStack Router hands them over (strings, or numbers it parsed). */
export type FolioSearch = Partial<Record<'from' | 'to' | 'p' | 'c' | 'min' | 'out' | 'group' | 'view', string | number>>;

const ID_LIST = /^[0-9A-Za-z,]*$/;
const list = (v: unknown): string[] => (typeof v === 'string' && ID_LIST.test(v) ? [...new Set(v.split(',').filter(Boolean))].slice(0, 2000) : []);

/**
 * The filter in the URL, with anything malformed dropped (a hand-edited or truncated link still opens). With no window
 * in the URL, the default is the last six months. A window given backwards is swapped.
 */
export function readSearch(s: FolioSearch, today: string): FolioFilter {
  const def = presets(today).find((p) => p.id === 'last-6-months')!;
  // one end alone: from that day to today, or the six months up to that day
  let to = isDay(s.to) ? s.to : isDay(s.from) ? today : def.to;
  let from = isDay(s.from) ? s.from : isDay(s.to) ? sixMonthsBefore(s.to) : def.from;
  if (from > to) [from, to] = [to, from];
  const min = Number(s.min);
  return {
    from,
    to,
    projects: list(s.p),
    ...(typeof s.c === 'string' && /^[0-9A-Za-z]{1,40}$/.test(s.c) ? { company: s.c } : {}),
    minImpact: Number.isInteger(min) && min >= 0 && min <= 10 ? min : 0,
    exclude: list(s.out),
    group: GROUPS.includes(s.group as FolioGroup) ? (s.group as FolioGroup) : 'project',
  };
}

/** The filter as URL search params: the window always, the rest only when it isn't the default. */
export function writeSearch(f: FolioFilter): Record<string, string | number> {
  return {
    from: f.from,
    to: f.to,
    ...(f.projects.length ? { p: f.projects.join(',') } : {}),
    ...(f.company ? { c: f.company } : {}),
    ...(f.minImpact ? { min: f.minImpact } : {}), // a number: the router would quote a numeric string
    ...(f.exclude.length ? { out: f.exclude.join(',') } : {}),
    ...(f.group !== 'project' ? { group: f.group } : {}),
  };
}

// ---------------------------------------------------------------- filtering, grouping

/** Highest impact first (unrated last), then newest. The order a reviewer wants to read in (PR14 brief). */
export function byImpactThenDate(a: FolioItem, b: FolioItem): number {
  return (b.impact ?? 0) - (a.impact ?? 0) || b.happenedAt.localeCompare(a.happenedAt) || a.title.localeCompare(b.title);
}

/**
 * The filter with references to projects and companies that no longer exist taken out (one deleted while the page was
 * open, or a stale link), so it means what the page shows: a filter on nothing that's left is no filter.
 */
export function pruneFilter(f: FolioFilter, data: FolioResponse): FolioFilter {
  const projects = f.projects.filter((p) => p === NO_PROJECT || data.projects.some((x) => x.id === p));
  const company = f.company && data.companies.some((c) => c.id === f.company) ? f.company : undefined;
  if (projects.length === f.projects.length && company === f.company) return f;
  const { company: _drop, ...rest } = f;
  return { ...rest, projects, ...(company ? { company } : {}) };
}

/** The items the filters let through (exclusions not applied: the clippings list shows those, unticked), best first. */
export function matching(data: FolioResponse, f: FolioFilter): FolioItem[] {
  const projectCompany = new Map(data.projects.map((p) => [p.id, p.companyId]));
  // a filter on a project or company that's gone (deleted while the page was open, or a stale link) counts for nothing
  const want = new Set(f.projects.filter((p) => p === NO_PROJECT || projectCompany.has(p)));
  const company = f.company && data.companies.some((c) => c.id === f.company) ? f.company : undefined;
  return data.items
    .filter((a) => a.happenedAt >= f.from && a.happenedAt <= f.to)
    .filter((a) => !f.minImpact || (a.impact ?? 0) >= f.minImpact)
    .filter((a) => !want.size || (a.projects.length ? a.projects.some((p) => want.has(p)) : want.has(NO_PROJECT)))
    .filter((a) => !company || a.companyId === company || a.projects.some((p) => projectCompany.get(p) === company))
    .sort(byImpactThenDate);
}

/** An item as the document lists it: with its projects' names, for sections grouped by time. */
export type FolioLine = FolioItem & { projectNames: string[] };

export interface FolioSection {
  /** For React keys and test ids only. */
  key: string;
  heading: string;
  /** The company, beside a project's heading. */
  aside?: string;
  /** A project's colour, for the printout's square. */
  color?: string;
  items: FolioLine[];
}

export interface FolioDoc {
  group: FolioGroup;
  title: string;
  /** `13 October 2026 – 16 October 2026 · 11 achievements` */
  dates: string;
  /** What the filters narrowed it to, in words; empty when nothing was filtered. */
  scope: string[];
  sections: FolioSection[];
  count: number;
}

/**
 * The document: the picked items in sections. By project, a multi-project achievement goes under the first of its
 * projects the filter kept (once, never twice); sections are in the order of their best item, with "No project"
 * last. By month or week, newest first. Within a section, best first.
 */
export function folioDoc(data: FolioResponse, f: FolioFilter): FolioDoc {
  const out = new Set(f.exclude);
  const picked = matching(data, f).filter((a) => !out.has(a.id));
  const projects = new Map(data.projects.map((p) => [p.id, p]));
  const companies = new Map(data.companies.map((c) => [c.id, c.name]));
  const want = new Set(f.projects.filter((p) => p !== NO_PROJECT));
  const sections = new Map<string, FolioSection>();
  const add = (key: string, make: () => Omit<FolioSection, 'key' | 'items'>, a: FolioItem) => {
    let s = sections.get(key);
    if (!s) sections.set(key, (s = { key, ...make(), items: [] }));
    s.items.push({ ...a, projectNames: a.projects.map((p) => projects.get(p)?.name).filter((n): n is string => !!n) });
  };
  for (const a of picked) {
    if (f.group === 'project') {
      // the first of its projects the filters kept (by project, then by company), else its first
      const pid =
        a.projects.find((p) => (!want.size || want.has(p)) && (!f.company || projects.get(p)?.companyId === f.company)) ??
        a.projects.find((p) => !want.size || want.has(p)) ??
        a.projects[0];
      const p = pid ? projects.get(pid) : undefined;
      if (!p) add(NO_PROJECT, () => ({ heading: 'No project' }), a);
      else {
        const co = p.companyId ? companies.get(p.companyId) : undefined;
        add(p.id, () => ({ heading: p.name, color: p.color, ...(co ? { aside: co } : {}) }), a);
      }
    } else if (f.group === 'month') {
      const key = a.happenedAt.slice(0, 7);
      add(key, () => ({ heading: `${MONTHS[parts(a.happenedAt)[1] - 1]} ${parts(a.happenedAt)[0]}` }), a);
    } else {
      const monday = mondayOf(a.happenedAt);
      add(monday, () => ({ heading: `Week of ${longDate(monday)}` }), a);
    }
  }
  let ordered = [...sections.values()];
  if (f.group === 'project') ordered = [...ordered.filter((s) => s.key !== NO_PROJECT), ...ordered.filter((s) => s.key === NO_PROJECT)];
  else ordered.sort((x, y) => y.key.localeCompare(x.key));

  const scope: string[] = [];
  const named = f.projects.map((p) => (p === NO_PROJECT ? 'no project' : projects.get(p)?.name)).filter((n): n is string => !!n);
  if (named.length) scope.push(`${named.length === 1 ? 'Project' : 'Projects'}: ${named.join(', ')}`);
  const co = f.company ? companies.get(f.company) : undefined;
  if (co) scope.push(`Company: ${co}`);
  if (f.minImpact) scope.push(`Impact ${f.minImpact} and up`);

  return {
    group: f.group,
    title: data.author ? `${data.author}: achievements` : 'Achievements',
    dates: `${longDate(f.from)} – ${longDate(f.to)} · ${picked.length} ${picked.length === 1 ? 'achievement' : 'achievements'}`,
    scope,
    sections: ordered,
    count: picked.length,
  };
}

function mondayOf(day: string): string {
  const [y, m, d] = parts(day);
  const x = new Date(Date.UTC(y, m - 1, d));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- markdown

/** Markdown's inline syntax characters, escaped, so a title like `snake_case [WIP]` stays literally that. */
export function mdText(s: string): string {
  return s.replace(/\s+/g, ' ').trim().replace(/[\\`*_[\]<>|]/g, (c) => `\\${c}`);
}

/**
 * A line of text that sits on a line of its own in the document (a summary, a line of a quote): inline syntax escaped,
 * and whatever would start a block (a heading, a list, a quote, a rule, a setext underline) escaped too.
 */
export function mdLine(s: string): string {
  // an ordered list's marker is escaped after its digits (`1\.`): a backslash before a digit is just a backslash
  return mdText(s)
    .replace(/^(#{1,6}(?=\s|$)|[+=-])/, (m) => `\\${m}`)
    .replace(/^(\d+)([.)])/, '$1\\$2');
}

/** When it happened: `13 Oct 2026`, or `13 Oct 2026 – 2 Nov 2026` for something that took a while. */
export function whenOf(a: Pick<FolioItem, 'happenedAt' | 'endedAt'>): string {
  return a.endedAt && a.endedAt > a.happenedAt ? `${shortDate(a.happenedAt)} – ${shortDate(a.endedAt)}` : shortDate(a.happenedAt);
}

const FILE_WORD = { image: 'Screenshot', pdf: 'Document', file: 'File' } as const;
const FILE_NONAME = { image: 'a picture', pdf: 'a PDF', file: 'a file' } as const;

/** One evidence item as markdown lines (without the list indent). */
function evidenceLines(e: FolioEvidence): string[] {
  switch (e.kind) {
    case 'github_pr': {
      const label = mdText(e.title ? `${e.ref}: ${e.title}` : e.ref);
      return [`- PR: ${e.url ? `[${label}](${mdUrl(e.url)})` : label}`];
    }
    case 'url': {
      const label = mdText(e.title || e.domain || 'a link');
      return [`- Link: ${e.url ? `[${label}](${mdUrl(e.url)})` : `${label} (a local address, left out)`}`];
    }
    case 'quote': {
      const said = e.text.split(/\r?\n/).map((l) => `> ${mdLine(l)}`.trimEnd());
      const who = [e.from, e.where].filter(Boolean).map((s) => mdText(s!)).join(', ');
      return [...said, ...(who ? ['>', `> — ${who}`] : [])];
    }
    default:
      return [`- ${FILE_WORD[e.kind]}: ${e.name ? mdText(e.name) : FILE_NONAME[e.kind]}`];
  }
}

/** A URL inside `(…)`: spaces and parentheses encoded so the link can't end early. */
const mdUrl = (u: string) => u.replace(/[ ()<>]/g, (c) => encodeURIComponent(c));

/** The folio as a markdown document (the Export and Copy buttons). Ends with one newline. */
export function toMarkdown(doc: FolioDoc): string {
  const lines = [`# ${mdText(doc.title)}`, '', `_${doc.dates}_`];
  if (doc.scope.length) lines.push('', `_${doc.scope.map(mdText).join(' · ')}_`);
  if (!doc.count) lines.push('', 'Nothing picked.');
  for (const s of doc.sections) {
    lines.push('', `## ${mdText(s.heading)}${s.aside ? ` (${mdText(s.aside)})` : ''}`, '');
    for (const a of s.items) {
      const bits = [whenOf(a)];
      // grouped by time, say which project; grouped by project, the heading already does
      if (doc.group !== 'project' && a.projectNames.length) bits.push(mdText(a.projectNames.join(', ')));
      if (a.impact) bits.push(`impact ${a.impact}/10`);
      lines.push(`- **${mdText(a.title)}** · ${bits.join(' · ')}`);
      if (a.summary) lines.push(`  ${mdLine(a.summary)}`);
      // links and files as a list, then quotes as blockquotes (as the printout draws them)
      const ev = [...a.evidence.filter((e) => e.kind !== 'quote'), ...a.evidence.filter((e) => e.kind === 'quote')];
      for (const e of ev) for (const l of evidenceLines(e)) lines.push(l === '>' ? '  >' : `  ${l}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

/** The download's file name: `bragdoc-<from>-<to>.md`. */
export const exportName = (f: Pick<FolioFilter, 'from' | 'to'>) => `bragdoc-${f.from}-${f.to}.md`;

// ---------------------------------------------------------------- the server's side: achievement → clipping

/**
 * Hosts that only mean something on this machine or its network: a link to one is useless (and telling) in a document
 * that leaves it. Loopback in every spelling, the unspecified address, private and link-local ranges (IPv4, and IPv6
 * including IPv4-mapped), and the local-only names (`localhost`, `.local`, `.lan`, `.internal`, `.home.arpa`).
 */
export function isLocalUrl(u: URL): boolean {
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!h.includes('.') && !h.includes(':')) return true; // a bare name (`localhost`, `intranet`): only resolves locally
  if (/(^|\.)(localhost|local|lan|internal|home\.arpa)$/.test(h)) return true;
  const v4 = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(h);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (h.includes(':')) {
    const mapped = /^::ffff:(?:([0-9a-f]{1,4}):[0-9a-f]{1,4}|(\d+\.\d+\.\d+\.\d+))$/.exec(h);
    if (mapped) {
      if (mapped[2]) return isLocalUrl(new URL(`http://${mapped[2]}/`));
      const hi = parseInt(mapped[1], 16);
      return isLocalUrl(new URL(`http://${hi >> 8}.${hi & 255}.0.0/`));
    }
    return h === '::' || h === '::1' || /^f[cd]/.test(h) || /^fe[89ab]/.test(h);
  }
  return false;
}

/** An http(s) URL that isn't a local one, or undefined. (Never `file:`, `javascript:` or the like.) */
export function shareableUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw.trim());
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || isLocalUrl(u)) return undefined;
    return u.href;
  } catch {
    return undefined;
  }
}

/** An http(s) URL whose host is a local one (a link worth naming, marked as left out), as opposed to no link at all. */
function isLocalHttp(raw: string | undefined): boolean {
  try {
    const u = new URL((raw ?? '').trim());
    return (u.protocol === 'http:' || u.protocol === 'https:') && isLocalUrl(u);
  } catch {
    return false;
  }
}

/** A file's name without any folder (a hand-edited sidecar could hold a path; Windows ones too). */
export function baseName(name: string | undefined): string | undefined {
  const b = name?.split(/[\\/]/).pop()?.trim();
  return b || undefined;
}

// A file's location in running text: home-ish absolute paths (`/Users/…`, `/home/…`, `~/…`, …), relative ones
// (`./…`, `../…`), Windows (`C:\…`, `\\server\…`) and `file:` URLs. Ordinary slashes ("PDF/CSV", "and/or") don't match.
const PATH_IN_TEXT =
  /(?:file:\/\/\S+|(?:~|\.{1,2}|\/(?:Users|home|root|private|Volumes|var|tmp|mnt|media|opt|srv|data|etc))\/[^\s)\]>"'`]+|[A-Za-z]:\\[^\s)\]>"'`]+|\\\\[^\s)\]>"'`]+)/g;
/** BragDoc's own routes (`/api/evidence/<sha>`, …): a link back into this app. */
const OWN_ROUTE = /(?<![\w/])\/api\/[^\s)\]>"'`]*/g;
const URL_IN_TEXT = /\bhttps?:\/\/[^\s)\]>"'`]+/gi;
const SHA = /\b[0-9a-f]{64}\b/gi;

/**
 * Text written by the user (or an agent, or an import), made safe to leave this machine: links to a local address
 * become "(a local link)", file locations become the file's name, BragDoc's own routes and content hashes go. Links
 * anyone can open are kept as they are.
 */
export function scrubText(text: string): string {
  return text
    .replace(URL_IN_TEXT, (u) => (shareableUrl(u) ? u : '(a local link)'))
    .replace(PATH_IN_TEXT, (p) => baseName(p.replace(/^file:\/\//, '')) ?? '')
    .replace(OWN_ROUTE, '')
    .replace(SHA, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * The first paragraph of a markdown body as plain text on one line: what a folio shows when there's no summary.
 * Headings, code, tables and pictures are skipped; links keep their words; emphasis and code marks go.
 */
export function firstParagraph(body: string): string | undefined {
  const para = body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !/^(#|```|~~~|<!--|!\[|\||---|\*\*\*)/.test(p));
  if (!para) return undefined;
  const one = para
    .replace(/^(?:[-*+>]|\d+[.)])\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|`)/g, '')
    .replace(/(^|\W)[*_](\S[^*_]*\S|\S)[*_](?=\W|$)/g, '$1$2')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!one) return undefined;
  return one.length > 400 ? `${one.slice(0, 399).trimEnd()}…` : one;
}

/** `/x`, `~/x`, `./x`, `C:\x`, `\\server\x`, `file:…`, or one word with a slash in it: a caption that is really a location. */
const LOOKS_LIKE_PATH = /^(?:~?[\\/]|\.{1,2}[\\/]|[A-Za-z]:[\\/]|file:|\S*[\\/]\S*$)/;

/** What `toClipping` needs from an achievement: its file's fields, loosely (shared/schema's Achievement fits). */
export interface ClippingSource {
  id: string;
  title: string;
  summary?: string;
  body: string;
  happenedAt: string;
  endedAt?: string | null;
  impact?: number;
  projects: string[];
  companyId?: string | null;
  evidence: { kind: string; blob?: string; url?: string; externalKey?: string; title?: string; quote?: { text: string; from?: string; where?: string } }[];
}

/** GitHub's own shape for `owner/repo`. Anything else in a hand-edited key is not a pull request we can name. */
const REPO = '[A-Za-z0-9-]{1,39}\\/[A-Za-z0-9._-]{1,100}';
const PR_KEY = new RegExp(`^github_pr:(${REPO})#(\\d{1,9})$`);
const PR_URL = new RegExp(`^https?:\\/\\/(?:www\\.)?github\\.com\\/(${REPO})\\/pull\\/(\\d{1,9})(?:[/?#].*)?$`, 'i');

/**
 * An achievement cut down to what a folio may show (D53): every piece of text scrubbed (`scrubText`), files by name
 * only, links only if anyone could open them. `fileName(sha)` is the evidence file's original name, from its sidecar;
 * `has` says whether a project or company still exists.
 */
export function toClipping(a: ClippingSource, fileName: (sha: string) => string | undefined, has: { project: (id: string) => boolean; company: (id: string) => boolean }): FolioItem {
  const clean = (t: string | undefined) => (t ? scrubText(t) || undefined : undefined);
  const evidence: FolioEvidence[] = [];
  for (const e of a.evidence) {
    const title = clean(e.title);
    if (e.kind === 'github_pr') {
      const key = PR_KEY.exec(e.externalKey ?? '');
      const fromUrl = PR_URL.exec(e.url?.trim() ?? '');
      const m = key ?? fromUrl;
      const ref = m ? `${m[1]}#${m[2]}` : 'a pull request';
      const url = fromUrl ? shareableUrl(e.url) : key ? `https://github.com/${key[1]}/pull/${key[2]}` : undefined;
      evidence.push({ kind: 'github_pr', ref, ...(url ? { url } : {}), ...(title ? { title } : {}) });
    } else if (e.kind === 'url') {
      const url = shareableUrl(e.url);
      // a link nobody else could follow: named and marked if it's a local web address, dropped if it isn't the web
      if (!url && !isLocalHttp(e.url)) continue;
      const domain = url ? new URL(url).hostname.replace(/^www\./, '') : undefined;
      evidence.push({ kind: 'url', ...(url ? { url } : {}), ...(domain ? { domain } : {}), ...(title ? { title } : {}) });
    } else if (e.kind === 'quote' && e.quote?.text) {
      const text = clean(e.quote.text);
      if (!text) continue;
      const from = clean(e.quote.from);
      const where = clean(e.quote.where);
      evidence.push({ kind: 'quote', text, ...(from ? { from } : {}), ...(where ? { where } : {}) });
    } else if (e.kind === 'image' || e.kind === 'pdf' || e.kind === 'file') {
      // the caption the user gave it, else the name it was added with; never where it lives
      const caption = e.title?.trim();
      const name = (caption && LOOKS_LIKE_PATH.test(caption) ? baseName(caption) : clean(caption)) || baseName(e.blob ? fileName(e.blob) : undefined);
      evidence.push({ kind: e.kind, ...(name ? { name } : {}) });
    }
  }
  const summary = clean(a.summary?.trim() || firstParagraph(a.body));
  return {
    id: a.id,
    title: clean(a.title) ?? a.title,
    ...(summary ? { summary } : {}),
    happenedAt: a.happenedAt,
    ...(a.endedAt ? { endedAt: a.endedAt } : {}),
    ...(a.impact ? { impact: a.impact } : {}),
    projects: a.projects.filter((p) => has.project(p)),
    ...(a.companyId && has.company(a.companyId) ? { companyId: a.companyId } : {}),
    evidence,
  };
}
