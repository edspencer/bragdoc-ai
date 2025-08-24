'use client';

import { Button } from 'components/ui/button';
import { RefreshCw } from 'lucide-react';

interface SyncRepositoryButtonProps {
  repositoryId: string;
}

export function SyncRepositoryButton({
  repositoryId,
}: SyncRepositoryButtonProps) {
  const handleSync = async () => {
    try {
      await fetch('/api/github/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repositoryId }),
      });
    } catch (error) {
      console.error('Failed to sync repository:', error);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleSync}>
      <RefreshCw className="size-4" />
      <span className="sr-only">Sync repository</span>
    </Button>
  );
}
