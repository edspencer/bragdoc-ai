'use client';
import { IconCalendar, IconEye } from '@tabler/icons-react';
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
}

export function RecentUpdatesTable({
  documents,
  onViewDocument,
  isLoading = false,
}: RecentUpdatesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Updates from Recent Standups</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
