'use client';

import { Button } from '@/components/ui/button';
import { Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { Loader2 } from 'lucide-react';
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
import { useState } from 'react';
import type { ProjectWithCompany } from '@/lib/db/projects/queries';

interface ProjectActionsProps {
  project: ProjectWithCompany;
  onEdit: (project: ProjectWithCompany) => void;
  onDelete: (id: string) => Promise<boolean>;
  isLoading?: boolean;
}

export function ProjectActions({
  project,
  onEdit,
  onDelete,
  isLoading = false,
}: ProjectActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(project.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(project)}
          disabled={isLoading}
          className="size-8"
        >
          <Pencil1Icon className="size-4" />
          <span className="sr-only">Edit project</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isLoading}
          className="size-8 text-red-600 dark:text-red-400"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <TrashIcon className="size-4" />
          )}
          <span className="sr-only">Delete project</span>
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project &quot;{project.name}
              &quot; and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
