// The MCP tools, resource and prompts (SPEC R11). Adapted from Hallway's server/mcp/tools.ts: a typed layer over the
// same services the HTTP API calls (D24), so every write goes through the store, keeps the file's comments and updates
// the index at once. Names are verb_noun with a `bragdoc_` prefix, and the descriptions are written for tool search:
// they're what a client's tool search matches when the user says "note this in my BragDoc".
//
// Writes carry `source: mcp` and the agent's name (agentName, D42). `mcp.writeTo: found` in config.yaml sends new
// achievements to Found instead of the board (D11). Nothing here deletes anything.
import { McpServer, type CallToolResult, type ServerContext } from '@modelcontextprotocol/server';
import * as z from 'zod';
import { IMPACT_SCALE } from '../../shared/impact.js';
import { ACHIEVEMENT_SOURCES, PROJECT_STATUSES, ulidSchema, type Achievement, type Evidence, type EvidenceInput } from '../../shared/schema/index.js';
import { ulid } from '../../shared/ulid.js';
import type { Config } from '../config.js';
import { ATTACHABLE, type Services } from '../services/index.js';
import { requireIds } from '../services/util.js';
import { ConflictError, NotFoundError, ReadOnlyError, ValidationError, type Store } from '../store/index.js';
import { achievementDetail, achievementSummary, buildContext, findProject, projectView, repoView } from './views.js';

export interface McpContext {
  store: Store;
  services: Services;
  /** config.yaml, live (`mcp.writeTo`). */
  config: () => Config;
  version: string;
}

export const CONTEXT_URI = 'bragdoc://context';

const INSTRUCTIONS = `BragDoc is the user's record of what they've achieved at work: achievements (each with a date, an optional \
1-10 impact and evidence such as PRs, links, quotes and files), grouped into projects and linked to code repos. \
It runs on their own machine and keeps everything as plain files. When the user asks you to note, log, record or \
remember something they did ("put this in my BragDoc", "log that I shipped X"), call bragdoc_get_context first, \
search for related achievements with bragdoc_search_achievements, investigate anything that contradicts what you're \
about to write, then add (bragdoc_add_achievement) or update the existing one. Never invent results or numbers.`;

// ---------------------------------------------------------------------------------------------------------------
// Who's writing
// ---------------------------------------------------------------------------------------------------------------

/** Client ids (X-BragDoc-Client, or an MCP clientInfo name) and how the board names them. */
const KNOWN_CLIENTS: Record<string, string> = {
  'claude-code': 'Claude Code',
  'claude-ai': 'Claude Desktop',
  'claude-desktop': 'Claude Desktop',
  cursor: 'Cursor',
  'cursor-vscode': 'Cursor',
  windsurf: 'Windsurf',
  'visual-studio-code': 'VS Code',
  vscode: 'VS Code',
  zed: 'Zed',
  codex: 'Codex',
  'codex-mcp-client': 'Codex',
  'gemini-cli': 'Gemini CLI',
  goose: 'Goose',
};

/** A client name fit to show: printable, trimmed, short. Undefined if nothing is left. */
function clean(s: string | undefined | null): string | undefined {
  const t = (s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 60);
  return t || undefined;
}

/**
 * Who wrote it, as the board shows it ("Written by Claude Code"): the X-BragDoc-Client header (`bragdoc mcp install`
 * sets it; the stdio bridge sets it from the client's initialize), else the client's own name from the request's
 * metadata (2026-07-28 clients send it with every request), else nothing (the board says "an agent"). Known ids get
 * their product name (D42).
 */
export function agentName(header: string | undefined | null, clientInfo?: { name?: unknown; title?: unknown }): string | undefined {
  const h = clean(header);
  if (h) return KNOWN_CLIENTS[h.toLowerCase()] ?? h;
  const name = typeof clientInfo?.name === 'string' ? clean(clientInfo.name) : undefined;
  if (name && KNOWN_CLIENTS[name.toLowerCase()]) return KNOWN_CLIENTS[name.toLowerCase()];
  return (typeof clientInfo?.title === 'string' ? clean(clientInfo.title) : undefined) ?? name;
}

