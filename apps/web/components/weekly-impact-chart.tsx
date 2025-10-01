'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { format, startOfWeek, isSameWeek } from 'date-fns';

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

const chartConfig = {
  impact: {
    label: 'Impact Points',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

interface WeeklyImpactChartProps {
  achievements: AchievementWithRelations[];
}

export function WeeklyImpactChart({ achievements }: WeeklyImpactChartProps) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState('8w');

  // Compute weekly data from achievements
  const chartData = React.useMemo(() => {
    const weeks = timeRange === '6w' ? 6 : timeRange === '8w' ? 8 : 12;
    const result = [];

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

      const totalImpact = weekAchievements.reduce(
        (sum, a) => sum + (a.impact || 0),
        0,
      );

      result.push({
        week: format(weekStartOfWeek, 'MMM d'),
        impact: totalImpact,
        achievements: weekAchievements.length,
      });
    }

    return result;
  }, [achievements, timeRange]);

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange('6w');
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
            <ToggleGroupItem value="12w">Last 12 weeks</ToggleGroupItem>
            <ToggleGroupItem value="8w">Last 8 weeks</ToggleGroupItem>
            <ToggleGroupItem value="6w">Last 6 weeks</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              // size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 12 weeks" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="12w" className="rounded-lg">
                Last 12 weeks
              </SelectItem>
              <SelectItem value="8w" className="rounded-lg">
                Last 8 weeks
              </SelectItem>
              <SelectItem value="6w" className="rounded-lg">
                Last 6 weeks
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
                <ChartTooltipContent
                  labelFormatter={(value) => `${value}`}
                  formatter={(value, name, props) => [value, ' Impact Points']}
                />
              }
            />
            <Bar
              dataKey="impact"
              fill="var(--color-impact)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
