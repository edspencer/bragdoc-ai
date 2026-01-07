'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, subMonths } from 'date-fns';
import {
  IconArrowLeft,
  IconClipboardCheck,
  IconLoader2,
} from '@tabler/icons-react';
import { toast } from 'sonner';

import { AppPage } from 'components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';
import { SidebarInset } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DateRangePicker } from '@/components/performance-review/date-range-picker';
import { useCreatePerformanceReview } from '@/hooks/use-performance-reviews';

function generateReviewName(startDate: Date, endDate: Date): string {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear === endYear) {
    return `${format(startDate, 'MMM')} - ${format(endDate, 'MMM yyyy')}`;
  }
  return `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`;
}

export default function NewPerformanceReviewPage() {
  const router = useRouter();
  const createPerformanceReview = useCreatePerformanceReview();

  // Default to last 6 months
  const [startDate, setStartDate] = useState<Date>(() =>
    subMonths(new Date(), 6),
  );
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [name, setName] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [hasUserEditedName, setHasUserEditedName] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate name when dates change (unless user has manually edited)
  useEffect(() => {
    if (!hasUserEditedName) {
      setName(generateReviewName(startDate, endDate));
    }
  }, [startDate, endDate, hasUserEditedName]);

  const handleNameChange = (value: string) => {
    setName(value);
    // If the user clears the name, re-enable auto-generation
    setHasUserEditedName(value.length > 0);
  };

  const handleStartDateChange = (date: Date) => {
    setStartDate(date);
    // Ensure end date is not before start date
    if (endDate < date) {
      setEndDate(date);
    }
  };

  const handleEndDateChange = (date: Date) => {
    setEndDate(date);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate date range
    if (endDate <= startDate) {
      toast.error('End date must be after start date');
      return;
    }

    // Validate name
    if (!name.trim()) {
      toast.error('Please enter a review name');
      return;
    }

    setIsSubmitting(true);

    try {
      const review = await createPerformanceReview({
        name: name.trim(),
        startDate,
        endDate,
        instructions: instructions.trim() || null,
      });

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
    <AppPage>
      <SidebarInset>
        <AppContent>
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/performance">
                <IconArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <IconClipboardCheck className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">New Performance Review</h1>
              <p className="text-sm text-muted-foreground">
                Define the period and customize how your review will be
                generated
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Range Card */}
            <Card>
              <CardHeader>
                <CardTitle>Review Period</CardTitle>
                <CardDescription>
                  Select the date range for this performance review. All
                  achievements within this period will be included.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={handleStartDateChange}
                  onEndDateChange={handleEndDateChange}
                />
              </CardContent>
            </Card>

            {/* Name Card */}
            <Card>
              <CardHeader>
                <CardTitle>Review Name</CardTitle>
                <CardDescription>
                  A name to identify this review. By default, it is
                  auto-generated from the date range.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="name">Review Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Q1 2024 Performance Review"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Instructions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Custom Instructions (Optional)</CardTitle>
                <CardDescription>
                  Provide additional context or instructions for how your review
                  should be generated. This could include specific areas to
                  focus on, metrics to highlight, or formatting preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g., Focus on leadership initiatives and cross-team collaboration. Highlight quantitative impact where possible."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href="/performance">Cancel</Link>
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
            </div>
          </form>
        </AppContent>
      </SidebarInset>
    </AppPage>
  );
}
