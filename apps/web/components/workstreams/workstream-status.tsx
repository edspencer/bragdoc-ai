'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkstreams } from '@/hooks/use-workstreams';
import { Loader2 } from 'lucide-react';

export function WorkstreamStatus() {
  const {
    workstreams,
    unassignedCount,
    achievementCount,
    isLoading,
    generateWorkstreams,
    isGenerating,
  } = useWorkstreams();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const canGenerate = achievementCount >= 20;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workstreams</CardTitle>
      </CardHeader>
      <CardContent>
        {!canGenerate ? (
          <div className="text-sm text-muted-foreground">
            <p>You have {achievementCount} achievements.</p>
            <p>
              Log at least 20 achievements to use automatic workstream
              generation.
            </p>
          </div>
        ) : workstreams.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Discover themes and patterns in your {achievementCount}{' '}
              achievements.
            </p>
            <Button onClick={generateWorkstreams} disabled={isGenerating}>
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{workstreams.length}</p>
                <p className="text-sm text-muted-foreground">
                  Active workstreams
                </p>
              </div>
              {unassignedCount > 0 && (
                <div>
                  <p className="text-2xl font-bold">{unassignedCount}</p>
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                </div>
              )}
            </div>

            {unassignedCount > 0 && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm">
                  You have {unassignedCount} new achievements not assigned to
                  workstreams.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={generateWorkstreams}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Workstreams'
                  )}
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.href = '/workstreams';
              }}
            >
              View All Workstreams
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
