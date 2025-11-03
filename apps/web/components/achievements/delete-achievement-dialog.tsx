'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'components/ui/alert-dialog';
import { toast } from 'sonner';
import type { AchievementWithRelations } from 'lib/types/achievement';

/**
 * DeleteAchievementDialog - Confirmation dialog for deleting an achievement
 *
 * Uses AlertDialog for destructive action confirmation with proper focus management
 * and keyboard navigation (provided by shadcn/ui AlertDialog).
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Callback to change open state
 * @param achievement - The achievement to delete (null when not selected)
 * @param onConfirm - Async callback fired when delete is confirmed
 * @param isDeleting - Whether a delete operation is in progress
 */
interface DeleteAchievementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievement: AchievementWithRelations | null;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

export function DeleteAchievementDialog({
  open,
  onOpenChange,
  achievement,
  onConfirm,
  isDeleting = false,
}: DeleteAchievementDialogProps) {
  const [localLoading, setLocalLoading] = useState(false);

  const loading = isDeleting || localLoading;

  const handleDelete = async () => {
    if (!achievement) return;

    setLocalLoading(true);
    try {
      await onConfirm();
      toast.success('Achievement deleted successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting achievement:', error);
      toast.error('Failed to delete achievement. Please try again.');
      // Don't close dialog on error - let user retry or cancel
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Achievement</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{achievement?.title}"? This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
