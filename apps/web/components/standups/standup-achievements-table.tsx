'use client';
import {
  IconStar,
  IconStarFilled,
  IconFolder,
  IconBuilding,
} from '@tabler/icons-react';

import { Badge } from 'components/ui/badge';
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
import { Checkbox } from 'components/ui/checkbox';

interface Achievement {
  id: string;
  title: string;
  summary: string | null;
  impact: number;
  projectName: string | null;
  companyName: string | null;
  createdAt: Date;
  source: string;
}

interface StandupAchievementsTableProps {
  achievements: Achievement[];
  selectedAchievements: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onImpactChange: (id: string, impact: number) => void;
  isLoading?: boolean;
  title?: string;
  showCheckboxes?: boolean;
}

function StarRating({
  rating,
  onRatingChange,
}: { rating: number; onRatingChange: (rating: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <Button
          key={star}
          variant="ghost"
          size="icon"
          className="size-4 p-0 hover:bg-transparent"
          onClick={() => onRatingChange(star)}
        >
          {star <= rating ? (
            <IconStarFilled className="size-3 fill-yellow-400 text-yellow-400" />
          ) : (
            <IconStar className="size-3 text-muted-foreground hover:text-yellow-400" />
          )}
        </Button>
      ))}
    </div>
  );
}

export function StandupAchievementsTable({
  achievements,
  selectedAchievements,
  onSelectionChange,
  onImpactChange,
  isLoading = false,
  title = 'Recent Achievements',
  showCheckboxes = true,
}: StandupAchievementsTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(achievements.map((a) => a.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectAchievement = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedAchievements, id]);
    } else {
      onSelectionChange(
        selectedAchievements.filter((selectedId) => selectedId !== id),
      );
    }
  };

  const allSelected =
    achievements.length > 0 &&
    achievements.every((a) => selectedAchievements.includes(a.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                {showCheckboxes && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all achievements"
                    />
                  </TableHead>
                )}
                <TableHead>Achievement</TableHead>
                <TableHead>Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={showCheckboxes ? 3 : 2}
                    className="text-center text-muted-foreground py-8"
                  >
                    Loading achievements...
                  </TableCell>
                </TableRow>
              ) : achievements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={showCheckboxes ? 3 : 2}
                    className="text-center text-muted-foreground py-8"
                  >
                    No achievements found
                  </TableCell>
                </TableRow>
              ) : (
                achievements.map((achievement) => (
                  <TableRow key={achievement.id}>
                    {showCheckboxes && (
                      <TableCell>
                        <Checkbox
                          checked={selectedAchievements.includes(
                            achievement.id,
                          )}
                          onCheckedChange={(checked) =>
                            handleSelectAchievement(
                              achievement.id,
                              checked as boolean,
                            )
                          }
                          aria-label={`Select ${achievement.title}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <div className="font-medium">{achievement.title}</div>
                        {achievement.summary && (
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {achievement.summary}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {achievement.projectName && (
                            <div className="flex items-center gap-1">
                              <IconFolder className="size-3" />
                              <span>{achievement.projectName}</span>
                            </div>
                          )}
                          {achievement.companyName && (
                            <div className="flex items-center gap-1">
                              <IconBuilding className="size-3" />
                              <span>{achievement.companyName}</span>
                            </div>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {achievement.source}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StarRating
                        rating={achievement.impact}
                        onRatingChange={(rating) =>
                          onImpactChange(achievement.id, rating)
                        }
                      />
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
