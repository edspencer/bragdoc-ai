import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AchievementsContent } from "@/components/achievements/AchievementsContent";

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
      <AchievementsContent />
    </div>
  );
}
