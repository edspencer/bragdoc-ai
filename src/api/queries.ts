// TanStack Query keys and hooks over the API client. Every key starts with the resource's name (`['health']`,
// `['achievements', filters]`, …), so the live-update hook (events.ts) can refresh a whole resource by its first
// segment. Feature PRs add their key and hook here, one block each.
import { QueryClient, keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { FoundSourceName } from '../../shared/api.ts';
import { getDiscoverSuggestions, getExample, getProfile, getWelcome, getAchievements, getBackups, getCompanies, getFolio, getFound, getFoundCount, getGhInstalled, getSources, getHealth, getMcpToken, getMeta, getNetworkLog, getProblems, getProjectSummary, getProjects, getRepos, getSettings, isApiError, type AchievementFilters } from './client.ts';

export const queryKeys = {
  health: ['health'] as const,
  projects: ['projects'] as const,
  /** under 'projects', so a project change refreshes every open summary too */
  projectSummary: (id: string) => ['projects', id, 'summary'] as const,
  companies: ['companies'] as const,
  repos: ['repos'] as const,
  // board (PR7)
  achievements: (filters: AchievementFilters) => ['achievements', filters] as const,
  problems: ['problems'] as const,
  foundCount: ['found', 'count'] as const,
  // Found + sources (PR13)
  found: (source?: string) => ['found', 'list', source ?? 'all'] as const,
  sources: ['sources'] as const,
  ghInstalled: ['sources', 'gh'] as const,
  // settings (PR10)
  meta: ['meta'] as const,
  networkLog: ['network-log'] as const,
  backups: ['backups'] as const,
  settings: ['settings'] as const,
  mcpToken: ['mcp-token'] as const,
  // Folio (PR14)
  folio: (from: string, to: string) => ['folio', from, to] as const,
  // onboarding (PR16)
  welcome: ['welcome'] as const,
  profile: ['profile'] as const,
  discoverSuggestions: ['discover', 'suggestions'] as const,
  example: ['example'] as const,
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // It's a local server: a 4xx won't fix itself, so don't retry it. A network error might be a restart.
        retry: (count, e) => count < 2 && !(isApiError(e) && e.status >= 400 && e.status < 500),
        // Live updates (events.ts) refresh what changed; refetching on every focus would only add noise.
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * How many candidates are waiting in Found, for the nav badge and the board's strip; undefined while unknown, or if
 * the count can't be had (nothing is shown then).
 */
export function useFoundCount(): number | undefined {
  return useQuery({ queryKey: queryKeys.foundCount, queryFn: ({ signal }) => getFoundCount(signal), select: (r) => r.pending, retry: false }).data;
}

export function useHealth() {
  // a health check should say so at once, not after retries with backoff
  return useQuery({ queryKey: queryKeys.health, queryFn: ({ signal }) => getHealth(signal), retry: false });
}

// settings (PR10)

export function useMeta() {
  return useQuery({ queryKey: queryKeys.meta, queryFn: ({ signal }) => getMeta(signal) });
}

/** How many log entries one page of the Network receipt holds. */
export const NETWORK_PAGE = 100;

/**
 * The network log, a page at a time, newest first. Offsets count from the newest entry, so new requests shift every
 * page: a `network` event refetches all the loaded pages together (TanStack refetches infinite pages in order), which
 * keeps them consistent. `total` is what the server last said.
 */
export function useNetworkLog() {
  return useInfiniteQuery({
    queryKey: queryKeys.networkLog,
    queryFn: ({ pageParam, signal }) => getNetworkLog(pageParam, NETWORK_PAGE, signal),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.entries.length, 0);
      return loaded < last.total && last.entries.length > 0 ? loaded : undefined;
    },
  });
}

export function useBackups() {
  return useQuery({ queryKey: queryKeys.backups, queryFn: ({ signal }) => getBackups(signal) });
}

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: ({ signal }) => getSettings(signal) });
}

/** The MCP token (Settings → Sources fetches it with the page, shown masked, so Copy works in one click). */
export function useMcpToken(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.mcpToken, queryFn: ({ signal }) => getMcpToken(signal), enabled, staleTime: Infinity });
}

// ---------------------------------------------------------------- projects, companies, repos (PR8)

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: ({ signal }) => getProjects(signal) });
}

export function useProjectSummary(id: string | undefined) {
  return useQuery({ queryKey: queryKeys.projectSummary(id ?? ''), queryFn: ({ signal }) => getProjectSummary(id!, signal), enabled: !!id });
}

export function useCompanies() {
  return useQuery({ queryKey: queryKeys.companies, queryFn: ({ signal }) => getCompanies(signal) });
}

export function useRepos() {
  return useQuery({ queryKey: queryKeys.repos, queryFn: ({ signal }) => getRepos(signal) });
}

// ---------------------------------------------------------------- board (PR7)

/** The board: pages of whole weeks, newest first (`fetchNextPage` for older weeks). */
export function useAchievements(filters: AchievementFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.achievements(filters),
    queryFn: ({ pageParam, signal }) => getAchievements({ ...filters, ...(pageParam ? { before: pageParam } : {}) }, signal),
    initialPageParam: '' as string,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
  });
}

/** Problems with files in the data home (the board's banner, Settings → Data). */
export function useProblems() {
  return useQuery({ queryKey: queryKeys.problems, queryFn: ({ signal }) => getProblems(signal), select: (r) => r.problems });
}

// ---------------------------------------------------------------- Folio (PR14)

/** A window's clippings. The previous window's stay on screen while a new one loads, so the page doesn't flash empty. */
export function useFolio(from: string, to: string) {
  return useQuery({ queryKey: queryKeys.folio(from, to), queryFn: ({ signal }) => getFolio(from, to, signal), placeholderData: keepPreviousData });
}

// Found + sources (PR13)

/** Found's pending candidates (one source's, or all), with every source's count for the filter row. */
export function useFound(source?: FoundSourceName) {
  return useQuery({ queryKey: queryKeys.found(source), queryFn: ({ signal }) => getFound(source, signal), placeholderData: (prev) => prev });
}

export function useSources() {
  return useQuery({ queryKey: queryKeys.sources, queryFn: ({ signal }) => getSources(signal) });
}

/** Is gh on PATH? (A look at the file system, nothing runs.) */
export function useGhInstalled(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.ghInstalled, queryFn: ({ signal }) => getGhInstalled(signal), enabled, select: (r) => r.installed });
}

// onboarding (PR16)

/** Should Welcome open? (no profile.yaml and not skipped) */
export function useWelcome() {
  // the board waits for this (so it doesn't flash on the way to Welcome): answer at once if the server is down
  return useQuery({ queryKey: queryKeys.welcome, queryFn: ({ signal }) => getWelcome(signal), retry: false });
}

export function useProfile() {
  return useQuery({ queryKey: queryKeys.profile, queryFn: ({ signal }) => getProfile(signal) });
}

/** The usual code folders that exist here, and the hint sources there are (a look at names; nothing is read). */
export function useDiscoverSuggestions() {
  return useQuery({ queryKey: queryKeys.discoverSuggestions, queryFn: ({ signal }) => getDiscoverSuggestions(signal), staleTime: 60_000 });
}

/** Is there example data, and how much. */
export function useExample() {
  return useQuery({ queryKey: queryKeys.example, queryFn: ({ signal }) => getExample(signal) });
}
