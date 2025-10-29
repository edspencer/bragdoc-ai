import { AppContent } from '@/components/shared/app-content';

export default function ReportDetailLoading() {
  return (
    <AppContent>
      {/* Skeleton for back link */}
      <div className="h-6 w-32 bg-muted animate-pulse rounded" />

      {/* Skeleton for title and metadata */}
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="flex gap-4">
          <div className="h-6 w-24 bg-muted animate-pulse rounded" />
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </div>
      </div>

      {/* Skeleton for content */}
      <div className="h-96 w-full bg-muted animate-pulse rounded" />
    </AppContent>
  );
}
