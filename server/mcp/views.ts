// What agents read: BragDoc's context (bragdoc_get_context, the bragdoc://context resource, the guide's live facts)
// and the compact views the MCP tools return. Read-only: everything here comes from the store's index.
//
// The house style and the rules are written for an agent that's about to log something on the user's behalf: Ed's
// "read the background first, look for contradictions" (RECOMMENDATIONS §11) is the point of get_context.
import os from 'node:os';
import path from 'node:path';
import { IMPACT_SCALE } from '../../shared/impact.js';
import type { Achievement, Company, Project, Repo } from '../../shared/schema/index.js';
import type { Config } from '../config.js';
import { tildify } from '../paths.js';
import type { Store } from '../store/index.js';
import { today } from '../services/util.js';

/** How achievements should read. Shown by get_context and the agent guide. */
export const HOUSE_STYLE = [
  'Title: one line, past tense, the outcome first ("Cut checkout latency by 40%", not "Worked on performance"). No "I".',
  'Summary: a sentence or two on why it mattered and who it helped. Numbers beat adjectives; say where a number came from.',
  'Body (markdown, optional): the context, what you did, what changed. Link the PR, the doc, the thread.',
  'happenedAt: the day it shipped or happened, not the day you are writing it down. endedAt only for something that took weeks.',
  'One achievement per outcome: several PRs that delivered one thing are one achievement with each PR as evidence.',
  'Impact: pick from the scale below by what changed for other people; leave it out if you are guessing.',
  'Write what the user did, in their words where you have them. Never invent a metric, a quote or a result.',
] as const;

/** What an agent must do before and while writing. Shown by get_context and the agent guide. */
export const RULES = [
  'Call bragdoc_get_context before writing anything (you just did).',
  'Search before adding: bragdoc_search_achievements for the same work (the PR, the project, the same words). If it is already there, update or attach evidence to that one instead of adding a duplicate.',
  'If something you are about to write contradicts what is already recorded (a date, a number, who did it), investigate (read the code, the PR, the git log) and tell the user before writing.',
  'Give an externalKey when the work has a stable identity (github_pr:owner/repo#123, a commit sha, a ticket id), so writing it twice does nothing.',
  'Tag the project and repo when you know them (ids from this context). Link a repo to its project with bragdoc_link_repo if it is not linked yet.',
  'Only the user decides what counts as an achievement. When unsure whether something belongs on the board, use bragdoc_add_found: it waits in Found for them to keep or dismiss.',
] as const;

const expandHome = (p: string) => (p === '~' ? os.homedir() : p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p);

/** The tracked repo whose checkout contains `dir` (the deepest, if they nest), or undefined. */
export function repoForPath(store: Store, dir: string): Repo | undefined {
  const target = path.resolve(expandHome(dir));
  let best: Repo | undefined;
  let bestLen = -1;
  for (const r of store.all('repo')) {
    if (!r.localPath) continue;
    const root = path.resolve(expandHome(r.localPath));
    if ((target === root || target.startsWith(root + path.sep)) && root.length > bestLen) [best, bestLen] = [r, root.length];
  }
  return best;
}

/** A project by id, or by name (case-insensitive). */
export function findProject(store: Store, idOrName: string): Project | undefined {
  const byId = store.get('project', idOrName);
  if (byId) return byId;
  const n = idOrName.trim().toLowerCase();
  return store.all('project').find((p) => p.name.trim().toLowerCase() === n);
}

const names = <T extends { id: string; name: string }>(ids: readonly string[], get: (id: string) => T | undefined) =>
  ids.map((id) => ({ id, name: get(id)?.name ?? null }));

/** An achievement as lists show it: enough to spot a duplicate or a contradiction, without the whole body. */
export function achievementSummary(store: Store, a: Achievement) {
  return {
    id: a.id,
    title: a.title,
    ...(a.summary ? { summary: a.summary } : {}),
    happenedAt: a.happenedAt,
    ...(a.endedAt ? { endedAt: a.endedAt } : {}),
    ...(a.impact ? { impact: a.impact } : {}),
    projects: names(a.projects, (id) => store.get('project', id)),
    repos: names(a.repos, (id) => store.get('repo', id)),
    source: a.source,
    ...(a.sourceAgent ? { sourceAgent: a.sourceAgent } : {}),
    ...(a.externalKey ? { externalKey: a.externalKey } : {}),
    evidence: a.evidence.length,
    ...(a.archived ? { archived: true } : {}),
  };
}

/** An achievement in full, with its file and etag (for update_achievement's optional `etag`). */
export function achievementDetail(store: Store, a: Achievement) {
  const e = store.entry('achievement', a.id);
  return { ...a, file: e?.file ?? null, etag: e?.etag ?? null };
}

export function projectView(store: Store, p: Project) {
  return {
    id: p.id,
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    color: p.color,
    start: p.start,
    end: p.end,
    status: p.status,
    company: p.companyId ? { id: p.companyId, name: store.get('company', p.companyId)?.name ?? null } : null,
    repos: names(p.repoIds, (id) => store.get('repo', id)),
    achievements: store.achievementIdsIn('project', p.id).size,
  };
}

