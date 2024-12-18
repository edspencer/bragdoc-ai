'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitHubClient } from '@/lib/github/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check, GitBranch, Lock, Unlock } from 'lucide-react';

interface Repository {
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
}

interface RepositorySelectorProps {
  accessToken: string;
  onRepositorySelect: (repository: Repository) => Promise<void>;
  selectedRepositoryId?: string;
}

export function RepositorySelector({
  accessToken,
  onRepositorySelect,
  selectedRepositoryId,
}: RepositorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const perPage = 30;

  const client = new GitHubClient({ accessToken });
  
  const { data, error, isLoading } = useSWR(
    ['repositories', page],
    () => client.listRepositories(page, perPage)
  );

  const handleSelect = async (repo: Repository) => {
    try {
      await onRepositorySelect(repo);
      setOpen(false);
      toast({
        title: 'Repository connected',
        description: 'We\'ll start syncing your pull requests.',
      });
    } catch (error) {
      toast({
        title: 'Error connecting repository',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <GitBranch className="mr-2 size-4" />
          Connect GitHub Repository
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Connect GitHub Repository</DialogTitle>
          <DialogDescription>
            Select a repository to sync pull requests and generate brags from your work.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-[300px] pr-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center text-sm text-muted-foreground">
                Error loading repositories. Please try again.
              </div>
            ) : (
              <div className="space-y-2">
                {data?.repositories.map((repo) => (
                  <button
                    type="button"
                    key={repo.fullName}
                    onClick={() => handleSelect(repo)}
                    className={cn(
                      'w-full rounded-lg border p-4 text-left hover:bg-accent',
                      repo.fullName === selectedRepositoryId && 'border-primary'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{repo.name}</span>
                        {repo.private ? (
                          <Lock className="size-4 text-muted-foreground" />
                        ) : (
                          <Unlock className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      {repo.fullName === selectedRepositoryId && (
                        <Check className="size-4 text-primary" />
                      )}
                    </div>
                    {repo.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {repo.description}
                      </p>
                    )}
                  </button>
                ))}
                {data?.hasNextPage && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Load more
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
