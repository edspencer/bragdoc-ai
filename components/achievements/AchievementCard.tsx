import { format } from 'date-fns';
import { MoreHorizontal, Calendar, Building2, FolderGit2 } from 'lucide-react';
import type { Achievement } from '@/lib/types/achievement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ImpactRating } from '@/components/ui/impact-rating';

interface AchievementCardProps {
  achievement: Achievement;
  onEdit?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onImpactChange?: (value: number) => void;
}

export function AchievementCard({
  achievement,
  onEdit,
  onDelete,
  onArchive,
  onImpactChange,
}: AchievementCardProps) {
  const {
    title,
    summary,
    details,
    eventStart,
    eventEnd,
    eventDuration,
    companyId,
    projectId,
    source,
    isArchived,
    impact,
    impactSource,
    impactUpdatedAt,
  } = achievement;

  return (
    <Card className={`w-full ${isArchived ? 'opacity-60' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
            <ImpactRating
              value={impact ?? 2}
              onChange={onImpactChange}
              source={impactSource}
              updatedAt={impactUpdatedAt}
              readOnly={!onImpactChange}
              className="mt-0.5"
            />
          </div>
          {summary && (
            <p className="text-sm text-muted-foreground">{summary}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={source === 'llm' ? 'secondary' : 'default'}>
            {source === 'llm' ? 'AI Generated' : 'Manual'}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="size-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  Edit
                </DropdownMenuItem>
              )}
              {onArchive && (
                <DropdownMenuItem onClick={onArchive}>
                  {isArchived ? 'Unarchive' : 'Archive'}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {details && (
          <p className="text-sm text-muted-foreground mt-2">{details}</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {eventStart && (
          <div className="flex items-center gap-1">
            <Calendar className="size-3" />
            <span>
              {format(new Date(eventStart), 'MMM d, yyyy')}
              {eventEnd && ` - ${format(new Date(eventEnd), 'MMM d, yyyy')}`}
            </span>
          </div>
        )}
        {companyId && (
          <div className="flex items-center gap-1">
            <Building2 className="size-3" />
            <span>{companyId}</span>
          </div>
        )}
        {projectId && (
          <div className="flex items-center gap-1">
            <FolderGit2 className="size-3" />
            <span>{projectId}</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
