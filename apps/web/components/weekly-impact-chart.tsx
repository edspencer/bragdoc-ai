'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  format,
  startOfWeek,
  startOfMonth,
  isSameWeek,
  isSameMonth,
} from 'date-fns';

import { useIsMobile } from '@/hooks/use-mobile';
import type { AchievementWithRelations } from '@/lib/types/achievement';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Dynamic chart config will be computed from projects

interface WeeklyImpactChartProps {
  achievements: AchievementWithRelations[];
}

export function WeeklyImpactChart({ achievements }: WeeklyImpactChartProps) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState('all');

  // Get unique projects with colors
  const projectsWithColors = React.useMemo(() => {
    const uniqueProjects = new Map<
      string,
      { id: string; name: string; color: string }
    >();

    achievements.forEach((achievement) => {
      if (achievement.project) {
        const projectId = achievement.project.id;
        if (!uniqueProjects.has(projectId)) {
          uniqueProjects.set(projectId, {
            id: projectId,
            name: achievement.project.name,
            color: achievement.project.color || 'var(--primary)',
          });
        }
      }
    });

    return Array.from(uniqueProjects.values());
  }, [achievements]);

  // Build dynamic chart config from projects
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};

    projectsWithColors.forEach((project) => {
      config[project.id] = {
        label: project.name,
        color: project.color,
      };
    });

    return config;
  }, [projectsWithColors]);

  // Compute time-based data from achievements, grouped by project
  const chartData = React.useMemo(() => {
    const result = [];

    if (timeRange === 'all') {
      // All time: group by month since earliest achievement
      const earliestDate = achievements.reduce(
        (earliest, achievement) => {
          if (!achievement.eventStart) return earliest;
          const eventDate = new Date(achievement.eventStart);
          return !earliest || eventDate < earliest ? eventDate : earliest;
        },
        null as Date | null,
      );

      if (!earliestDate) return [];

      const now = new Date();
      const startMonth = startOfMonth(earliestDate);
      const currentMonth = startOfMonth(now);

      // Calculate number of months between start and now
      const monthsDiff =
        (currentMonth.getFullYear() - startMonth.getFullYear()) * 12 +
        (currentMonth.getMonth() - startMonth.getMonth());

      for (let i = 0; i <= monthsDiff; i++) {
        const monthStart = new Date(startMonth);
        monthStart.setMonth(monthStart.getMonth() + i);

        const monthAchievements = achievements.filter((achievement) => {
          if (!achievement.eventStart) return false;
          return isSameMonth(new Date(achievement.eventStart), monthStart);
        });

        const periodData: Record<string, number | string> = {
          week: format(monthStart, 'MMM yy'),
        };

        // Group by project
        const projectImpacts = new Map<string, number>();

        monthAchievements.forEach((achievement) => {
          const projectId = achievement.project?.id || 'no-project';
          const currentImpact = projectImpacts.get(projectId) || 0;
          projectImpacts.set(
            projectId,
            currentImpact + (achievement.impact || 0),
          );
        });

        // Add each project's impact to the period data
        projectImpacts.forEach((impact, projectId) => {
          periodData[projectId] = impact;
        });

        result.push(periodData);
      }
    } else if (timeRange === '12m') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        const monthStartOfMonth = startOfMonth(monthStart);

        const monthAchievements = achievements.filter((achievement) => {
          if (!achievement.eventStart) return false;
          return isSameMonth(
            new Date(achievement.eventStart),
            monthStartOfMonth,
          );
        });

        const periodData: Record<string, number | string> = {
          week: format(monthStartOfMonth, 'MMM yy'),
        };

        // Group by project
        const projectImpacts = new Map<string, number>();

        monthAchievements.forEach((achievement) => {
          const projectId = achievement.project?.id || 'no-project';
          const currentImpact = projectImpacts.get(projectId) || 0;
          projectImpacts.set(
            projectId,
            currentImpact + (achievement.impact || 0),
          );
        });

        // Add each project's impact to the period data
        projectImpacts.forEach((impact, projectId) => {
          periodData[projectId] = impact;
        });

        result.push(periodData);
      }
    } else {
      // Last 12 weeks
      const weeks = 12;

      for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - i * 7);
        const weekStartOfWeek = startOfWeek(weekStart, { weekStartsOn: 1 }); // Monday start

        const weekAchievements = achievements.filter((achievement) => {
          if (!achievement.eventStart) return false;
          return isSameWeek(new Date(achievement.eventStart), weekStartOfWeek, {
            weekStartsOn: 1,
          });
        });

        const periodData: Record<string, number | string> = {
          week: format(weekStartOfWeek, 'MMM d'),
        };

        // Group by project
        const projectImpacts = new Map<string, number>();

        weekAchievements.forEach((achievement) => {
          const projectId = achievement.project?.id || 'no-project';
          const currentImpact = projectImpacts.get(projectId) || 0;
          projectImpacts.set(
            projectId,
            currentImpact + (achievement.impact || 0),
          );
        });

        // Add each project's impact to the period data
        projectImpacts.forEach((impact, projectId) => {
          periodData[projectId] = impact;
        });

        result.push(periodData);
      }
    }

    return result;
  }, [achievements, timeRange]);

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange('12w');
    }
  }, [isMobile]);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Weekly Impact Trend</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Impact points earned over time
          </span>
          <span className="@[540px]/card:hidden">Weekly impact points</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="12w">3 months</ToggleGroupItem>
            <ToggleGroupItem value="12m">1 year</ToggleGroupItem>
            <ToggleGroupItem value="all">All time</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              // size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="12 weeks" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="12w" className="rounded-lg">
                3 months
              </SelectItem>
              <SelectItem value="12m" className="rounded-lg">
                1 year
              </SelectItem>
              <SelectItem value="all" className="rounded-lg">
                All time
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
              content={
                <ChartTooltipContent labelFormatter={(value) => `${value}`} />
              }
            />
            {projectsWithColors.map((project, index) => (
              <Bar
                key={project.id}
                dataKey={project.id}
                fill={project.color}
                stackId="impact"
                radius={
                  index === projectsWithColors.length - 1
                    ? [4, 4, 0, 0]
                    : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
