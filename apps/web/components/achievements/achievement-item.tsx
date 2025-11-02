import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Building2, FolderKanban, Clock, MoreHorizontal } from 'lucide-react';
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'components/ui/dropdown-menu';
import { ImpactRating } from 'components/ui/impact-rating';
import type { AchievementWithRelations } from 'lib/types/achievement';

interface AchievementItemProps {
  achievement: AchievementWithRelations;
  onImpactChange?: (id: string, impact: number) => void;
  onEdit?: (achievement: AchievementWithRelations) => void;
  readOnly?: boolean;
  showSourceBadge?: boolean;
  linkToAchievements?: boolean;
}

export function AchievementItem({
  achievement,
  onImpactChange,
  onEdit,
  readOnly = false,
  showSourceBadge = true,
  linkToAchievements = true,
}: AchievementItemProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-stretch flex-col gap-2">
        <div className="space-y-1 flex-1">
          {linkToAchievements ? (
            <Link
              href="/achievements"
              className="text-sm font-medium hover:underline"
            >
              {achievement.title}
            </Link>
          ) : (
            <div className="text-sm font-medium">{achievement.title}</div>
          )}
          {achievement.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {achievement.summary}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {achievement.eventStart && (
              <div className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatDistanceToNow(new Date(achievement.eventStart), {
                  addSuffix: true,
                })}
              </div>
            )}
            {achievement.project && (
              <div
                className="flex items-center gap-1"
                style={{ color: achievement.project.color }}
              >
                <FolderKanban className="size-3" />
                <Link
                  href={`/projects/${achievement.project.id}`}
                  className="font-medium hover:underline"
                >
                  {achievement.project.name}
                </Link>
              </div>
            )}
            {achievement.company && (
              <div className="items-center gap-1 hidden lg:flex">
                <Building2 className="size-3" />
                {achievement.company.name}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-start gap-1">
            <ImpactRating
              value={achievement.impact || 0}
              source={achievement.impactSource || 'llm'}
              updatedAt={achievement.impactUpdatedAt}
              onChange={
                onImpactChange
                  ? (value) => onImpactChange(achievement.id, value)
                  : undefined
              }
              readOnly={readOnly}
            />
            {showSourceBadge && (
              <Badge variant="outline" className="text-xs">
                {achievement.impactSource}
              </Badge>
            )}
          </div>
          {onEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(achievement)}>
                  Edit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
