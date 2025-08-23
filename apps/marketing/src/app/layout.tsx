import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://bragdoc.ai'),
  title: {
    default: 'BragDoc - Never Forget Your Professional Achievements',
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
    title: 'BragDoc - Never Forget Your Professional Achievements',
    description: 'Track your achievements effortlessly. Perfect for performance reviews and career growth.',
    url: 'https://bragdoc.ai',
    siteName: 'BragDoc',
  },
  twitter: {
    title: 'BragDoc - Never Forget Your Professional Achievements',
    description: 'Track your achievements effortlessly',
  },
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
