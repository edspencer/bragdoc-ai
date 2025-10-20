'use client';

import { Button } from 'components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'components/ui/card';
import { Badge } from 'components/ui/badge';
import { DocumentActions } from './document-actions';
import { DocumentListSkeleton } from './document-list-skeleton';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

interface Document {
  id: string;
  title: string;
  content: string;
  type?: string;
  companyId?: string;
  company?: {
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  shareToken?: string;
}

export function DocumentList() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<{
    documents: Document[];
  }>('/api/documents');

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-destructive">Error loading documents</p>
        <Button variant="outline" onClick={() => mutate()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return <DocumentListSkeleton />;
  }

  if (!data?.documents?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">No documents found</p>
        <Button onClick={() => router.push('/documents/new')} className="mt-4">
          Create Document
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* <DocumentFilters /> */}
      {data.documents.map((document) => (
        <Card key={document.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-medium leading-none">
                {document.title}
              </CardTitle>
              <CardDescription className="flex items-center space-x-2">
                <span>
                  Created {format(new Date(document.createdAt), 'PPP')}
                </span>
                {document.company && (
                  <>
                    <span>•</span>
                    <span>{document.company.name}</span>
                  </>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {document.type && (
                <Badge variant="secondary">{document.type}</Badge>
              )}
              {document.shareToken && <Badge variant="outline">Shared</Badge>}
              <DocumentActions document={document} onDelete={() => mutate()} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {document.content}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
