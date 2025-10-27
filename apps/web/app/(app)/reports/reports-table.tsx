'use client';

import * as React from 'react';
import {
  IconUserCheck,
  IconPlus,
  IconTrash,
  IconCalendar,
  IconBuilding,
  IconFileText,
  IconEdit,
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useArtifact } from '@/hooks/use-artifact';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
import Link from 'next/link';
import { BetaFeatureBanner } from '@/components/shared/beta-feature-banner';

interface Document {
  id: string;
  title: string;
  type: string | null;
  kind: 'text' | 'code' | 'image' | 'sheet';
  chatId: string | null;
  companyId: string | null;
  companyName: string | null;
  content: string | null;
  updatedAt: Date;
  createdAt: Date;
}

interface Company {
  id: string;
  name: string;
}

interface ReportsTableProps {
  initialDocuments: Document[];
  companies: Company[];
}

const TIME_PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: 'last-week', label: 'Last Week' },
  { value: 'last-30-days', label: 'Last 30 Days' },
  { value: 'last-12-months', label: 'Last 12 Months' },
];

const DOCUMENT_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'weekly_report', label: 'Weekly Report' },
  { value: 'monthly_report', label: 'Monthly Report' },
  { value: 'custom_report', label: 'Custom Report' },
];

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

export function ReportsTable({
  initialDocuments,
  companies,
}: ReportsTableProps) {
  const router = useRouter();
  const [documents, setDocuments] =
    React.useState<Document[]>(initialDocuments);
  const { setArtifact } = useArtifact();

  // Filters
  const [selectedType, setSelectedType] = React.useState<string>('all');
  const [selectedCompany, setSelectedCompany] = React.useState<string>('all');
  const [timePeriod, setTimePeriod] = React.useState<string>('all');

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [documentToDelete, setDocumentToDelete] = React.useState<string | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Filter documents
  const filteredDocuments = React.useMemo(() => {
    let filtered = documents;

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter((doc) => doc.type === selectedType);
    }

    // Company filter
    if (selectedCompany !== 'all') {
      filtered = filtered.filter((doc) => doc.companyId === selectedCompany);
    }

    // Time period filter
    if (timePeriod !== 'all') {
      filtered = filtered.filter((doc) => {
        const updatedAt = new Date(doc.updatedAt);

        switch (timePeriod) {
          case 'last-week':
            return updatedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          case 'last-30-days':
            return updatedAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          case 'last-12-months':
            return (
              updatedAt >= new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
            );
          default:
            return true;
        }
      });
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [documents, selectedType, selectedCompany, timePeriod]);

  const handleDeleteClick = (id: string) => {
    setDocumentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/documents/${documentToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== documentToDelete));
      toast.success('Document deleted successfully');
      setDocumentToDelete(null);
      setDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = async (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) {
      console.error('Document not found:', id);
      return;
    }
    // All new documents should have a chatId
    // Old documents without chatId are a migration issue
    if (!doc.chatId) {
      toast.error('This document is missing a chat. Please contact support.');
      console.error('Document missing chatId:', {
        id: doc.id,
        title: doc.title,
      });
      return;
    }

    // Set artifact state with chatId - the global ArtifactCanvas will load messages automatically
    setArtifact({
      documentId: id,
      chatId: doc.chatId,
      kind: (doc.kind as 'text') || 'text',
      title: doc.title,
      content: doc.content || '',
      isVisible: true,
      status: 'idle',
      boundingBox: { top: 0, left: 0, width: 100, height: 100 },
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <IconUserCheck className="size-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">For my manager</h1>
                <p className="text-muted-foreground text-sm">
                  Create and manage documents for your manager based on your
                  achievements
                </p>
              </div>
            </div>

            {/* Toolbar buttons */}
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/reports/new/weekly">
                  <IconPlus className="size-4" />
                  Weekly
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/reports/new/monthly">
                  <IconPlus className="size-4" />
                  Monthly
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/reports/new/custom">
                  <IconPlus className="size-4" />
                  Custom
                </Link>
              </Button>
            </div>
          </div>

          {/* Beta Banner */}
          <BetaFeatureBanner />

          {/* Documents Table */}
          <Card>
            <CardHeader>
              <CardTitle>Your Reports</CardTitle>
              <CardDescription>
                Documents generated from your achievements
              </CardDescription>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 pt-4">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedCompany}
                  onValueChange={setSelectedCompany}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={timePeriod} onValueChange={setTimePeriod}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Last Edited</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          No documents found. Create your first report using the
                          buttons above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDocuments.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <Link
                              href={`/reports/${doc.id}`}
                              className="flex items-center gap-2 hover:underline"
                            >
                              <IconFileText className="size-4 text-muted-foreground" />
                              <span className="font-medium">{doc.title}</span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getDocumentTypeBadgeVariant(doc.type)}
                            >
                              {getDocumentTypeLabel(doc.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {doc.companyName ? (
                              <div className="flex items-center gap-2">
                                <IconBuilding className="size-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {doc.companyName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No company
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <IconCalendar className="size-4 text-muted-foreground" />
                              <span className="text-sm">
                                {formatDistanceToNow(new Date(doc.updatedAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClick(doc.id)}
                                title="Open in canvas mode"
                              >
                                <IconEdit className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(doc.id)}
                                className="text-destructive hover:text-destructive"
                                title="Delete document"
                              >
                                <IconTrash className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
