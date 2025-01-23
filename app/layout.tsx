import type { Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';

import { Providers } from '@/components/providers';

import './globals.css';
import './init-jsx-prompt';

export const metadata: Metadata = {
  metadataBase: new URL('https://chat.vercel.ai'),
  title: {
    default: 'bragdoc.ai - Never Forget Your Achievements',
    template: '%s | bragdoc.ai',
  },
  description:
    'bragdoc.ai helps you track your work accomplishments effortlessly. Perfect for performance reviews, resumes, and career growth.',
  authors: [
    {
      name: 'bragdoc.ai team',
    },
  ],
  openGraph: {
    title: 'bragdoc.ai - Never Forget Your Achievements',
    description: 'Track your achievements effortlessly',
    url: 'https://bragdoc.ai',
    siteName: 'bragdoc.ai',
  },
  twitter: {
    title: 'bragdoc.ai - Never Forget Your Achievements',
  },
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="bragdoc.ai RSS Feed (XML)"
          href="https://www.bragdoc.ai/feed"
        />
        <link
          rel="alternate"
          type="application/json"
          title="bragdoc.ai JSON Feed"
          href="https://www.bragdoc.ai/feed?type=json"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <GoogleAnalytics gaId="G-ZM1CT7E42H" />
      </body>
    </html>
  );
}
