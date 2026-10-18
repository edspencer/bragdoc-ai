// TanStack Query keys and hooks over the API client. Every key starts with the resource's name (`['health']`,
// `['achievements', filters]`, …), so the live-update hook (events.ts) can refresh a whole resource by its first
// segment. Feature PRs add their key and hook here, one block each.
import { QueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getBackups, getCompanies, getHealth, getMcpToken, getMeta, getNetworkLog, getProblems, getProjectSummary, getProjects, getRepos, getSettings, isApiError } from './client.ts';

export const queryKeys = {
  health: ['health'] as const,
  projects: ['projects'] as const,
  /** under 'projects', so a project change refreshes every open summary too */
  projectSummary: (id: string) => ['projects', id, 'summary'] as const,
  companies: ['companies'] as const,
  repos: ['repos'] as const,
  // settings (PR10)
  meta: ['meta'] as const,
  networkLog: ['network-log'] as const,
  problems: ['problems'] as const,
  backups: ['backups'] as const,
  settings: ['settings'] as const,
  mcpToken: ['mcp-token'] as const,
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
 * How many candidates are waiting in Found, for the nav badge; undefined while unknown. A stub until Found's API
 * exists (PR13), which replaces the body with a query and adds its key above.
 */
export function useFoundCount(): number | undefined {
  return undefined;
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

export function useProblems() {
  return useQuery({ queryKey: queryKeys.problems, queryFn: ({ signal }) => getProblems(signal) });
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
