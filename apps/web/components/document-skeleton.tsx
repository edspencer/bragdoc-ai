'use client';

import type { ArtifactKind } from './artifact';

export const DocumentSkeleton = ({
  artifactKind,
}: {
  artifactKind: ArtifactKind;
}) => {
  // Only text artifact type initially
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="h-12 w-1/2 animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="h-5 w-full animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="h-5 w-full animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="h-5 w-1/3 animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="h-5 w-52 animate-pulse rounded-lg bg-transparent" />
      <div className="h-8 w-52 animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="h-5 w-2/3 animate-pulse rounded-lg bg-muted-foreground/20" />
    </div>
  );
};

export const InlineDocumentSkeleton = () => {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="h-4 w-48 animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="h-4 w-3/4 animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="h-4 w-1/2 animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="h-4 w-64 animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="h-4 w-40 animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="h-4 w-36 animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="h-4 w-64 animate-pulse rounded-lg bg-muted-foreground/20" />
    </div>
  );
};
