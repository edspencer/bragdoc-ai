"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompanyForm, CompanyFormData } from "./company-form";

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<CompanyFormData>;
  onSubmit: (data: CompanyFormData) => void;
  isLoading?: boolean;
  mode: "create" | "edit";
}

export function CompanyDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isLoading,
  mode,
}: CompanyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Company" : "Edit Company"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new company to your work history."
              : "Update your company information."}
          </DialogDescription>
        </DialogHeader>
        <CompanyForm
          initialData={initialData}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
