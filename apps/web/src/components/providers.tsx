'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { SWRConfig } from 'swr';

const fetcher = async (url: string) => {
  // Only fetch if it's an API route
  if (!url.startsWith('/api/')) {
    return null;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return res.json();
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SWRConfig value={{ fetcher }}>
          <Toaster position="top-center" />
          {children}
        </SWRConfig>
      </ThemeProvider>
    </SessionProvider>
  );
}
