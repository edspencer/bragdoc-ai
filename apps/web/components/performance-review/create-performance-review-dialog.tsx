'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  IconCalendar,
  IconClipboardCheck,
  IconLoader2,
} from '@tabler/icons-react';
import { format, subMonths } from 'date-fns';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCreatePerformanceReview } from '@/hooks/use-performance-reviews';

function generateReviewName(startDate: Date, endDate: Date): string {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear === endYear) {
    return `${format(startDate, 'MMM')} - ${format(endDate, 'MMM yyyy')}`;
  }
  return `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`;
}

const performanceReviewSchema = z
  .object({
    name: z.string().min(1, 'Review name is required'),
    startDate: z.date({
      required_error: 'Start date is required',
    }),
    endDate: z.date({
      required_error: 'End date is required',
    }),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

type PerformanceReviewFormData = z.infer<typeof performanceReviewSchema>;

interface CreatePerformanceReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePerformanceReviewDialog({
  open,
  onOpenChange,
}: CreatePerformanceReviewDialogProps) {
  const router = useRouter();
  const createPerformanceReview = useCreatePerformanceReview();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasUserEditedName, setHasUserEditedName] = React.useState(false);

  const defaultStartDate = subMonths(new Date(), 6);
  const defaultEndDate = new Date();

  const form = useForm<PerformanceReviewFormData>({
    resolver: zodResolver(performanceReviewSchema),
    defaultValues: {
      name: generateReviewName(defaultStartDate, defaultEndDate),
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    },
  });

  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      const newStartDate = subMonths(new Date(), 6);
      const newEndDate = new Date();
      form.reset({
        name: generateReviewName(newStartDate, newEndDate),
        startDate: newStartDate,
        endDate: newEndDate,
      });
      setHasUserEditedName(false);
    }
  }, [open, form]);

  // Auto-generate name when dates change (unless user has manually edited)
  React.useEffect(() => {
    if (!hasUserEditedName && startDate && endDate) {
      form.setValue('name', generateReviewName(startDate, endDate));
    }
  }, [startDate, endDate, hasUserEditedName, form]);

  // Ensure end date is not before start date
  React.useEffect(() => {
    if (startDate && endDate && endDate < startDate) {
      form.setValue('endDate', startDate);
    }
  }, [startDate, endDate, form]);

  const handleNameChange = (value: string) => {
    form.setValue('name', value);
    // If the user clears the name, re-enable auto-generation
    setHasUserEditedName(value.length > 0);
  };

  const handleSubmit = async (data: PerformanceReviewFormData) => {
    setIsSubmitting(true);

    try {
      const review = await createPerformanceReview({
        name: data.name.trim(),
        startDate: data.startDate,
        endDate: data.endDate,
      });

      onOpenChange(false);
      form.reset();
      setHasUserEditedName(false);

      // Redirect to the detail page
      router.push(`/performance/${review.id}`);
    } catch (error) {
      // Error toast is already shown by the hook
      console.error('Failed to create performance review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconClipboardCheck className="size-5" />
            New Performance Review
          </DialogTitle>
          <DialogDescription>
            Create a new performance review for a specific time period.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-transparent"
                          >
                            <IconCalendar className="mr-2 size-4" />
                            {field.value
                              ? format(field.value, 'MMM d, yyyy')
                              : 'Select date'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-transparent"
                          >
                            <IconCalendar className="mr-2 size-4" />
                            {field.value
                              ? format(field.value, 'MMM d, yyyy')
                              : 'Select date'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < startDate
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Review Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Q1 2024 Performance Review"
                      {...field}
                      onChange={(e) => handleNameChange(e.target.value)}
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <IconLoader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Review'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
