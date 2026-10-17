// The app shell every page renders inside. PR4 replaces this placeholder with the Scrapbook header, pill nav, theme
// toggle and mobile tabs; pages are files in src/routes/ (TanStack Router file routes, tsr.config.json).
import type { QueryClient } from '@tanstack/react-query';
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Shell,
  notFoundComponent: NotFound,
});

function Shell() {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 dark:bg-stone-900 dark:text-stone-100">
      <header className="flex items-center gap-3 border-b border-stone-300 px-6 py-4 dark:border-stone-700">
        <Link to="/" className="text-xl font-bold tracking-tight">
          BragDoc
        </Link>
        <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">v0.1 in progress</span>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div data-testid="not-found">
      <h1 className="text-2xl font-semibold">Nothing here</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        There's no page at this address.{' '}
        <Link to="/" className="underline">
          Back to the start
        </Link>
        .
      </p>
    </div>
  );
}
