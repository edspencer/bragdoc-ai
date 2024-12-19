import { Metadata } from "next"
import { PageHeader } from "@/components/shared/page-header"

export const metadata: Metadata = {
  title: "Achievements | Bragdoc.ai",
  description: "View and manage your professional achievements",
}

export default function AchievementsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Achievements"
        description="View and manage your professional achievements"
      />
      <div className="rounded-lg border p-8 text-center">
        <h2 className="text-lg font-semibold">Coming Soon</h2>
        <p className="mt-2 text-muted-foreground">
          Achievement management features are currently in development.
        </p>
      </div>
    </div>
  )
}
