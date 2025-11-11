'use client';

import { Workflow, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Stat } from '@/components/shared/stat';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface WorkstreamStatsProps {
  workstreamCount: number;
  assignedCount: number;
  unassignedCount: number;
  isLoading?: boolean;
}

const statCards = [
  {
    label: 'Active Workstreams',
    icon: Workflow,
    color: 'text-purple-600',
    description: 'Thematic patterns',
    key: 'workstreams',
  },
  {
    label: 'Assigned',
    icon: CheckCircle2,
    color: 'text-green-600',
    description: 'In workstreams',
    key: 'assigned',
  },
  {
    label: 'Unassigned',
    icon: AlertCircle,
    color: 'text-orange-600',
    description: 'Achievements to assign',
    key: 'unassigned',
  },
];

export function WorkstreamStats({
  workstreamCount,
  assignedCount,
  unassignedCount,
  isLoading,
}: WorkstreamStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

  const statsWithCounts = statCards.map((stat) => {
    let count = 0;
    if (stat.key === 'workstreams') {
      count = workstreamCount;
    } else if (stat.key === 'assigned') {
      count = assignedCount;
    } else if (stat.key === 'unassigned') {
      count = unassignedCount;
    }
    return { ...stat, count };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statsWithCounts.map((stat) => {
        const Icon = stat.icon;

        return (
          <Stat
            key={stat.label}
            label={stat.label}
            value={stat.count}
            badge={{
              icon: <Icon className={`size-3 ${stat.color}`} />,
              label: stat.description,
            }}
          />
        );
      })}
    </div>
  );
}
