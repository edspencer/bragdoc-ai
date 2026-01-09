'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  IconCalendar,
  IconClipboardCheck,
  IconLoader2,
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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

interface EditPerformanceReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  performanceReviewId: string;
  initialData: {
    name: string;
    startDate: Date;
    endDate: Date;
  };
  onUpdate: (data: { name: string; startDate: Date; endDate: Date }) => void;
}

export function EditPerformanceReviewDialog({
  open,
  onOpenChange,
  performanceReviewId,
  initialData,
  onUpdate,
}: EditPerformanceReviewDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<PerformanceReviewFormData>({
    resolver: zodResolver(performanceReviewSchema),
    defaultValues: {
      name: initialData.name,
      startDate: initialData.startDate,
      endDate: initialData.endDate,
    },
  });

  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');

  // Reset form when dialog opens with current values
  React.useEffect(() => {
    if (open) {
      form.reset({
        name: initialData.name,
        startDate: initialData.startDate,
        endDate: initialData.endDate,
      });
    }
  }, [open, form, initialData]);

  // Ensure end date is not before start date
  React.useEffect(() => {
    if (startDate && endDate && endDate < startDate) {
      form.setValue('endDate', startDate);
    }
  }, [startDate, endDate, form]);

  const handleSubmit = async (data: PerformanceReviewFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/performance-reviews/${performanceReviewId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: data.name.trim(),
            startDate: data.startDate,
            endDate: data.endDate,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to update performance review');
      }

      // Update local state
      onUpdate({
        name: data.name.trim(),
        startDate: data.startDate,
        endDate: data.endDate,
      });

      toast.success('Performance review updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update performance review:', error);
      toast.error('Failed to update performance review');
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
            Edit Performance Review
          </DialogTitle>
          <DialogDescription>
            Update the name and date range for this performance review.
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
                          defaultMonth={field.value}
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
                          defaultMonth={field.value}
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
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
