import type { Metadata } from 'next';

import { Providers } from 'components/providers';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://app.bragdoc.ai'),
  title: {
    default: 'BragDoc - Your Work Deserves to Be Remembered',
    template: '%s | BragDoc',
  },
  description:
    'Track your work accomplishments effortlessly with BragDoc. Perfect for performance reviews, resumes, and career growth.',
  authors: [
    {
      name: 'BragDoc team',
    },
  ],
  openGraph: {
    title: 'BragDoc - Your Work Deserves to Be Remembered',
    description: 'Track your achievements effortlessly',
    url: 'https://app.bragdoc.ai',
    siteName: 'BragDoc',
  },
  twitter: {
    title: 'BragDoc - Your Work Deserves to Be Remembered',
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
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
