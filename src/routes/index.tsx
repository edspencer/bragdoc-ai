import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { HealthResponse } from '../../shared/api.ts';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  // A placeholder until PR4's typed API client: proves the shell talks to the server.
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthResponse> => {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`health check failed: ${res.status}`);
      return res.json();
    },
  });
  return (
    <div data-testid="placeholder-shell">
      <h1 className="text-3xl font-semibold">BragDoc Local</h1>
      <p className="mt-3 text-stone-600 dark:text-stone-400">
        A local-first tracker for the things you've done at work. This is the empty skeleton of v0.1: the board, Found,
        projects and Folio arrive in the next pull requests.
      </p>
      <p className="mt-6 font-mono text-sm" data-testid="server-status">
        {health.isPending ? 'Checking the server…' : health.isError ? 'The server is not answering.' : `Server OK, version ${health.data.version}`}
      </p>
    </div>
  );
}
