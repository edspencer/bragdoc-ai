'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { useIsMobile } from '@/hooks/use-mobile';
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

// Mock weekly impact data - in real app this would come from your database
const chartData = [
  { week: 'Week 1', impact: 45, achievements: 3 },
  { week: 'Week 2', impact: 32, achievements: 2 },
  { week: 'Week 3', impact: 58, achievements: 4 },
  { week: 'Week 4', impact: 41, achievements: 3 },
  { week: 'Week 5', impact: 67, achievements: 5 },
  { week: 'Week 6', impact: 38, achievements: 2 },
  { week: 'Week 7', impact: 52, achievements: 4 },
  { week: 'Week 8', impact: 73, achievements: 6 },
  { week: 'Week 9', impact: 29, achievements: 2 },
  { week: 'Week 10', impact: 61, achievements: 4 },
  { week: 'Week 11', impact: 44, achievements: 3 },
  { week: 'Week 12', impact: 28, achievements: 2 },
];

const chartConfig = {
  impact: {
    label: 'Impact Points',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

export function WeeklyImpactChart() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState('12w');

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange('6w');
    }
  }, [isMobile]);

  const filteredData = React.useMemo(() => {
    const weeks = timeRange === '6w' ? 6 : timeRange === '8w' ? 8 : 12;
    return chartData.slice(-weeks);
  }, [timeRange]);

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
            data={filteredData}
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
                  formatter={(value, name, props) => [
                    `${value} points`,
                    'Impact Points',
                  ]}
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
