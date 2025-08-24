'use client';

import { Button } from 'components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';

const DOCUMENT_TYPES = [
  { value: 'weekly_report', label: 'Weekly Report' },
  { value: 'monthly_report', label: 'Monthly Report' },
  { value: 'quarterly_report', label: 'Quarterly Report' },
  { value: 'performance_review', label: 'Performance Review' },
  { value: 'custom', label: 'Custom' },
];

export function DocumentFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type');

  const handleTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('type');
    } else {
      params.set('type', value);
    }
    router.push(`/documents?${params.toString()}`);
  };

  return (
    <div className="flex items-center space-x-4">
      <Select value={type || 'all'} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {DOCUMENT_TYPES.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => router.push('/documents/new')}>
        New Document
      </Button>
    </div>
  );
}
