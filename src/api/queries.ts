// TanStack Query keys and hooks over the API client. Every key starts with the resource's name (`['health']`,
// `['achievements', filters]`, …), so the live-update hook (events.ts) can refresh a whole resource by its first
// segment. Feature PRs add their key and hook here, one block each.
import { QueryClient, useQuery } from '@tanstack/react-query';
import { getHealth, isApiError } from './client.ts';

export const queryKeys = {
  health: ['health'] as const,
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
