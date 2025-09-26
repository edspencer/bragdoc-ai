'use client';

import Link from 'next/link';
import { Trophy, Building2, FolderKanban, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { useNavCounts } from 'hooks/use-nav-counts';
import { Skeleton } from 'components/ui/skeleton';

interface StatsGridProps {
  userId: string;
}

const statCards = [
  {
    title: 'Achievements',
    icon: Trophy,
    href: '/achievements',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  {
    title: 'Companies',
    icon: Building2,
    href: '/companies',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Projects',
    icon: FolderKanban,
    href: '/projects',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
];

export function StatsGrid({ userId }: StatsGridProps) {
  const { counts, isLoading } = useNavCounts();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded" />
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
    count: counts[stat.title.toLowerCase() as keyof typeof counts] || 0,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statsWithCounts.map((stat) => {
        const Icon = stat.icon;

        return (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.count}</div>
                <p className="text-xs text-muted-foreground">
                  View all {stat.title.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
