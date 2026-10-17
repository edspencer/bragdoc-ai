import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
// The Scrapbook fonts, self-hosted: Vite bundles the font files into dist/web/assets, so nothing is fetched from a
// font CDN (the CSP's font-src is 'self'). Body: Instrument Sans; headings: Bricolage Grotesque; handwriting: Caveat;
// code: Geist Mono.
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import '@fontsource/caveat/500.css';
import { createQueryClient } from './api/queries.ts';
import { routeTree } from './routeTree.gen.ts';
import { ThemeProvider } from './theme/theme.tsx';
import './styles.css';

const queryClient = createQueryClient();
const router = createRouter({ routeTree, context: { queryClient }, defaultPreload: 'intent', scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
