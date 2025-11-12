'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useWorkstreamsActions } from '@/hooks/use-workstreams';
import { useRouter } from 'next/navigation';

interface WorkstreamsZeroStateProps {
  achievementCount: number;
}

export function WorkstreamsZeroState({
  achievementCount,
}: WorkstreamsZeroStateProps) {
  const router = useRouter();
  const [noWorkstreamsFound, setNoWorkstreamsFound] = useState(false);
  const canGenerate = achievementCount >= 20;

  // Use the hook for generation capabilities only (no data fetching needed)
  const { generateWorkstreams, isGenerating, generationStatus } =
    useWorkstreamsActions();

  const handleGenerate = async () => {
    setNoWorkstreamsFound(false);
    try {
      const result = await generateWorkstreams();
      // Check if clustering found no workstreams (full clustering only)
      if (
        result &&
        result.strategy === 'full' &&
        result.workstreamsCreated === 0 &&
        result.outliers > 0
      ) {
        setNoWorkstreamsFound(true);
      } else {
        // Refresh the page to show the new workstreams
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to generate workstreams:', error);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Discover Your Workstreams</h1>
          <p className="text-muted-foreground mt-2">
            Workstreams automatically group related achievements across
            projects, helping you identify patterns and themes in your work.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How it Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold">1. AI Analysis</h3>
              <p className="text-sm text-muted-foreground">
                We use advanced ML to analyze your achievements semantically
              </p>
            </div>
            <div>
              <h3 className="font-semibold">2. Automatic Grouping</h3>
              <p className="text-sm text-muted-foreground">
                Related achievements are clustered into thematic workstreams
              </p>
            </div>
            <div>
              <h3 className="font-semibold">3. Continuous Updates</h3>
              <p className="text-sm text-muted-foreground">
                New achievements are automatically assigned as you add them
              </p>
            </div>
          </CardContent>
        </Card>

        {canGenerate ? (
          <div className="text-center space-y-4">
            {noWorkstreamsFound && (
              <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                <CardContent className="pt-6">
                  <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                    No clear patterns found
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-2">
                    Your achievements are quite diverse! Our AI couldn't
                    identify distinct thematic groups. This might mean:
                  </p>
                  <ul className="text-sm text-yellow-800 dark:text-yellow-200 mt-2 space-y-1 text-left list-disc list-inside">
                    <li>
                      You work across many different areas (which is great!)
                    </li>
                    <li>Your achievements span different technical domains</li>
                    <li>
                      More achievements might help reveal patterns over time
                    </li>
                  </ul>
                </CardContent>
              </Card>
            )}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You have {achievementCount} achievements ready to analyze
              </p>
              <p className="text-xs text-muted-foreground">
                We'll analyze your achievements using AI to identify patterns
                and themes
              </p>
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="mt-4"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {generationStatus || 'Analyzing achievements...'}
                  </>
                ) : noWorkstreamsFound ? (
                  'Try Again'
                ) : (
                  'Generate Workstreams'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Card className="bg-muted">
            <CardContent className="pt-6 text-center">
              <p className="font-semibold">
                You need at least 20 achievements in the last 12 months to
                generate workstreams
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Current: {achievementCount} / 20 (last 12 months)
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  window.location.href = '/achievements';
                }}
              >
                Add More Achievements
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
