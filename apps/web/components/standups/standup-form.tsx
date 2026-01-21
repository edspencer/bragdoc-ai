'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod/v3';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Textarea } from 'components/ui/textarea';
import { Label } from 'components/ui/label';
import { Checkbox } from 'components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'components/ui/form';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'components/ui/collapsible';
import { CompanyProjectSelector } from './company-project-selector';
import { IconChevronDown } from '@tabler/icons-react';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  companyId: z.string().nullable(),
  projectIds: z.array(z.string()),
  daysMask: z.number().min(1).max(127),
  meetingTime: z
    .string()
    .transform((val) => {
      // Remove any am/pm suffix if present (preprocessing)
      return val.toLowerCase().replace(/\s*(am|pm)\s*$/i, '');
    })
    .pipe(
      z
        .string()
        .regex(
          /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
          'Invalid time format (use HH:mm)',
        ),
    ),
  timezone: z.string().min(1, 'Timezone is required'),
  instructions: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const DAYS = [
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 4 },
  { label: 'T', value: 8 },
  { label: 'F', value: 16 },
  { label: 'S', value: 32 },
  { label: 'S', value: 64 },
];

interface StandupFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: Partial<FormData> & { id?: string };
  isEdit?: boolean;
}

export function StandupForm({
  onSuccess,
  onCancel,
  initialData,
  isEdit = false,
}: StandupFormProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || 'Daily Standup',
      companyId: initialData?.companyId || null,
      projectIds: initialData?.projectIds || [],
      daysMask: initialData?.daysMask || 31, // M-F default (1+2+4+8+16)
      meetingTime: initialData?.meetingTime
        ? initialData.meetingTime.substring(0, 5) // Convert HH:mm:ss to HH:mm
        : '09:00',
      timezone:
        initialData?.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      instructions: initialData?.instructions || '',
    },
  });

  const daysMask = form.watch('daysMask');

  const toggleDay = (dayValue: number) => {
    const currentMask = form.getValues('daysMask');
    const newMask = currentMask ^ dayValue; // XOR to toggle
    form.setValue('daysMask', newMask);
  };

  const isDaySelected = (dayValue: number) => {
    return (daysMask & dayValue) !== 0;
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        companyId: data.companyId,
        projectIds: data.projectIds,
        daysMask: data.daysMask,
        meetingTime: data.meetingTime,
        timezone: data.timezone,
        instructions: data.instructions || undefined,
        enabled: true,
      };

      if (isEdit && initialData?.id) {
        // Update existing standup
        const response = await fetch(`/api/standups/${initialData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update standup');
        }
      } else {
        // Create new standup
        const response = await fetch('/api/standups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create standup');
        }
      }

      toast.success(
        isEdit
          ? 'Standup updated successfully'
          : 'Standup created successfully',
      );
      onSuccess();
    } catch (error) {
      console.error('Error saving standup:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save standup',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Daily Standup"
                  autoComplete="off"
                  data-1p-ignore
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Projects</FormLabel>
              <FormControl>
                <CompanyProjectSelector
                  selectedCompanyId={field.value}
                  selectedProjectIds={form.watch('projectIds')}
                  onCompanyChange={(companyId) => {
                    field.onChange(companyId);
                    if (companyId) {
                      form.setValue('projectIds', []);
                    }
                  }}
                  onProjectsChange={(projectIds) => {
                    form.setValue('projectIds', projectIds);
                    if (projectIds.length > 0) {
                      field.onChange(null);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label>Days of Week</Label>
          <div className="flex gap-2">
            {DAYS.map((day, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <Checkbox
                  checked={isDaySelected(day.value)}
                  onCheckedChange={() => toggleDay(day.value)}
                />
                <span className="text-xs text-muted-foreground">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
          {daysMask === 0 && (
            <p className="text-sm text-destructive">
              Please select at least one day
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="meetingTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Time</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="time"
                  onChange={(e) => {
                    // Normalize to HH:mm format (strip seconds if present)
                    const value = e.target.value;
                    const normalized = value ? value.substring(0, 5) : value;
                    field.onChange(normalized);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 p-0 h-auto"
            >
              <span>Advanced</span>
              <IconChevronDown
                className={`size-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LLM Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter custom instructions for the AI to consider when generating your daily standup summaries..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={daysMask === 0 || isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
