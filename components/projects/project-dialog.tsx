"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectForm, ProjectFormData } from "./project-form";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<ProjectFormData>;
  onSubmit: (data: ProjectFormData) => void;
  isLoading?: boolean;
  mode: "create" | "edit";
  companies?: Array<{ id: string; name: string }>;
}

export function ProjectDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isLoading,
  mode,
  companies,
}: ProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Project" : "Edit Project"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new project to track your achievements."
              : "Update your project information."}
          </DialogDescription>
        </DialogHeader>
        <ProjectForm
          initialData={initialData}
          onSubmit={onSubmit}
          isLoading={isLoading}
          companies={companies}
        />
      </DialogContent>
    </Dialog>
  );
}
