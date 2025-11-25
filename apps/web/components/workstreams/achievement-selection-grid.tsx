'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface AchievementForSelection {
  id: string;
  title: string;
  impact: number | null;
  summary: string | null;
}

interface AchievementSelectionGridProps {
  achievements: AchievementForSelection[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function AchievementSelectionGrid({
  achievements,
  selectedIds,
  onSelectionChange,
}: AchievementSelectionGridProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');

  // Debounce search input by 200ms
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Memoize filtered and sorted achievements
  const filteredAndSorted = React.useMemo(() => {
    let filtered = achievements;

    // Apply search filter (case-insensitive substring matching)
    if (debouncedQuery) {
      const query = debouncedQuery.toLowerCase();
      filtered = filtered.filter((a) => a.title.toLowerCase().includes(query));
    }

    // Sort by impact descending (highest first)
    return filtered.sort((a, b) => {
      const impactA = a.impact ?? Number.NEGATIVE_INFINITY;
      const impactB = b.impact ?? Number.NEGATIVE_INFINITY;
      return impactB - impactA;
    });
  }, [achievements, debouncedQuery]);

  // Truncate summary to 80 chars
  const truncateSummary = (text: string | null): string => {
    if (!text) return '';
    return text.length > 80 ? `${text.substring(0, 80)}...` : text;
  };

  // Handle checkbox change
  const handleCheckboxChange = (achievementId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, achievementId]);
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== achievementId));
    }
  };

  // Handle row click to toggle checkbox
  const handleRowClick = (achievementId: string) => {
    const isSelected = selectedIds.includes(achievementId);
    handleCheckboxChange(achievementId, !isSelected);
  };

  // Render empty state
  if (achievements.length === 0) {
    return (
      <div className="space-y-2">
        <Input
          placeholder="Search achievements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled
          className="text-sm"
        />
        <div className="text-center py-8 text-sm text-muted-foreground">
          No unassigned achievements available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <Input
        placeholder="Search achievements..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="text-sm"
      />

      {/* Selection Badge */}
      {selectedIds.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {selectedIds.length} selected
        </div>
      )}

      {/* Achievement Table */}
      <div className="border rounded-md max-h-80 overflow-y-auto overflow-x-hidden">
        {filteredAndSorted.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No achievements match your search
          </div>
        ) : (
          <Table className="table-fixed w-full">
            <TableHeader className="sticky top-0 bg-background">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8 px-2">
                  <div className="flex items-center justify-center">
                    <Checkbox disabled />
                  </div>
                </TableHead>
                <TableHead className="text-sm">Title</TableHead>
                <TableHead className="text-right text-sm w-20">
                  Impact
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.map((achievement) => (
                <TableRow
                  key={achievement.id}
                  className="cursor-pointer hover:bg-muted/50 text-xs"
                  onClick={() => handleRowClick(achievement.id)}
                >
                  <TableCell className="w-8 px-2">
                    <Checkbox
                      checked={selectedIds.includes(achievement.id)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(achievement.id, checked as boolean)
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell className="py-2 overflow-hidden">
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {achievement.title}
                      </div>
                      {achievement.summary && (
                        <div className="text-muted-foreground text-xs truncate">
                          {truncateSummary(achievement.summary)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-2 text-sm">
                    {achievement.impact !== null ? (
                      <span className="font-medium">
                        {Math.min(achievement.impact, 10)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
