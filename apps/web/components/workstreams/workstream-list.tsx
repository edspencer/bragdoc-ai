'use client';

import { WorkstreamCard } from './workstream-card';
import { useWorkstreams } from '@/hooks/use-workstreams';
import { Loader2 } from 'lucide-react';

export function WorkstreamList() {
  const { workstreams, isLoading } = useWorkstreams();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (workstreams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No workstreams yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workstreams.map((ws) => (
        <WorkstreamCard key={ws.id} workstream={ws} />
      ))}
    </div>
  );
}
