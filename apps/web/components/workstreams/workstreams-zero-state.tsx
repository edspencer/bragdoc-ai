'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface WorkstreamsZeroStateProps {
  achievementCount: number;
  onGenerate?: () => Promise<void>;
}

export function WorkstreamsZeroState({
  achievementCount,
  onGenerate,
}: WorkstreamsZeroStateProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const canGenerate = achievementCount >= 20;

  const handleGenerate = async () => {
    if (!onGenerate) return;
    setIsGenerating(true);
    try {
      await onGenerate();
    } catch (error) {
      console.error('Failed to generate workstreams:', error);
    } finally {
      setIsGenerating(false);
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
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              You have {achievementCount} achievements ready to analyze
            </p>
            <Button size="lg" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Workstreams'
              )}
            </Button>
          </div>
        ) : (
          <Card className="bg-muted">
            <CardContent className="pt-6 text-center">
              <p className="font-semibold">
                You need at least 20 achievements to generate workstreams
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Current: {achievementCount} / 20
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
