'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Skeleton } from 'components/ui/skeleton';

interface WeeklyImpactChartProps {
  userId: string;
}

interface WeeklyImpactData {
  week: string;
  totalImpact: number;
  achievementCount: number;
}

async function getWeeklyImpactData(
  userId: string,
): Promise<WeeklyImpactData[]> {
  const response = await fetch(`/api/dashboard/weekly-impact?userId=${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch weekly impact data');
  }
  return response.json();
}

export function WeeklyImpactChart({ userId }: WeeklyImpactChartProps) {
  const [data, setData] = useState<WeeklyImpactData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWeeklyImpactData(userId)
      .then((weeklyData) => {
        setData(weeklyData);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userId]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`Week of ${label}`}</p>
          <p className="text-blue-600">{`Total Impact: ${data.totalImpact}`}</p>
          <p className="text-muted-foreground text-sm">
            {`${data.achievementCount} achievement${data.achievementCount !== 1 ? 's' : ''}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Impact Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Impact Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Unable to load chart data: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Impact Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>
              No achievement data available yet. Start tracking your
              accomplishments!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Impact Trend</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total impact score from achievements over the past 8 weeks
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="week"
                className="text-muted-foreground text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                className="text-muted-foreground text-xs"
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="totalImpact"
                className="fill-blue-500"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
