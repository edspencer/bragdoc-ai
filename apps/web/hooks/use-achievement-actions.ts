'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Custom hook for managing achievement edit and delete actions
 *
 * Encapsulates all the boilerplate state management and API calls for editing and
 * deleting achievements across components. Use with AchievementDialog and
 * DeleteAchievementDialog components to create fully functional edit/delete flows.
 *
 * Works with both AchievementWithRelationsUI and partial achievement types.
 *
 * @param options - Hook configuration options
 * @param options.onRefresh - Optional callback to refresh achievements list after successful edits/deletes
 * @returns Object containing state variables and handler functions
 *
 * @example
 * ```typescript
 * const {
 *   editDialogOpen,
 *   setEditDialogOpen,
 *   achievementToEdit,
 *   handleEditClick,
 *   handleEditSubmit,
 *   deleteDialogOpen,
 *   setDeleteDialogOpen,
 *   achievementToDelete,
 *   handleDeleteClick,
 *   handleDeleteConfirm,
 *   isDeletingAchievement,
 * } = useAchievementActions({
 *   onRefresh: async () => {
 *     const res = await fetch('/api/achievements');
 *     const data = await res.json();
 *     setAchievements(data.achievements);
 *   }
 * });
 *
 * return (
 *   <>
 *     <button onClick={() => handleEditClick(achievement)}>
 *       Edit
 *     </button>
 *     <AchievementDialog
 *       mode="edit"
 *       open={editDialogOpen}
 *       onOpenChange={setEditDialogOpen}
 *       achievement={achievementToEdit}
 *       onSubmit={handleEditSubmit}
 *     />
 *     <DeleteAchievementDialog
 *       open={deleteDialogOpen}
 *       onOpenChange={setDeleteDialogOpen}
 *       achievement={achievementToDelete}
 *       onConfirm={handleDeleteConfirm}
 *       isDeleting={isDeletingAchievement}
 *     />
 *   </>
 * );
 * ```
 */
export function useAchievementActions(options?: {
  onRefresh?: () => Promise<void>;
}) {
  const router = useRouter();

  // Edit dialog state - use any to support both AchievementWithRelationsUI and partial types
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [achievementToEdit, setAchievementToEdit] = useState<any>(null);
  const [isEditingAchievement, setIsEditingAchievement] = useState(false);

  // Delete dialog state - use any to support both AchievementWithRelationsUI and partial types
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [achievementToDelete, setAchievementToDelete] = useState<any>(null);
  const [isDeletingAchievement, setIsDeletingAchievement] = useState(false);

  /**
   * Opens the edit dialog for the given achievement
   */
  const handleEditClick = (achievement: any) => {
    setAchievementToEdit(achievement);
    setEditDialogOpen(true);
  };

  /**
   * Closes the edit dialog and clears state
   */
  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setAchievementToEdit(null);
    setIsEditingAchievement(false);
  };

  /**
   * Submits edit form, calls API, and refreshes data
   */
  const handleEditSubmit = async (data: any) => {
    if (!achievementToEdit) return;

    setIsEditingAchievement(true);
    try {
      const response = await fetch(
        `/api/achievements/${achievementToEdit.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to update achievement');
      }

      // Refresh data
      if (options?.onRefresh) {
        await options.onRefresh();
      } else {
        router.refresh();
      }

      // Close dialog and reset state
      handleEditCancel();
      toast.success('Achievement updated successfully');
    } catch (error) {
      console.error('Error updating achievement:', error);
      toast.error('Failed to update achievement');
      throw error; // Let component handle if needed
    } finally {
      setIsEditingAchievement(false);
    }
  };

  /**
   * Opens the delete confirmation dialog for the given achievement
   */
  const handleDeleteClick = (achievement: any) => {
    setAchievementToDelete(achievement);
    setDeleteDialogOpen(true);
  };

  /**
   * Closes the delete dialog and clears state
   */
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setAchievementToDelete(null);
    setIsDeletingAchievement(false);
  };

  /**
   * Confirms delete, calls API, and refreshes data
   */
  const handleDeleteConfirm = async () => {
    if (!achievementToDelete) return;

    setIsDeletingAchievement(true);
    try {
      const response = await fetch(
        `/api/achievements/${achievementToDelete.id}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to delete achievement');
      }

      // Refresh data
      if (options?.onRefresh) {
        await options.onRefresh();
      } else {
        router.refresh();
      }

      // Close dialog and reset state
      handleDeleteCancel();
    } catch (error) {
      console.error('Error deleting achievement:', error);
      throw error; // Let component handle if needed
    } finally {
      setIsDeletingAchievement(false);
    }
  };

  return {
    // Edit dialog state
    editDialogOpen,
    setEditDialogOpen,
    achievementToEdit,
    isEditingAchievement,
    handleEditClick,
    handleEditSubmit,
    handleEditCancel,

    // Delete dialog state
    deleteDialogOpen,
    setDeleteDialogOpen,
    achievementToDelete,
    isDeletingAchievement,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
  };
}
