import { useMemo } from 'react';
import { useSWRConfig } from 'swr';
import type {
  CreateAchievementRequest,
  UpdateAchievementRequest,
} from '@/lib/types/achievement';
import { toast } from 'sonner';

interface UseMutationsOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAchievementMutations(options: UseMutationsOptions = {}) {
  const { mutate } = useSWRConfig();
  const { onSuccess, onError } = options;

  return useMemo(
    () => ({
      createAchievement: async (data: CreateAchievementRequest) => {
        try {
          const response = await fetch('/api/achievements', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create achievement');
          }

          // Invalidate achievements cache
          await mutate(
            (key) =>
              typeof key === 'string' && key.startsWith('/api/achievements'),
          );
          toast.success('Achievement created');
          onSuccess?.();
        } catch (error) {
          console.error('Error creating achievement:', error);
          toast.error('Failed to create achievement');
          onError?.(error as Error);
          throw error;
        }
      },

      updateAchievement: async (id: string, data: UpdateAchievementRequest) => {
        try {
          const response = await fetch(`/api/achievements/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update achievement');
          }

          // Invalidate achievements cache
          await mutate(
            (key) =>
              typeof key === 'string' && key.startsWith('/api/achievements'),
          );
          toast.success('Achievement updated');
          onSuccess?.();
        } catch (error) {
          console.error('Error updating achievement:', error);
          toast.error('Failed to update achievement');
          onError?.(error as Error);
          throw error;
        }
      },

      deleteAchievement: async (id: string) => {
        try {
          const response = await fetch(`/api/achievements/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete achievement');
          }

          // Invalidate achievements cache
          await mutate(
            (key) =>
              typeof key === 'string' && key.startsWith('/api/achievements'),
          );
          toast.success('Achievement deleted');
          onSuccess?.();
        } catch (error) {
          console.error('Error deleting achievement:', error);
          toast.error('Failed to delete achievement');
          onError?.(error as Error);
          throw error;
        }
      },
    }),
    [mutate, onSuccess, onError],
  );
}
