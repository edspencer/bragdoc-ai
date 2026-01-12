import useSWR from 'swr';
import { toast } from 'sonner';
import type { PerformanceReviewWithDocument } from '@bragdoc/database';

// The API returns dates as strings, so we need to transform them
type PerformanceReviewResponse = Omit<
  PerformanceReviewWithDocument,
  'startDate' | 'endDate' | 'createdAt' | 'updatedAt'
> & {
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
};

type CreatePerformanceReviewData = {
  name: string;
  startDate: Date;
  endDate: Date;
  instructions?: string | null;
};

const fetchPerformanceReviews = async (
  url: string,
): Promise<PerformanceReviewWithDocument[]> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch performance reviews');
  }
  const data = await res.json();
  return data.reviews.map((review: PerformanceReviewResponse) => ({
    ...review,
    startDate: new Date(review.startDate),
    endDate: new Date(review.endDate),
    createdAt: new Date(review.createdAt),
    updatedAt: new Date(review.updatedAt),
  }));
};

export function usePerformanceReviews() {
  const {
    data,
    error,
    mutate: mutateReviews,
  } = useSWR<PerformanceReviewWithDocument[]>(
    '/api/performance-reviews',
    fetchPerformanceReviews,
  );

  return {
    reviews: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate: mutateReviews,
  };
}

export function useCreatePerformanceReview() {
  const { mutate: mutateList } = usePerformanceReviews();

  const createPerformanceReview = async (
    data: CreatePerformanceReviewData,
  ): Promise<PerformanceReviewWithDocument> => {
    try {
      const res = await fetch('/api/performance-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || 'Failed to create performance review',
        );
      }

      const created = await res.json();
      await mutateList();
      toast.success('Performance review created successfully');

      // Transform dates from strings to Date objects
      return {
        ...created,
        startDate: new Date(created.startDate),
        endDate: new Date(created.endDate),
        createdAt: new Date(created.createdAt),
        updatedAt: new Date(created.updatedAt),
      };
    } catch (error) {
      console.error('Error creating performance review:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create performance review',
      );
      throw error;
    }
  };

  return createPerformanceReview;
}

export function useDeletePerformanceReview() {
  const { mutate: mutateList } = usePerformanceReviews();

  const deletePerformanceReview = async (id: string): Promise<void> => {
    try {
      const res = await fetch(`/api/performance-reviews/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete performance review');
      }

      await mutateList();
      toast.success('Performance review deleted successfully');
    } catch (error) {
      console.error('Error deleting performance review:', error);
      toast.error('Failed to delete performance review');
      throw error;
    }
  };

  return deletePerformanceReview;
}
