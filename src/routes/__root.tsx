// The app shell every page renders inside: the board backdrop (with the lamp glow in the dark theme), the header, the
// page, the mobile tab bar, and the toast host. Welcome (first run) is the one page without the header and tabs, and
// a fresh data home's board sends you there.
// Pages are files in src/routes/ (TanStack Router file routes, tsr.config.json).
import type { QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet, createRootRouteWithContext, useNavigate, useRouterState } from '@tanstack/react-router';
import { useServerEvents } from '../api/events.ts';
import { useWelcome } from '../api/queries.ts';
import { WELCOME_LEFT } from '../onboarding/steps.ts';
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
  const path = useRouterState({ select: (s) => s.location.pathname });
  const bare = path === '/welcome';
  // First run (SPEC R10): no profile.yaml and Welcome not skipped → the board sends you to Welcome. Only the board
  // does (a link to Settings or Folio opens what it says), and never again in a tab where you left Welcome.
  const welcome = useWelcome();
  const navigate = useNavigate();
  const sendToWelcome = path === '/' && !!welcome.data?.firstRun && sessionStorage.getItem(WELCOME_LEFT) !== '1';
  useEffect(() => {
    if (sendToWelcome) void navigate({ to: '/welcome', replace: true });
  }, [sendToWelcome, navigate]);
  // on the board, wait for the answer rather than flash the board on the way to Welcome (an error shows the board)
  const holding = sendToWelcome || (path === '/' && welcome.isPending);
  return (
    <ToastProvider>
      <div className="relative min-h-screen text-ink">
        <div aria-hidden className="sb-backdrop" />
        <div className="relative z-[1]">
          {holding ? null : bare ? (
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
