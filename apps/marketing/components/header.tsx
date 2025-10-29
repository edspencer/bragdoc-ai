'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTracking } from '@/hooks/use-posthog';
import { loginPath } from '@/lib/utils';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { trackCTAClick } = useTracking();
  const loginUrl = loginPath();

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              B
            </div>
            <span className="text-xl font-semibold">BragDoc</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/get-started"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/why-it-matters"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Why It Matters
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/blog"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Blog
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="size-9"
            >
              <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex bg-transparent"
              asChild
            >
              <a
                href={loginUrl}
                onClick={() => trackCTAClick('navbar', 'Sign In', loginUrl)}
              >
                Sign In
              </a>
            </Button>
            <Button size="sm" asChild>
              <a
                href={loginUrl}
                onClick={() => trackCTAClick('navbar', 'Get Started', loginUrl)}
              >
                Get Started
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
