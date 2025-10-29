'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconBuilding,
  IconCalendar,
  IconPrinter,
} from '@tabler/icons-react';
import type { DocumentWithCompany, Company } from '@bragdoc/database';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppContent } from '@/components/shared/app-content';
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
import { Markdown } from '@/components/markdown';
import { useArtifact } from '@/hooks/use-artifact';
import { EditReportMetadataDialog } from '@/components/reports/edit-report-metadata-dialog';

interface ReportDetailViewProps {
  initialDocument: DocumentWithCompany;
  companies: Company[];
}

// Helper functions copied from reports-table.tsx
function getDocumentTypeLabel(type: string | null): string {
  if (!type) return 'Unknown';
  const typeMap: Record<string, string> = {
    weekly_report: 'Weekly Report',
    monthly_report: 'Monthly Report',
    custom_report: 'Custom Report',
  };
  return typeMap[type] || type;
}

function getDocumentTypeBadgeVariant(
  type: string | null,
): 'default' | 'secondary' | 'outline' {
  if (!type) return 'outline';
  const variantMap: Record<string, 'default' | 'secondary' | 'outline'> = {
    weekly_report: 'default',
    monthly_report: 'secondary',
    custom_report: 'outline',
  };
  return variantMap[type] || 'outline';
}

export function ReportDetailView({
  initialDocument,
  companies,
}: ReportDetailViewProps) {
  const router = useRouter();
  const { setArtifact } = useArtifact();

  // State
  const [document, setDocument] =
    useState<DocumentWithCompany>(initialDocument);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle content click - launch canvas editor
  const handleContentClick = () => {
    // Validate chatId exists
    if (!document.chatId) {
      toast.error('This document is missing a chat. Please contact support.');
      console.error('Document missing chatId:', {
        id: document.id,
        title: document.title,
      });
      return;
    }

    // Set artifact state to launch canvas editor
    setArtifact({
      documentId: document.id,
      chatId: document.chatId,
      kind: (document.kind as 'text') || 'text',
      title: document.title,
      content: document.content || '',
      isVisible: true,
      status: 'idle',
      boundingBox: { top: 0, left: 0, width: 100, height: 100 },
    });
  };

  // Handle metadata update (optimistic)
  const handleMetadataUpdate = (updates: {
    title?: string;
    type?: string | null;
    companyId?: string | null;
  }) => {
    setDocument((prev) => ({
      ...prev,
      ...updates,
      // Update companyName if companyId changed
      companyName:
        updates.companyId !== undefined
          ? companies.find((c) => c.id === updates.companyId)?.name || null
          : prev.companyName,
    }));
  };

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      toast.success('Document deleted successfully');
      router.push('/reports');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  return (
    <AppContent className="p-4 sm:p-6">
      {/* Back link */}
      <Link
        href="/reports"
        className="print:hidden flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <IconArrowLeft className="size-4" />
        Back to Reports
      </Link>

      {/* Metadata section */}
      <div className="space-y-4">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-semibold">{document.title}</h1>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
          {/* Type badge */}
          <Badge variant={getDocumentTypeBadgeVariant(document.type)}>
            {getDocumentTypeLabel(document.type)}
          </Badge>

          {/* Company */}
          {document.companyName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <IconBuilding className="size-4" />
              <span>{document.companyName}</span>
            </div>
          )}

          {/* Last updated */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconCalendar className="size-4" />
            <span>
              Updated{' '}
              {formatDistanceToNow(new Date(document.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="print:hidden flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <IconEdit className="size-4" />
            Edit Details
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <IconPrinter className="size-4" />
            Print
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <IconTrash className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Report content */}
      <Card
        className="cursor-pointer transition-shadow hover:shadow-lg"
        onClick={handleContentClick}
      >
        <CardContent className="p-4 sm:p-8 lg:p-12">
          {document.content ? (
            <Markdown>{document.content}</Markdown>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <p>This report has no content yet.</p>
              <p className="text-sm mt-2">Click here to add content.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit metadata dialog */}
      <div className="print:hidden">
        <EditReportMetadataDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          document={document}
          companies={companies}
          onUpdate={handleMetadataUpdate}
        />
      </div>

      {/* Delete confirmation dialog */}
      <div className="print:hidden">
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this report? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppContent>
  );
}
