'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAchievementFilters } from '@/hooks/use-achievement-filters';
import { useCompanies } from '@/hooks/use-companies';
import { useProjects } from '@/hooks/useProjects';
import type { AchievementSource } from '@/lib/types/achievement';

export function AchievementFilters() {
  const { filters, setFilter, clearFilters } = useAchievementFilters();
  const { companies, isLoading: isLoadingCompanies } = useCompanies();
  const { projects, isLoading: isLoadingProjects } = useProjects();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    filters.dateRange?.start && filters.dateRange?.end
      ? {
          from: new Date(filters.dateRange.start),
          to: new Date(filters.dateRange.end),
        }
      : undefined
  );

  // Update filters when date range changes
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setFilter('dateRange', 
      range?.from && range?.to 
        ? {
            start: range.from,
            end: range.to
          } 
        : undefined
    );
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !dateRange && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'LLL dd, y')} -{' '}
                  {format(dateRange.to, 'LLL dd, y')}
                </>
              ) : (
                format(dateRange.from, 'LLL dd, y')
              )
            ) : (
              <span>Date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateRangeChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Company Filter */}
      <Select
        value={filters.companyId ?? "all"}
        onValueChange={(value) => setFilter('companyId', value === "all" ? undefined : value)}
        disabled={isLoadingCompanies}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All companies" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All companies</SelectItem>
          {companies?.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Project Filter */}
      <Select
        value={filters.projectId ?? "all"}
        onValueChange={(value) => setFilter('projectId', value === "all" ? undefined : value)}
        disabled={isLoadingProjects}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projects?.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Source Filter */}
      <Select
        value={filters.source ?? "all"}
        onValueChange={(value) => setFilter('source', value === "all" ? undefined : value as AchievementSource)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All sources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          <SelectItem value="manual">Manual</SelectItem>
          <SelectItem value="llm">AI Generated</SelectItem>
        </SelectContent>
      </Select>

      {/* Archive Filter */}
      <Select
        value={filters.isArchived === undefined ? "all" : filters.isArchived.toString()}
        onValueChange={(value) => 
          setFilter('isArchived', value === "all" ? undefined : value === "true")
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Archive status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any status</SelectItem>
          <SelectItem value="false">Active</SelectItem>
          <SelectItem value="true">Archived</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      <Button
        variant="ghost"
        onClick={() => {
          clearFilters();
          setDateRange(undefined);
        }}
        className="ml-auto"
      >
        Clear filters
      </Button>
    </div>
  );
}
