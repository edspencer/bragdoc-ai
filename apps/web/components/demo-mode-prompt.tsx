'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

/**
 * Demo Mode Prompt Component
 *
 * Client component that displays a prompt to try demo mode on the login page.
 * Only renders if NEXT_PUBLIC_DEMO_MODE_ENABLED environment variable is set to 'true'.
 *
 * Note: Uses NEXT_PUBLIC_ prefix to make env var available on client side.
 */
export function DemoModePrompt() {
  const demoModeEnabled = process.env.NEXT_PUBLIC_DEMO_MODE_ENABLED === 'true';

  if (!demoModeEnabled) {
    return null;
  }

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-center text-muted-foreground mb-3">
            Want to try BragDoc without signing up?
          </p>
          <Link href="/demo">
            <Button variant="outline" className="w-full">
              Try Demo Mode
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
