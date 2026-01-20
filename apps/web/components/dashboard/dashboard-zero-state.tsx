'use client';

/**
 * @deprecated This component is deprecated in favor of the new GettingStartedBanner approach.
 * The dashboard now always displays content with a dismissible banner at the top for onboarding.
 * See `apps/web/components/dashboard/getting-started-banner.tsx` for the new implementation.
 *
 * This file is kept for reference but is no longer used in the dashboard page.
 * Consider removing in a future cleanup.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CliInstructions } from '@/components/shared/cli-instructions';

export function DashboardZeroState() {
  const [isChecking, setIsChecking] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const router = useRouter();

  const handleCheckForAchievements = async () => {
    setIsChecking(true);
    setShowFeedback(false);

    // Refresh the page to re-fetch data from the server
    router.refresh();

    // Show feedback after a brief delay if still on zero state
    // Note: If achievements were added, the component will unmount during
    // the refresh, so this timeout won't fire. The timeout only completes
    // if we're still in the zero state (no achievements found).
    setTimeout(() => {
      setShowFeedback(true);
      setIsChecking(false);
    }, 1000);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to BragDoc!</h1>
          <p className="text-lg text-muted-foreground">
            Let&apos;s get started by extracting achievements from your Git
            repositories
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <CliInstructions />
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-2">
          <Button
            size="lg"
            onClick={handleCheckForAchievements}
            disabled={isChecking}
          >
            {isChecking
              ? 'Checking...'
              : "I've run the CLI - Check for achievements"}
          </Button>

          {showFeedback && (
            <p className="text-sm text-muted-foreground text-center">
              No achievements yet. Did you run{' '}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                bragdoc extract
              </code>
              ?
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
