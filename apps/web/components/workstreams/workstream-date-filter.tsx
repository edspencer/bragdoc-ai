'use client';

import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WorkstreamDateFilterProps {
  initialPreset: string;
}

const presets = [
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: '24m', label: 'Last 24 months' },
  { value: 'all', label: 'All time' },
];

export function WorkstreamDateFilter({
  initialPreset,
}: WorkstreamDateFilterProps) {
  const router = useRouter();

  const handlePresetChange = (value: string) => {
    // Update URL to trigger server-side data fetch
    router.push(`/workstreams?preset=${value}`);
  };

  return (
    <Select value={initialPreset} onValueChange={handlePresetChange}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {presets.map((preset) => (
          <SelectItem key={preset.value} value={preset.value}>
            {preset.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