const CLIENT_INFO = 'io.modelcontextprotocol/clientInfo';

// ---------------------------------------------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------------------------------------------

const ok = (data: Record<string, unknown>): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  structuredContent: data,
});

/** A tool error the agent can act on. */
function failure(e: unknown): CallToolResult {
  let text: string;
  if (e instanceof ConflictError)
    text = `Conflict: ${e.message}${e.etag ? ` (the file's current etag is ${e.etag}; read it again and retry with that)` : ''}`;
  else if (e instanceof ValidationError) text = `Invalid: ${e.message}`;
  else if (e instanceof NotFoundError || e instanceof ReadOnlyError) text = e.message;
  else {
    process.stderr.write(`bragdoc: [mcp] ${(e as Error).stack ?? e}\n`);
    text = `Error: ${(e as Error).message ?? e}`;
  }
  return { content: [{ type: 'text', text }], isError: true };
}

const run =
  <A>(fn: (args: A, extra: ServerContext) => Promise<Record<string, unknown>> | Record<string, unknown>) =>
  async (args: A, extra: ServerContext): Promise<CallToolResult> => {
    try {
      return ok(await fn(args, extra));
    } catch (e) {
      return failure(e);
    }
  };

// ---------------------------------------------------------------------------------------------------------------
// Evidence arguments
// ---------------------------------------------------------------------------------------------------------------

const GITHUB_PR = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)(?:[/?#].*)?$/i;

const quoteArg = z.strictObject({
  text: z.string().min(1).describe('The words, exactly as written.'),
  from: z.string().optional().describe('Who said it.'),
  where: z.string().optional().describe('Where: a channel, a review, a meeting.'),
});

const evidenceArg = z
  .strictObject({
    url: z.string().optional().describe('A link (http or https). A GitHub pull request URL becomes PR evidence keyed github_pr:owner/repo#n.'),
    path: z.string().optional().describe('An absolute path to a file on this machine: an image, PDF, document, text file or video, at most 25 MB. It is copied into BragDoc.'),
    quote: quoteArg.optional().describe('Praise or feedback someone gave, in their words.'),
    title: z.string().optional().describe('A caption.'),
  })
  .describe('One piece of evidence: give exactly one of url, path or quote.');
type EvidenceArg = z.infer<typeof evidenceArg>;

/** A url or quote as an Evidence input (files are stored separately). */
function linkEvidence(a: EvidenceArg): EvidenceInput {
  if (a.quote) return { kind: 'quote', quote: a.quote, ...(a.title ? { title: a.title } : {}) };
  let u: URL;
  try {
    u = new URL(a.url!);
  } catch {
    throw new ValidationError(`url: ${JSON.stringify(a.url)} isn't a URL`);
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new ValidationError(`url: only http and https links can be evidence, not ${u.protocol}`);
  const pr = GITHUB_PR.exec(u.href);
  if (pr) {
    const [, owner, repo, n] = pr;
    return { kind: 'github_pr', url: `https://github.com/${owner}/${repo}/pull/${n}`, externalKey: `github_pr:${owner}/${repo}#${n}`, ...(a.title ? { title: a.title } : {}) };
  }
  return { kind: 'url', url: u.href, ...(a.title ? { title: a.title } : {}) };
}

function checkOne(a: EvidenceArg, i?: number): 'url' | 'path' | 'quote' {
  const given = (['url', 'path', 'quote'] as const).filter((k) => a[k] !== undefined);
  if (given.length !== 1) throw new ValidationError(`${i === undefined ? '' : `evidence.${i}: `}give exactly one of url, path or quote`);
  return given[0]!;
}

// ---------------------------------------------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------------------------------------------

const isoDate = z.iso.date('a date, YYYY-MM-DD');
const idArg = ulidSchema;
const impactArg = z
  .number()
  .int()
  .min(1)
  .max(10)
  .describe(`How much it mattered, 1-10: ${IMPACT_SCALE.map((l) => `${l.value} ${l.label}`).join(', ')}. Leave it out if unsure.`);
const etag = z.string().optional().describe('The etag you last read. If given, the write fails with a conflict when the file has changed since.');

// ---------------------------------------------------------------------------------------------------------------
// The server
// ---------------------------------------------------------------------------------------------------------------

/**
 * One MCP server instance. The SDK makes one per request (stateless), so this only registers handlers. `client` is the
 * request's X-BragDoc-Client header. Resource subscriptions are offered to 2026-era clients only: they arrive on a
 * `subscriptions/listen` stream, which a 2025-era client served statelessly doesn't have.
 */
export function createMcpServer(ctx: McpContext, era: 'legacy' | 'modern' = 'modern', client?: string | null): McpServer {
  const { store, services } = ctx;
  const server = new McpServer(
    { name: 'bragdoc', title: 'BragDoc', version: ctx.version },
    { instructions: INSTRUCTIONS, ...(era === 'modern' ? { capabilities: { resources: { subscribe: true } } } : {}) },
  );
  const who = (extra: ServerContext) => agentName(client, extra.mcpReq.envelope?.[CLIENT_INFO as keyof typeof extra.mcpReq.envelope] as { name?: unknown } | undefined);
  const written = (a: Achievement) => achievementDetail(store, a);

  /** Store the files among `args` (type-checked) as evidence items; urls and quotes become evidence inputs. */
  async function toEvidence(args: readonly EvidenceArg[]): Promise<EvidenceInput[]> {
    args.forEach((a, i) => checkOne(a, i));
    const out: EvidenceInput[] = [];
    for (const a of args) {
      if (a.path === undefined) out.push(linkEvidence(a));
      else {
        const i = await services.evidence.ingestPath(a.path, { accept: ATTACHABLE });
        out.push({ kind: i.kind, blob: i.sha256, ...(a.title ? { title: a.title } : {}) });
      }
    }
    return out;
  }

  // ---------------- reading ----------------
  server.registerTool(
    'bragdoc_get_context',
    {
      title: 'Read BragDoc context (call before writing)',
      description:
        "Call this before writing to BragDoc (the user's brag document / achievement log). Returns who the user is, their active projects with dates, tracked repos, the last 20 achievements, the 1-10 impact scale, the house style for writing achievements and the rules to follow. Pass repoPath (your working directory) or project to also get what's recorded for that repo or project. Then search for related achievements before adding one, and investigate anything that contradicts what you're about to write.",
      inputSchema: z.strictObject({
        repoPath: z.string().optional().describe('The directory you are working in (your cwd): BragDoc finds the tracked repo checked out there and its projects.'),
        project: z.string().optional().describe('A project id or name to focus on.'),
      }),
      annotations: { readOnlyHint: true },
    },
    run(({ repoPath, project }) => buildContext(store, ctx.config(), { repoPath, project })),
  );

  server.registerTool(
    'bragdoc_search_achievements',
    {
      title: 'Search achievements',
      description:
        "Search the user's achievements (brag document entries) by words and filters, best match first; with no query, the newest first. Use it before adding one, to find a duplicate (the same PR, project or outcome) or something your new entry would contradict.",
      inputSchema: z.strictObject({
        query: z.string().optional().describe('Words to search for in titles, summaries, bodies, evidence titles, quotes and text read from screenshots.'),
        projectId: idArg.optional(),
        repoId: idArg.optional(),
        from: isoDate.optional().describe('Happened on or after (YYYY-MM-DD).'),
        to: isoDate.optional().describe('Happened on or before (YYYY-MM-DD).'),
        source: z.enum(ACHIEVEMENT_SOURCES).optional().describe('Only those that came from here (mcp: written by agents).'),
        includeArchived: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).optional().describe('At most this many (default 20).'),
      }),
      annotations: { readOnlyHint: true },
    },
    run(({ query, projectId, repoId, from, to, source, includeArchived, limit }) => {
      const r = services.achievements.list({ q: query || undefined, projectId, repoId, from, to, source, archived: includeArchived ? 'include' : 'exclude', limit: limit ?? 20 });
      return { total: r.total, achievements: r.items.map((a) => achievementSummary(store, a)) };
    }),
  );

  server.registerTool(
    'bragdoc_get_achievement',
    {
      title: 'One achievement in full',
      description: 'An achievement with its body, every piece of evidence, its file and its etag (pass the etag to bragdoc_update_achievement).',
      inputSchema: z.strictObject({ id: idArg }),
      annotations: { readOnlyHint: true },
    },
    run(({ id }) => ({ achievement: written(services.achievements.get(id)) })),
  );

  // ---------------- writing achievements ----------------
  server.registerTool(
    'bragdoc_add_achievement',
    {
      title: 'Add an achievement',
      description:
        "Log something the user achieved in their BragDoc (brag document): what they shipped, fixed, led or were praised for. Search for related achievements first (bragdoc_search_achievements) and investigate contradictions before writing; if it's already there, update that one instead. Give externalKey for anything with a stable identity (a PR, a commit, a ticket): adding the same key again returns the existing achievement and writes nothing. Goes straight onto the board marked as written by you, unless the user set BragDoc to send agents' achievements to Found for review.",
      inputSchema: z.strictObject({
        title: z.string().trim().min(1).describe('One line, past tense, outcome first.'),
        summary: z.string().optional().describe('A sentence or two: why it mattered, who it helped.'),
        body: z.string().optional().describe('Markdown: context, what was done, what changed.'),
        happenedAt: isoDate.optional().describe('When it shipped or happened (YYYY-MM-DD; default today).'),
        endedAt: isoDate.optional().describe('When it ended, for something that took weeks.'),
        impact: impactArg.optional(),
        projects: z.array(idArg).optional().describe('Project ids (from bragdoc_get_context).'),
        repos: z.array(idArg).optional().describe('Repo ids.'),
        evidence: z.array(evidenceArg).optional().describe('Links, PRs, quotes and files that back it up.'),
        externalKey: z.string().min(1).optional().describe('A stable key for the work, e.g. github_pr:owner/repo#123 or commit:<sha>. Makes this call idempotent.'),
      }),
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    run(async ({ evidence = [], externalKey, ...fields }, extra) => {
      const sourceAgent = who(extra);
      // idempotent on the key before anything is stored
      const keys = [externalKey, ...evidence.map((e) => (e.url && !e.path && !e.quote ? linkEvidence(e).externalKey : undefined))].filter((k): k is string => !!k);
      for (const k of keys) {
        const id = store.achievementIdByKey(k);
        const a = id ? store.get('achievement', id) : undefined;
        if (a) return { created: false, writtenTo: 'board', reason: `an achievement with ${k} is already on the board`, achievement: written(a) };
      }
      if (ctx.config().mcp.writeTo === 'found') {
        evidence.forEach((e, i) => checkOne(e, i));
        // a file stays where it is until the user keeps the candidate (D24): check it now, so a bad one fails here
        for (const e of evidence.filter((e) => e.path !== undefined)) {
          const { mime } = await services.evidence.inspectPath(e.path!);
          if (!ATTACHABLE.mimes.test(mime)) throw new ValidationError(`that file is ${mime}; only ${ATTACHABLE.what} can be added as evidence`);
        }
        const r = services.found.add({
          source: 'mcp',
          sourceAgent,
          externalKey,
          title: fields.title,
          summary: fields.summary,
          body: fields.body,
          happenedAt: fields.happenedAt,
          impact: fields.impact,
          evidence: evidence.filter((e) => e.path === undefined).map(linkEvidence),
          files: evidence.filter((e) => e.path !== undefined).map((e) => ({ path: e.path!, ...(e.title ? { title: e.title } : {}) })),
          suggestedProjects: fields.projects,
          suggestedRepos: fields.repos,
          matchedRules: [`Sent by ${sourceAgent ?? 'an agent'}`],
        });
        return {
          created: r.created,
          writtenTo: 'found',
          note: 'BragDoc is set to send agents\' achievements to Found: the user keeps or dismisses it there.',
          ...(r.reason ? { reason: r.reason } : {}),
          candidate: r.candidate,
        };
      }
      // the ids it names exist, before any file is stored: a refused call leaves nothing behind in evidence/
      requireIds(store, 'project', fields.projects ?? [], 'projects');
      requireIds(store, 'repo', fields.repos ?? [], 'repos');
      const { achievement, created } = services.achievements.create({ ...fields, evidence: await toEvidence(evidence), externalKey, source: 'mcp', sourceAgent });
      return { created, writtenTo: 'board', achievement: written(achievement) };
    }),
  );

  server.registerTool(
    'bragdoc_update_achievement',
    {
      title: 'Update an achievement',
      description:
        'Change an achievement: correct its title, summary, body, dates or impact, retag its projects and repos, or archive it. Only the fields you give change (null clears an optional one; projects and repos replace the whole list). To add evidence use bragdoc_attach_evidence.',
      inputSchema: z.strictObject({
        id: idArg,
        title: z.string().trim().min(1).optional(),
        summary: z.string().nullable().optional(),
        body: z.string().optional(),
        happenedAt: isoDate.optional(),
        endedAt: isoDate.nullable().optional(),
        impact: impactArg.nullable().optional(),
        projects: z.array(idArg).optional(),
        repos: z.array(idArg).optional(),
        archived: z.boolean().optional().describe('true hides it from the board (nothing is deleted).'),
        etag,
      }),
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    run(({ id, etag: tag, ...fields }) => ({ achievement: written(services.achievements.update(id, fields, { ifMatch: tag ?? null })) })),
  );

  server.registerTool(
    'bragdoc_attach_evidence',
    {
      title: 'Attach evidence to an achievement',
      description:
        'Back an existing achievement up: a link, a GitHub pull request URL, a quote (praise in someone\'s words), or a local file by absolute path (an image, PDF, document, text file or video, at most 25 MB; regular files only). Evidence it already has is skipped.',
      inputSchema: z.strictObject({ achievementId: idArg, ...evidenceArg.shape }),
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    run(async ({ achievementId, ...arg }) => {
      // a missing (or unwritable) achievement fails before a file is stored
      services.achievements.get(achievementId);
      const entry = store.entry('achievement', achievementId);
      if (entry?.readOnly || entry?.problems.some((p) => p.severity === 'error' && p.code !== 'dangling'))
        throw new ConflictError(`${entry.file} has a problem (${entry.problems[0]?.message ?? 'from a newer BragDoc'}); fix it by hand first`);
      const [input] = await toEvidence([arg]);
      const { achievement, added } = services.achievements.addEvidence(achievementId, [{ id: ulid(store.now().getTime()), ...input } as Evidence]);
      return { added: added.length ? added : [], alreadyAttached: added.length === 0, achievement: written(achievement) };
    }),
  );

  server.registerTool(
    'bragdoc_add_found',
    {
      title: 'Suggest an achievement for review (Found)',
      description:
        "Suggest something that might be an achievement without putting it on the board: it waits in BragDoc's Found inbox for the user to keep, merge or dismiss. Use it when you're not sure it's worth logging, or when the user asked you to collect candidates. Idempotent on externalKey: a key already in Found (even dismissed) or on the board is never added again.",
      inputSchema: z.strictObject({
        title: z.string().trim().min(1),
        summary: z.string().optional(),
        body: z.string().optional(),
        happenedAt: isoDate.optional(),
        impact: impactArg.optional(),
        why: z.string().optional().describe('Why you think it counts, in a few words (shown on the card).'),
        evidence: z.array(evidenceArg).optional(),
        suggestedProjects: z.array(idArg).optional(),
        suggestedRepos: z.array(idArg).optional(),
        externalKey: z.string().min(1).optional(),
      }),
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    run(async ({ evidence = [], why, ...fields }, extra) => {
      evidence.forEach((e, i) => checkOne(e, i));
      for (const e of evidence.filter((e) => e.path !== undefined)) {
        const { mime } = await services.evidence.inspectPath(e.path!);
        if (!ATTACHABLE.mimes.test(mime)) throw new ValidationError(`that file is ${mime}; only ${ATTACHABLE.what} can be added as evidence`);
      }
      const sourceAgent = who(extra);
      const r = services.found.add({
        ...fields,
        source: 'mcp',
        sourceAgent,
        evidence: evidence.filter((e) => e.path === undefined).map(linkEvidence),
        files: evidence.filter((e) => e.path !== undefined).map((e) => ({ path: e.path!, ...(e.title ? { title: e.title } : {}) })),
        matchedRules: [why ? `${sourceAgent ?? 'An agent'}: ${why}` : `Sent by ${sourceAgent ?? 'an agent'}`],
      });
      return { created: r.created, ...(r.reason ? { reason: r.reason } : {}), ...(r.achievementId ? { achievementId: r.achievementId } : {}), candidate: r.candidate };
    }),
  );

  // ---------------- projects and repos ----------------
  server.registerTool(
    'bragdoc_list_projects',
    {
      title: 'List projects',
      description: "The user's projects (named pieces of work with dates, a colour and optionally a company), with their linked repos and how many achievements each has.",
      inputSchema: z.strictObject({ includeArchived: z.boolean().optional() }),
      annotations: { readOnlyHint: true },
    },
    run(({ includeArchived }) => ({
      projects: services.projects
        .list()
        .filter((p) => includeArchived || p.status !== 'archived')
        .map((p) => projectView(store, p)),
    })),
  );

  server.registerTool(
    'bragdoc_upsert_project',
    {
      title: 'Create or update a project',
      description:
        'Create a project, or change one: by id, else by name (case-insensitive), else a new project. Only the fields you give change. repoIds replaces the linked repos; to link one repo use bragdoc_link_repo.',
      inputSchema: z.strictObject({
        id: idArg.optional().describe('The project to change.'),
        name: z.string().trim().min(1).optional().describe('Its name (required for a new project).'),
        description: z.string().nullable().optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'a colour, #rrggbb').optional().describe('Its tape colour, #rrggbb (default: the next swatch).'),
        start: isoDate.optional().describe('When it started (default today).'),
        end: isoDate.nullable().optional().describe('When it ended; null while ongoing.'),
        status: z.enum(PROJECT_STATUSES).optional(),
        companyId: idArg.nullable().optional(),
        repoIds: z.array(idArg).optional(),
        etag,
      }),
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    run(({ id, etag: tag, ...fields }) => {
      const existing = id ? services.projects.get(id) : fields.name ? findProject(store, fields.name) : undefined;
      if (existing) {
        // found by name: that name is how it was found, not a rename (renaming is by id)
        const patch = id ? fields : { ...fields, name: undefined };
        return { created: false, project: projectView(store, services.projects.update(existing.id, patch, { ifMatch: tag ?? null })) };
      }
      if (!fields.name) throw new ValidationError('name: a new project needs a name');
      const { description, ...rest } = fields;
      return { created: true, project: projectView(store, services.projects.create({ ...rest, ...(description ? { description } : {}) })) };
    }),
  );

  server.registerTool(
    'bragdoc_list_repos',
    {
      title: 'List repos',
      description: 'The code repositories BragDoc knows (local checkouts and remotes), with the projects each is linked to.',
      inputSchema: z.strictObject({ includeUntracked: z.boolean().optional() }),
      annotations: { readOnlyHint: true },
    },
    run(({ includeUntracked }) => ({
      repos: services.repos
        .list()
        .filter((r) => includeUntracked || r.tracked)
        .map((r) => repoView(store, r)),
    })),
  );

  server.registerTool(
    'bragdoc_link_repo',
    {
      title: 'Add a repo and link it to a project',
      description:
        "Make sure BragDoc knows a code repository (by its local checkout path and/or remote URL; one already known by either is reused), and optionally link it to a project so achievements in that repo can be tagged. Pass your working directory's repo root and its git remote.",
      inputSchema: z.strictObject({
        localPath: z.string().optional().describe('The absolute path of the checkout.'),
        remoteUrl: z.string().optional().describe('Its remote, e.g. https://github.com/owner/repo or git@github.com:owner/repo.git.'),
        name: z.string().optional().describe('A short name (default owner/repo, else the folder name).'),
        projectId: idArg.optional().describe('A project to link it to.'),
      }),
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    run(({ localPath, remoteUrl, name, projectId }) => {
      if (localPath !== undefined && !localPath.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(localPath)) throw new ValidationError('localPath: an absolute path');
      if (projectId) services.projects.get(projectId); // fail before adding the repo
      const { repo, created } = services.repos.create({ localPath, remoteUrl, name });
      const project = projectId ? services.projects.linkRepo(projectId, repo.id) : undefined;
      return { created, repo: repoView(store, store.get('repo', repo.id) ?? repo), ...(project ? { project: projectView(store, project) } : {}) };
    }),
  );

  // ---------------- the resource (change notifications: server/mcp/index.ts) ----------------
  server.registerResource(
    'context',
    CONTEXT_URI,
    { title: 'BragDoc context', description: 'What bragdoc_get_context returns: the profile, active projects, repos, recent achievements, the impact scale and the house style.', mimeType: 'application/json' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(buildContext(store, ctx.config())) }] }),
  );

  // ---------------- prompts (slash commands in Claude Code: /bragdoc:log-this, /bragdoc:weekly-recap) ----------------
  server.registerPrompt(
    'log-this',
    {
      title: 'Log this in BragDoc',
      description: 'Record what you just did (or what the user describes) as an achievement in BragDoc.',
      argsSchema: z.object({ what: z.string().optional().describe('What to log, if it isn\'t the work in this conversation.') }),
    },
    ({ what }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              what ? `Log this in my BragDoc: ${what}` : 'Log the work we just did in my BragDoc.',
              '',
              '1. Call bragdoc_get_context with repoPath set to the current working directory.',
              '2. Search for related achievements (bragdoc_search_achievements): the same PR, project or outcome. If it is already recorded, update it or attach evidence instead of adding a duplicate.',
              '3. If anything contradicts what is recorded, look into it (the code, the PR, git log) and tell me before writing.',
              '4. Write it following the house style: an outcome-first title, a short summary of why it mattered, the date it happened, the project and repo, and the PR or commit as evidence with an externalKey. Only include impact if it is clear.',
              '5. Tell me what you wrote, and where (the board or Found).',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'weekly-recap',
    {
      title: 'Weekly recap for BragDoc',
      description: 'Look back over the last week of work, find what is missing from BragDoc, and offer to log it.',
      argsSchema: z.object({ since: z.string().optional().describe('Start date (YYYY-MM-DD); default 7 days ago.') }),
    },
    ({ since }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Help me catch up my BragDoc for the week${since ? ` since ${since}` : ''}.`,
              '',
              '1. Call bragdoc_get_context, then bragdoc_search_achievements with `from` set to the start date to see what is already logged.',
              '2. Look at what I did in that window: git log --author for my repos that BragDoc tracks (and this one), merged PRs if you can see them.',
              '3. List what looks worth logging and is not there yet, one line each, grouped by project, and say which ones you think matter most.',
              '4. Ask me which to log. Then add those (with PRs or commits as evidence and an externalKey each), and tell me what you wrote.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  return server;
}
