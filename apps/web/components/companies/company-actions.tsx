'use client';

import { Button } from 'components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from 'components/ui/dialog';
import { Checkbox } from 'components/ui/checkbox';
import { Label } from 'components/ui/label';
import { Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { useState, useEffect } from 'react';
import { useCompanyRelatedCounts } from 'hooks/use-companies';

interface CompanyActionsProps {
  companyId: string;
  companyName: string;
  onEdit: () => void;
  onDelete: (cascadeOptions: {
    deleteProjects: boolean;
    deleteAchievements: boolean;
    deleteDocuments: boolean;
    deleteStandups: boolean;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function CompanyActions({
  companyId,
  companyName,
  onEdit,
  onDelete,
  isLoading = false,
}: CompanyActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [deleteProjects, setDeleteProjects] = useState(false);
  const [deleteAchievements, setDeleteAchievements] = useState(false);
  const [deleteDocuments, setDeleteDocuments] = useState(false);
  const [deleteStandups, setDeleteStandups] = useState(false);

  // Fetch counts when dialog opens
  const { counts, isLoading: countsLoading } = useCompanyRelatedCounts(
    isOpen ? companyId : null,
  );

  // Reset checkboxes when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setDeleteProjects(false);
      setDeleteAchievements(false);
      setDeleteDocuments(false);
      setDeleteStandups(false);
    }
  }, [isOpen]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete({
        deleteProjects,
        deleteAchievements,
        deleteDocuments,
        deleteStandups,
      });
      setIsOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center sm:gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onEdit}
        disabled={isLoading || isDeleting}
      >
        <Pencil1Icon className="size-4" />
        <span className="sr-only">Edit</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={isLoading || isDeleting}
            className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-600"
          >
            <TrashIcon className="size-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{companyName}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              By default, related projects, achievements, documents, and standups
              will be preserved (their company association will be removed).
              Optionally, you can choose to delete related data:
            </p>

            {countsLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading related data...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delete-projects"
                    checked={deleteProjects}
                    onCheckedChange={(checked) =>
                      setDeleteProjects(checked === true)
                    }
                    disabled={!counts || counts.projects === 0}
                  />
                  <Label
                    htmlFor="delete-projects"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Also delete {counts?.projects ?? 0} associated project
                    {counts?.projects !== 1 ? 's' : ''}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delete-achievements"
                    checked={deleteAchievements}
                    onCheckedChange={(checked) =>
                      setDeleteAchievements(checked === true)
                    }
                    disabled={!counts || counts.achievements === 0}
                  />
                  <Label
                    htmlFor="delete-achievements"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Also delete {counts?.achievements ?? 0} associated achievement
                    {counts?.achievements !== 1 ? 's' : ''}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delete-documents"
                    checked={deleteDocuments}
                    onCheckedChange={(checked) =>
                      setDeleteDocuments(checked === true)
                    }
                    disabled={!counts || counts.documents === 0}
                  />
                  <Label
                    htmlFor="delete-documents"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Also delete {counts?.documents ?? 0} associated document
                    {counts?.documents !== 1 ? 's' : ''}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delete-standups"
                    checked={deleteStandups}
                    onCheckedChange={(checked) =>
                      setDeleteStandups(checked === true)
                    }
                    disabled={!counts || counts.standups === 0}
                  />
                  <Label
                    htmlFor="delete-standups"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Also delete {counts?.standups ?? 0} associated standup
                    {counts?.standups !== 1 ? 's' : ''}
                  </Label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting || countsLoading}
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800"
            >
              {isDeleting ? 'Deleting...' : 'Delete Company'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
