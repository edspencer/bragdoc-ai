'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/site-header';
import { ExistingStandupContent } from '@/components/standups/existing-standup-content';
import { StandupActions } from './standup-actions';
import type { Standup } from '@bragdoc/database';

interface StandupDetailsWrapperProps {
  standup: Standup;
}

export function StandupDetailsWrapper({ standup }: StandupDetailsWrapperProps) {
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const router = useRouter();

  const handleEditStandup = () => {
    setEditDialogOpen(true);
  };

  const handleDeleteStandup = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/standups/${standup.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete standup');
      }

      toast.success('Standup deleted successfully');
      router.refresh();
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting standup:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete standup',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <SiteHeader title={standup.name}>
        <StandupActions
          onEdit={handleEditStandup}
          onDelete={handleDeleteStandup}
          isDeleting={isDeleting}
        />
      </SiteHeader>
      <ExistingStandupContent
        standup={standup}
        showEditDialog={editDialogOpen}
        onEditDialogChange={setEditDialogOpen}
      />
    </>
  );
}
