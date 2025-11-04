import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Building2, FolderKanban, Clock, Edit2, Trash2 } from 'lucide-react';
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import { ImpactRating } from 'components/ui/impact-rating';
import type { AchievementWithRelations } from 'lib/types/achievement';

/**
 * AchievementItem - Displays a single achievement with impact rating and optional edit/delete actions
 *
 * @param achievement - The achievement to display
 * @param onImpactChange - Optional callback when impact rating changes
 * @param onEdit - Optional callback when edit button is clicked
 * @param onDelete - Optional callback when delete button is clicked
 * @param readOnly - Whether to disable impact rating changes
 * @param showSourceBadge - Whether to show the impact source badge
 * @param linkToAchievements - Whether achievement title links to achievements page
 */
interface AchievementItemProps {
  achievement: AchievementWithRelations;
  onImpactChange?: (id: string, impact: number) => void;
  onEdit?: (achievement: AchievementWithRelations) => void;
  onDelete?: (achievement: AchievementWithRelations) => void;
  readOnly?: boolean;
  showSourceBadge?: boolean;
  linkToAchievements?: boolean;
}

export function AchievementItem({
  achievement,
  onImpactChange,
  onEdit,
  onDelete,
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
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-4">
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
          {/* Action buttons: Edit and Delete */}
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(achievement)}
                aria-label="Edit achievement"
                className="h-9 w-9 p-0 md:px-2 md:w-auto"
              >
                <Edit2 className="size-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(achievement)}
                aria-label="Delete achievement"
                className="h-9 w-9 p-0 md:px-2 md:w-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
