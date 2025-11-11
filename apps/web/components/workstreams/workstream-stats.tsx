'use client';

import { Workflow, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface WorkstreamStatsProps {
  workstreamCount: number;
  unassignedCount: number;
  isLoading?: boolean;
}

const statCards = [
  {
    title: 'Active Workstreams',
    icon: Workflow,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    key: 'workstreams',
  },
  {
    title: 'Unassigned',
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    key: 'unassigned',
  },
];

export function WorkstreamStats({
  workstreamCount,
  unassignedCount,
  isLoading,
}: WorkstreamStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statCards.map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="size-8 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsWithCounts = statCards.map((stat) => ({
    ...stat,
    count: stat.key === 'workstreams' ? workstreamCount : unassignedCount,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {statsWithCounts.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded ${stat.bgColor}`}>
                <Icon className={`size-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.count}</div>
              <p className="text-xs text-muted-foreground">
                {stat.key === 'workstreams'
                  ? 'Thematic patterns'
                  : 'Achievements to assign'}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
