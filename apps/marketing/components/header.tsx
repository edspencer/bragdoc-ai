'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTracking } from '@/hooks/use-posthog';
import { loginPath } from '@/lib/utils';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const navLinks = [
  { href: '/get-started', label: 'Get Started' },
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/why-it-matters', label: 'Why It Matters' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/blog', label: 'Blog' },
];

export function Header() {
  const { theme, setTheme } = useTheme();
  const { trackCTAClick } = useTracking();
  const loginUrl = loginPath();

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden size-9"
                >
                  <Menu className="size-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-4 mt-6">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className="text-base text-muted-foreground hover:text-foreground transition-colors py-2"
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                <div className="flex flex-col gap-3 mt-8 pt-6 border-t">
                  <SheetClose asChild>
                    <Button variant="outline" className="w-full" asChild>
                      <a
                        href={loginUrl}
                        onClick={() =>
                          trackCTAClick('mobile-menu', 'Sign In', loginUrl)
                        }
                      >
                        Sign In
                      </a>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button className="w-full" asChild>
                      <a
                        href={loginUrl}
                        onClick={() =>
                          trackCTAClick('mobile-menu', 'Get Started', loginUrl)
                        }
                      >
                        Get Started
                      </a>
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                B
              </div>
              <span className="text-xl font-semibold">BragDoc</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
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
