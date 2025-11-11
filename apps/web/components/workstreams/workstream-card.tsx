'use client';

import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Workstream } from '@bragdoc/database';

interface WorkstreamCardProps {
  workstream: Workstream;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function WorkstreamCard({
  workstream,
  onEdit,
  onDelete,
}: WorkstreamCardProps) {
  const color = workstream.color || '#3B82F6';
  return (
    <Link href={`/workstreams/${workstream.id}`}>
      <Card className="cursor-pointer transition-colors hover:bg-muted">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {workstream.name}
              </CardTitle>
              {workstream.description && (
                <CardDescription className="mt-2">
                  {workstream.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {workstream.achievementCount} achievements
            </p>
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(workstream.id);
                  }}
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(workstream.id);
                  }}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
