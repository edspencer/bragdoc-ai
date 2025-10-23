'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

/**
 * Demo Mode Banner Component
 *
 * Displays a full-width sticky banner at the top of the page for demo users.
 * Warns that data will be deleted on logout and provides link to create real account.
 *
 * Only shown when the logged-in user has level='demo'.
 * Can be suppressed with NEXT_PUBLIC_SUPRESSED_DEMO_BANNER=true (useful for screenshots).
 */
export function DemoModeBanner() {
  const { data: session } = useSession();

  // Check if banner should be suppressed (for screenshots, etc.)
  const isSuppressed = process.env.NEXT_PUBLIC_SUPRESSED_DEMO_BANNER === 'true';

  // Only show for demo users and if not suppressed
  if (session?.user?.level !== 'demo' || isSuppressed) {
    return null;
  }

  return (
    <div className="fixed top-0 inset-x-0 z-50 h-[40px] bg-amber-500 text-amber-950 border-b border-amber-600">
      <div className="container mx-auto px-4 py-2 flex items-center justify-center text-sm h-full">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-4" />
          <span className="font-medium">
            Demo Mode - Your data will be deleted when you log out
          </span>
          <span className="text-amber-900">|</span>
          <Link
            href="/register"
            className="text-amber-950 underline hover:no-underline font-medium"
          >
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
}
