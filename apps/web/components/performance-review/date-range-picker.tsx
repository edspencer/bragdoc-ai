'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { IconCalendar } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectingEnd, setSelectingEnd] = useState(false);

  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  // Format the display text based on whether dates are in the same year
  const formatDateRange = () => {
    if (startYear === endYear) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      onStartDateChange(date);
      setSelectingEnd(true);
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      onEndDateChange(date);
      setIsOpen(false);
      setSelectingEnd(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectingEnd(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !startDate && !endDate && 'text-muted-foreground',
            className,
          )}
          aria-label="Select date range"
        >
          <IconCalendar className="mr-2 size-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col gap-4 p-4 sm:flex-row">
          <div className="flex flex-col gap-2">
            <p
              className={cn(
                'text-sm font-medium',
                !selectingEnd && 'text-primary',
              )}
            >
              Start Date
            </p>
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleStartDateSelect}
              defaultMonth={startDate}
              disabled={(date) => date > endDate}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p
              className={cn(
                'text-sm font-medium',
                selectingEnd && 'text-primary',
              )}
            >
              End Date
            </p>
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={handleEndDateSelect}
              defaultMonth={endDate}
              disabled={(date) => date < startDate}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
