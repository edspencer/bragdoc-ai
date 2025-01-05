'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DocumentListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1 flex-1">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="size-8 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
