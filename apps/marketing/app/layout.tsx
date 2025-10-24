import type React from 'react';
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { PHProvider } from '@/components/posthog-provider';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.bragdoc.ai'),
  title: "BragDoc - Never Forget What You've Accomplished",
  description:
    'Automatically track your work achievements from git commits. Always be ready for standups, 1-on-1s, and performance reviews.',
  generator: 'v0.app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PHProvider>{children}</PHProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
