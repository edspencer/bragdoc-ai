'use client';

import * as React from 'react';
import { IconTrash, IconCalendar, IconFileText } from '@tabler/icons-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeletePerformanceReview } from '@/hooks/use-performance-reviews';
import { PerformanceReviewsZeroState } from './performance-reviews-zero-state';
import { CreatePerformanceReviewDialog } from './create-performance-review-dialog';
import type { PerformanceReviewWithDocument } from '@bragdoc/database';

interface PerformanceReviewsTableProps {
  initialReviews: PerformanceReviewWithDocument[];
}

function formatDateRange(startDate: Date, endDate: Date): string {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear === endYear) {
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  }
  return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
}

export function PerformanceReviewsTable({
  initialReviews,
}: PerformanceReviewsTableProps) {
  const router = useRouter();
  const [reviews, setReviews] =
    React.useState<PerformanceReviewWithDocument[]>(initialReviews);
  const deletePerformanceReview = useDeletePerformanceReview();

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [reviewToDelete, setReviewToDelete] = React.useState<string | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteClick = (id: string) => {
    setReviewToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reviewToDelete) return;

    setIsDeleting(true);

    try {
      await deletePerformanceReview(reviewToDelete);
      setReviews((prev) => prev.filter((r) => r.id !== reviewToDelete));
      setReviewToDelete(null);
      setDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error deleting performance review:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (reviews.length === 0) {
    return (
      <>
        <PerformanceReviewsZeroState
          onCreateClick={() => setCreateDialogOpen(true)}
        />
        <CreatePerformanceReviewDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Your Performance Reviews</CardTitle>
          <CardDescription>
            Review periods you have defined for performance review generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <Link
                        href={`/performance/${review.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <IconFileText className="size-4 text-muted-foreground" />
                        <span className="font-medium">{review.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconCalendar className="size-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatDateRange(review.startDate, review.endDate)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(review.createdAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(review.id)}
                        className="text-destructive hover:text-destructive"
                        title="Delete performance review"
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Performance Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this performance review? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
