// The agent-facing documents (SPEC R11), adapted from Hallway's server/guide.ts (itself Local Review's shared/llms.ts):
// - AGENT-GUIDE.md, shipped in the package: `bragdoc guide`, and GET /agent-guide.md with this server's live facts;
// - GET /llms.txt (https://llmstxt.org): an H1, a blockquote summary, the live facts, the rules and links; GET
//   /llms-full.txt is llms.txt followed by the whole guide;
// - `bragdoc guide --snippet`: the paragraph for users' agent instruction files, from the guide's own section.
// The guide's file-format reference sits between the same markers as docs/data-format.md's and is regenerated from
// the schemas (shared/schema/reference.ts) every time it's rendered, so it can't drift; test/guide.test.ts keeps the
// committed copy in step too (`npm run sync:reference` rewrites both).
import fs from 'node:fs';
import path from 'node:path';
import { withReference } from '../shared/schema/reference.js';
import { PACKAGE_ROOT } from './paths.js';
import { DEFAULT_PORT } from './port.js';

export const AGENT_GUIDE = path.join(PACKAGE_ROOT, 'AGENT-GUIDE.md');
const LIVE_MARKER = '<!-- live facts -->';
export const DEFAULT_URL = `http://localhost:${DEFAULT_PORT}`;
export const SNIPPET_SECTION = 'For your agent instruction file';
export const RULES_SECTION = 'The rules';

/** What the running server knows, all of it already on its own pages. */
export interface LiveFacts {
  version: string;
  /** The data home, as people write it (`~/.bragdoc`). */
  home: string;
  writeTo: 'board' | 'found';
  achievements: number;
  projects: { id: string; name: string }[];
  repos: number;
}

export interface GuideInput {
  /** AGENT-GUIDE.md's text. */
  guide: string;
  /** Where the server is: `http://localhost:2724`. */
  url: string;
  /** Only the running server's copy has these. */
  live?: LiveFacts;
  /** Without a server (`bragdoc guide`): the data home, so the guide can still say where files are. */
  home?: string;
}

/** AGENT-GUIDE.md as committed, with its reference section regenerated. */
export function readGuide(): string {
  return withReference(fs.readFileSync(AGENT_GUIDE, 'utf8'));
}

/** Split markdown into `## ` sections (outside code fences): heading → body. */
function sections(md: string): Map<string, string> {
  const out = new Map<string, string[]>();
  let current: string[] = [];
  let fence = false;
  for (const line of md.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const m = !fence && /^## (.+)$/.exec(line);
    if (m) out.set(m[1]!.trim(), (current = []));
    else current.push(line);
  }
  return new Map([...out].map(([k, v]) => [k, v.join('\n').trim()]));
}

/** One `## ` section of the guide, without its heading. Throws if it's missing. */
export function guideSection(guide: string, heading: string): string {
  const body = sections(guide).get(heading);
  if (body === undefined) throw new Error(`AGENT-GUIDE.md: no "## ${heading}" section (server/guide.ts)`);
  return body;
}

/** The snippet for agent instruction files: the blockquote in its section, unquoted. */
export function snippet(guide: string): string {
  const quote = guideSection(guide, SNIPPET_SECTION)
    .split('\n')
    .filter((l) => l.startsWith('>'))
    .map((l) => l.replace(/^> ?/, ''));
  if (!quote.length) throw new Error(`AGENT-GUIDE.md: "## ${SNIPPET_SECTION}" has no blockquote (server/guide.ts)`);
  return quote.join('\n').trim() + '\n';
}

const code = (s: string) => '`' + s + '`';

function liveFacts(i: GuideInput, f: LiveFacts): string {
  const projects = f.projects.length ? f.projects.map((p) => `  - ${code(p.id)}: ${p.name}`).join('\n') : '  - none yet';
  return [
    '**This BragDoc, right now:**',
    '',
    `- Served at ${i.url}, version ${f.version}. It listens on this computer only: fetch its URLs with \`curl\` (a web-fetch tool may refuse localhost).`,
    `- Data home: ${code(f.home)}. ${f.achievements} achievement${f.achievements === 1 ? '' : 's'}, ${f.repos} tracked repo${f.repos === 1 ? '' : 's'}.`,
    `- Agents' achievements go ${f.writeTo === 'board' ? 'straight onto the board, marked as theirs' : 'to Found, for the user to keep or dismiss'} (\`mcp.writeTo: ${f.writeTo}\` in config.yaml).`,
    '- Active projects:',
    projects,
  ].join('\n');
}

function offlineFacts(i: GuideInput): string {
  return [
    `**No live data here:** this copy comes from the package, not a running BragDoc. With BragDoc running, ${i.url}/agent-guide.md (or /llms.txt) adds its version, data home and projects.`,
    i.home ? `The data home on this machine is ${code(i.home)}.` : 'The data home is `~/.bragdoc` (or `$BRAGDOC_HOME`).',
  ].join(' ');
}

/** The default URL becomes this server's. */
const localize = (md: string, i: GuideInput) => md.replaceAll(DEFAULT_URL, i.url);

/** The whole guide, with live facts where its marker is (GET /agent-guide.md, `bragdoc guide`). */
export function agentGuide(i: GuideInput): string {
  const facts = i.live ? liveFacts(i, i.live) : offlineFacts(i);
  const g = localize(i.guide.trimEnd(), i);
  return `${g.includes(LIVE_MARKER) ? g.replace(LIVE_MARKER, facts) : g}\n`;
}

/** GET /llms.txt: the summary, live facts, the rules, and links. */
export function llmsTxt(i: GuideInput): string {
  return [
    '# BragDoc',
    '',
    `> BragDoc (npm: \`@bragdoc/local\`) is a local-first record of what someone has achieved at work, served at ${i.url}: achievements with their evidence (PRs, links, quotes, screenshots), grouped into projects and linked to code repos. Everything is plain files in a data home that agents may read and edit; the app updates live. This file tells a coding agent how to log achievements for the user.`,
    '',
    i.live ? liveFacts(i, i.live) : offlineFacts(i),
    '',
    '## The rules',
    '',
    localize(guideSection(i.guide, RULES_SECTION), i),
    '',
    '## Docs',
    '',
    `- [Agent guide](${i.url}/agent-guide.md): the whole guide: MCP, the HTTP API, editing the files, and the file-format reference. Also \`bragdoc guide\`.`,
    `- [llms-full.txt](${i.url}/llms-full.txt): this file followed by the whole agent guide`,
    `- MCP: \`${i.url}/mcp\` (Streamable HTTP, with the bearer token from runtime.json), or \`bragdoc mcp\` on stdio. \`bragdoc mcp install claude\` registers it with Claude Code.`,
    '',
  ].join('\n');
}

/** GET /llms-full.txt: llms.txt, then the whole guide. */
export function llmsFullTxt(i: GuideInput): string {
  return `${llmsTxt(i)}\n---\n\n${agentGuide(i)}`;
}
