import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from 'lib/utils';

export interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  minDate = new Date('1900-01-01'),
  maxDate = new Date(),
  placeholder = 'MM/DD/YYYY',
  className,
  required = false,
  disabled = false,
}: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState(
    value ? format(value, 'MM/dd/yyyy') : ''
  );

  return (
    <div className={cn('flex gap-2', className)}>
      <Input
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={() => {
          if (!inputValue.trim()) {
            onChange(required ? undefined : null);
            setInputValue('');
            return;
          }

          const date = parse(inputValue, 'MM/dd/yyyy', new Date());
          if (isValid(date) && !Number.isNaN(date.getTime())) {
            onChange(date);
          }
        }}
        className={cn(
          'max-w-[240px]',
          inputValue && !value && 'border-red-500'
        )}
        disabled={disabled}
      />
      <Popover modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            disabled={disabled}
          >
            <CalendarIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={(date) => {
              onChange(date || (required ? undefined : null));
              setInputValue(date ? format(date, 'MM/dd/yyyy') : '');
            }}
            defaultMonth={value || undefined}
            disabled={(date) => date > maxDate || date < minDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
