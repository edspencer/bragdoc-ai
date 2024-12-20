import { useAchievements } from '@/hooks/use-achievements';
import { useAchievementMutations } from '@/hooks/use-achievement-mutations';
import { AchievementCard } from './AchievementCard';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { AchievementFilters } from '@/lib/types/achievement';

interface AchievementListProps {
  page: number;
  onPageChange: (page: number) => void;
  filters?: Partial<AchievementFilters>;
}

export function AchievementList({
  page,
  onPageChange,
  filters,
}: AchievementListProps) {
  const { achievements, pagination, isLoading } = useAchievements({
    page,
    filters,
  });

  const { updateAchievement, deleteAchievement } = useAchievementMutations();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-full h-32 bg-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (!achievements.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No achievements found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {achievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            onEdit={() => {
              // TODO: Open edit modal
            }}
            onDelete={() => {
              if (confirm('Are you sure you want to delete this achievement?')) {
                deleteAchievement(achievement.id);
              }
            }}
            onArchive={() => {
              updateAchievement(achievement.id, {
                isArchived: !achievement.isArchived,
              });
            }}
          />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) onPageChange(page - 1);
                }}
              />
            </PaginationItem>

            {[...Array(pagination.totalPages)].map((_, i) => {
              const pageNum = i + 1;
              const isCurrentPage = pageNum === page;
              const isNearCurrent = Math.abs(pageNum - page) <= 1;
              const isFirstOrLast = pageNum === 1 || pageNum === pagination.totalPages;

              if (!isNearCurrent && !isFirstOrLast) {
                if (pageNum === 2 || pageNum === pagination.totalPages - 1) {
                  return <PaginationEllipsis key={pageNum} />;
                }
                return null;
              }

              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    isActive={isCurrentPage}
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(pageNum);
                    }}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < pagination.totalPages) onPageChange(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
