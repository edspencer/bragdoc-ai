'use client';
import { IconCalendar, IconEye, IconSparkles } from '@tabler/icons-react';
import { format } from 'date-fns';

import { Button } from 'components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table';

interface StandupDocument {
  id: string;
  date: Date;
  quickSummary: string | null;
  achievementsSummary: string | null;
  wip: string | null;
}

interface RecentUpdatesTableProps {
  documents: StandupDocument[];
  onViewDocument: (document: StandupDocument) => void;
  isLoading?: boolean;
  hasRecentAchievements?: boolean;
  onGenerateDocuments?: () => Promise<void>;
  isGenerating?: boolean;
}

export function RecentUpdatesTable({
  documents,
  onViewDocument,
  isLoading = false,
  hasRecentAchievements = false,
  onGenerateDocuments,
  isGenerating = false,
}: RecentUpdatesTableProps) {
  // Show generate button if no documents but achievements exist
  const showGenerateButton =
    documents.length === 0 && hasRecentAchievements && onGenerateDocuments;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Updates from Recent Standups</CardTitle>
      </CardHeader>
      <CardContent>
        {showGenerateButton ? (
          <div className="flex items-center justify-center py-12">
            <Button
              onClick={onGenerateDocuments}
              disabled={isGenerating}
              size="lg"
              className="gap-2"
            >
              <IconSparkles className="size-5" />
              {isGenerating
                ? 'Generating Standups...'
                : 'Generate Standups for last 7 days'}
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-8"
                    >
                      Loading updates...
                    </TableCell>
                  </TableRow>
                ) : documents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-8"
                    >
                      No standup updates yet
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <IconCalendar className="size-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {format(doc.date, 'MMM d, yyyy')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm line-clamp-2">
                          {doc.quickSummary || 'No summary'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewDocument(doc)}
                        >
                          <IconEye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
