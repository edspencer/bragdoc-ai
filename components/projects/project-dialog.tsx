"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectForm, type ProjectFormData } from "./project-form";
import type { ProjectWithCompany } from "@/lib/db/projects/queries";
import type { ProjectStatus } from "@/lib/db/schema";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  defaultValues?: ProjectWithCompany;
  isLoading?: boolean;
  companies: Array<{ id: string; name: string }>;
}

export function ProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading = false,
  companies = [],
}: ProjectDialogProps) {
  const isEdit = !!defaultValues;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Project" : "Create Project"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Make changes to your project here."
              : "Add a new project to track your achievements."}
          </DialogDescription>
        </DialogHeader>
        <ProjectForm
          onSubmit={onSubmit}
          initialData={{
            name: defaultValues?.name ?? "",
            description: defaultValues?.description ?? "",
            companyId: defaultValues?.companyId ?? undefined,
            status: defaultValues?.status as ProjectStatus,
            startDate: defaultValues?.startDate
              ? new Date(defaultValues.startDate)
              : new Date(),
            endDate: defaultValues?.endDate
              ? new Date(defaultValues.endDate)
              : undefined,
          }}
          isLoading={isLoading}
          mode={isEdit ? "edit" : "create"}
          id={defaultValues?.id}
          name={defaultValues?.name ?? ""}
          companies={companies}
        />
      </DialogContent>
    </Dialog>
  );
}
