// The app shell every page renders inside: the board backdrop (with the lamp glow in the dark theme), the header, the
// page, the mobile tab bar, and the toast host. Welcome (first run) is the one page without the header and tabs.
// Pages are files in src/routes/ (TanStack Router file routes, tsr.config.json).
import type { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext, useRouterState } from '@tanstack/react-router';
import { useServerEvents } from '../api/events.ts';
import { LinkBtn, PageTitle, ToastProvider } from '../kit/index.ts';
import { Header, MobileTabs } from '../shell/Header.tsx';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Shell,
  notFoundComponent: NotFound,
});

/** The server's `GET /api/events` (PR2) drives refetches. See src/api/events.ts. */
const LIVE_UPDATES = true;

function Shell() {
  useServerEvents({ enabled: LIVE_UPDATES });
  const bare = useRouterState({ select: (s) => s.location.pathname === '/welcome' });
  return (
    <ToastProvider>
      <div className="relative min-h-screen text-ink">
        <div aria-hidden className="sb-backdrop" />
        <div className="relative z-[1]">
          {bare ? (
            <Outlet />
          ) : (
            <>
              <a href="#main" className="sr-only rounded-full bg-ink px-4 py-2 text-bg focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50">
                Skip to the page
              </a>
              <Header />
              <main id="main" tabIndex={-1} className="mx-auto max-w-[1240px] px-4 pb-32 outline-none sm:px-6">
                <Outlet />
              </main>
              <MobileTabs />
            </>
          )}
        </div>
      </div>
    </ToastProvider>
  );
}

function NotFound() {
  return (
    <div data-testid="not-found">
      <PageTitle hand="hm." sub="There's nothing pinned at this address. It may have moved, or the link is wrong.">
        Nothing here
      </PageTitle>
      <LinkBtn to="/" kind="accent" className="mt-6">
        Back to the board
      </LinkBtn>
    </div>
  );
}
