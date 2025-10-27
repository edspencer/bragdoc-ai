'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import type { Document, Company } from '@bragdoc/database';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DOCUMENT_TYPES = [
  { value: 'weekly_report', label: 'Weekly Report' },
  { value: 'monthly_report', label: 'Monthly Report' },
  { value: 'custom_report', label: 'Custom Report' },
];

const editMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(256, 'Title too long'),
  type: z
    .enum(['weekly_report', 'monthly_report', 'custom_report'])
    .nullable()
    .optional(),
  companyId: z.string().uuid().nullable().optional(),
});

interface EditReportMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Pick<Document, 'id' | 'title' | 'type' | 'companyId'>;
  companies: Company[];
  onUpdate: (updates: {
    title?: string;
    type?: string | null;
    companyId?: string | null;
  }) => void;
}

export function EditReportMetadataDialog({
  open,
  onOpenChange,
  document,
  companies,
  onUpdate,
}: EditReportMetadataDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(document.title);
  const [type, setType] = useState<string | null>(document.type);
  const [companyId, setCompanyId] = useState<string | null>(document.companyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const validation = editMetadataSchema.safeParse({
      title,
      type,
      companyId,
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError?.message || 'Validation failed');
      return;
    }

    setIsLoading(true);

    try {
      // Call optimistic update
      onUpdate({
        title,
        type,
        companyId,
      });

      // Make API request
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          type,
          companyId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update document');
      }

      toast.success('Report updated successfully');
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update report');
      // Revert optimistic update by resetting to original values
      onUpdate({
        title: document.title,
        type: document.type,
        companyId: document.companyId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Report Details</DialogTitle>
          <DialogDescription>
            Update the title, type, and company for this report.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Title field */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter report title"
                maxLength={256}
                required
                disabled={isLoading}
              />
            </div>

            {/* Type field */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={type || 'none'}
                onValueChange={(value) =>
                  setType(value === 'none' ? null : value)
                }
                disabled={isLoading}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No type</SelectItem>
                  {DOCUMENT_TYPES.map((docType) => (
                    <SelectItem key={docType.value} value={docType.value}>
                      {docType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Company field */}
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Select
                value={companyId || 'none'}
                onValueChange={(value) =>
                  setCompanyId(value === 'none' ? null : value)
                }
                disabled={isLoading}
              >
                <SelectTrigger id="company">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No company</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