export function repoView(store: Store, r: Repo) {
  return {
    id: r.id,
    name: r.name,
    ...(r.localPath ? { localPath: r.localPath } : {}),
    ...(r.remoteUrl ? { remoteUrl: r.remoteUrl } : {}),
    host: r.host,
    tracked: r.tracked,
    projects: store
      .all('project')
      .filter((p) => p.repoIds.includes(r.id))
      .map((p) => ({ id: p.id, name: p.name })),
  };
}

const companyView = (c: Company) => ({ id: c.id, name: c.name, ...(c.role ? { role: c.role } : {}), ...(c.start ? { start: c.start } : {}), end: c.end });

/** Newest first, as the board orders them. */
const byDateDesc = (a: Achievement, b: Achievement) => (a.happenedAt < b.happenedAt ? 1 : a.happenedAt > b.happenedAt ? -1 : a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

export interface ContextFocus {
  /** A directory the agent is working in: the repo checked out there, and its projects. */
  repoPath?: string;
  /** A project, by id or name. */
  project?: string;
}

/** How many recent achievements the context carries. */
export const RECENT = 20;

/** Everything an agent should know before writing (bragdoc_get_context, bragdoc://context). */
export function buildContext(store: Store, config: Config, focus: ContextFocus = {}) {
  const live = store.all('achievement').filter((a) => !a.archived);
  const recent = [...live].sort(byDateDesc).slice(0, RECENT);
  const profile = store.profile();
  const projects = store.all('project').filter((p) => p.status !== 'archived');
  const active = projects
    .filter((p) => p.status === 'active' || p.status === 'paused')
    .sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : a.name.localeCompare(b.name)));
  const repos = store.all('repo').filter((r) => r.tracked);

  let focused: Record<string, unknown> | undefined;
  if (focus.repoPath || focus.project) {
    const repo = focus.repoPath ? repoForPath(store, focus.repoPath) : undefined;
    const project = focus.project ? findProject(store, focus.project) : undefined;
    const projectIds = new Set([...(project ? [project.id] : []), ...(repo ? store.all('project').filter((p) => p.repoIds.includes(repo.id)).map((p) => p.id) : [])]);
    const inFocus = live.filter((a) => (repo && a.repos.includes(repo.id)) || a.projects.some((p) => projectIds.has(p)));
    focused = {
      ...(focus.repoPath
        ? {
            repoPath: focus.repoPath,
            repo: repo ? repoView(store, repo) : null,
            ...(repo ? {} : { note: 'No tracked repo is checked out there. Add it with bragdoc_link_repo (and link it to a project) so future achievements can be tagged.' }),
          }
        : {}),
      ...(focus.project ? { project: project ? projectView(store, project) : null, ...(project ? {} : { projectNote: `There's no project called ${JSON.stringify(focus.project)}.` }) } : {}),
      projects: [...projectIds].map((id) => store.get('project', id)).filter((p): p is Project => !!p).map((p) => ({ id: p.id, name: p.name })),
      recent: inFocus.sort(byDateDesc).slice(0, RECENT).map((a) => achievementSummary(store, a)),
    };
  }

  return {
    today: today(store),
    profile: profile
      ? {
          name: profile.name,
          ...(profile.role ? { role: profile.role } : {}),
          ...(profile.githubLogin ? { githubLogin: profile.githubLogin } : {}),
          aliases: profile.aliases,
          ...(profile.timezone ? { timezone: profile.timezone } : {}),
        }
      : null,
    ...(profile ? {} : { firstRun: 'The user has not set up their profile yet (BragDoc shows them a welcome). You can still write achievements.' }),
    writesGoTo: config.mcp.writeTo,
    writesGoToMeans:
      config.mcp.writeTo === 'board'
        ? 'bragdoc_add_achievement puts achievements straight on the board, marked as written by you.'
        : 'The user asked to review agents\' achievements first: bragdoc_add_achievement puts them in Found, where the user keeps or dismisses them.',
    counts: {
      achievements: live.length,
      projects: projects.length,
      repos: repos.length,
      foundPending: store.all('found').filter((f) => f.status === 'pending').length,
    },
    ...(focused ? { focus: focused } : {}),
    activeProjects: active.map((p) => projectView(store, p)),
    otherProjects: projects.filter((p) => !active.includes(p)).map((p) => ({ id: p.id, name: p.name, status: p.status, start: p.start, end: p.end })),
    companies: store.all('company').map(companyView),
    repos: repos.map((r) => ({ ...repoView(store, r), ...(r.localPath ? { localPath: tildify(expandHome(r.localPath)) } : {}) })),
    recentAchievements: recent.map((a) => achievementSummary(store, a)),
    impactScale: IMPACT_SCALE.map((l) => `${l.value} ${l.label}: ${l.guidance}`),
    houseStyle: HOUSE_STYLE,
    rules: RULES,
  };
}
