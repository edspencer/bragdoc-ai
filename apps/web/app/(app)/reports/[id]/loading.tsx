export default function ReportDetailLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-6 p-6">
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
        </div>
      </div>
    </div>
  );
}
