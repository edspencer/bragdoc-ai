'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from 'components/ui/dialog';
import { ProjectForm, type ProjectFormData } from './project-form';

interface ProjectDialogWrapperProps {
  children: React.ReactNode;
}

export function ProjectDialog({ children }: ProjectDialogWrapperProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      setOpen(false);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <ProjectForm onSubmit={handleSubmit} mode="create" />
      </DialogContent>
    </Dialog>
  );
}
