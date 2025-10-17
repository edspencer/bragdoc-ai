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
 */
export function DemoModeBanner() {
  const { data: session } = useSession();

  // Only show for demo users
  if (session?.user?.level !== 'demo') {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500 text-amber-950 border-b border-amber-600">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span className="font-medium">
            Demo Mode - Your data will be deleted when you log out
          </span>
        </div>
        <Link
          href="/register"
          className="text-amber-950 underline hover:no-underline font-medium"
        >
          Create account to save your data
        </Link>
      </div>
    </div>
  );
}
