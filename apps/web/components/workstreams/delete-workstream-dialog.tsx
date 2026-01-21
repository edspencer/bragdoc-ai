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
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Workstream } from '@bragdoc/database';

/**
 * DeleteWorkstreamDialog - Confirmation dialog for deleting a workstream
 *
 * Uses AlertDialog for destructive action confirmation with proper focus management
 * and keyboard navigation (provided by shadcn/ui AlertDialog).
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Callback to change open state
 * @param workstream - The workstream to delete (null when not selected)
 * @param onConfirm - Async callback fired when delete is confirmed
 * @param isDeleting - Whether a delete operation is in progress
 */
interface DeleteWorkstreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workstream: Workstream | null;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

export function DeleteWorkstreamDialog({
  open,
  onOpenChange,
  workstream,
  onConfirm,
  isDeleting = false,
}: DeleteWorkstreamDialogProps) {
  const [localLoading, setLocalLoading] = useState(false);

  const loading = isDeleting || localLoading;

  const handleDelete = async () => {
    if (!workstream) return;

    setLocalLoading(true);
    try {
      await onConfirm();
      toast.success('Workstream deleted', {
        description:
          'Achievements have been unassigned and are available for reassignment.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting workstream:', error);
      toast.error('Failed to delete workstream. Please try again.');
      // Don't close dialog on error - let user retry or cancel
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Workstream</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{workstream?.name}"? All
            achievements in this workstream will be unassigned and available for
            reassignment.
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
