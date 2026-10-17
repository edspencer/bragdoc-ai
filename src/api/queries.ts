// TanStack Query keys and hooks over the API client. Every key starts with the resource's name (`['health']`,
// `['achievements', filters]`, …), so the live-update hook (events.ts) can refresh a whole resource by its first
// segment. Feature PRs add their key and hook here, one block each.
import { QueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getAchievements, getFoundCount, getHealth, getProblems, getProjects, getRepos, isApiError, type AchievementFilters } from './client.ts';

export const queryKeys = {
  health: ['health'] as const,
  // board (PR7)
  achievements: (filters: AchievementFilters) => ['achievements', filters] as const,
  projects: ['projects'] as const,
  repos: ['repos'] as const,
  problems: ['problems'] as const,
  foundCount: ['found', 'count'] as const,
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

/** The board: pages of whole weeks, newest first (`fetchNextPage` for older weeks). */
export function useAchievements(filters: AchievementFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.achievements(filters),
    queryFn: ({ pageParam, signal }) => getAchievements({ ...filters, ...(pageParam ? { before: pageParam } : {}) }, signal),
    initialPageParam: '' as string,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
  });
}

/** Every project (for pills, pickers and tape colours). */
export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: ({ signal }) => getProjects(signal), select: (r) => r.projects });
}

export function useRepos() {
  return useQuery({ queryKey: queryKeys.repos, queryFn: ({ signal }) => getRepos(signal), select: (r) => r.repos });
}

/** Problems with files in the data home (the board's banner, Settings → Data). */
export function useProblems() {
  return useQuery({ queryKey: queryKeys.problems, queryFn: ({ signal }) => getProblems(signal), select: (r) => r.problems });
}
