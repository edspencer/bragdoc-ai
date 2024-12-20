import { Check } from "lucide-react"

export function AchievementAction({ action }: { action: any }) {
  const {achievements} = action

  if (!achievements || achievements.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {achievements.map((achievement: any) => (
        <AchievementCreated key={achievement.title} achievement={achievement} />
      ))}
    </div>
  );
}

export function AchievementCreated({achievement}: {achievement: any}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <span className="inline-block align-middle mr-2">
          <Check className="size-4" />
        </span>
        <span className="block sm:inline text-sm">{achievement.title}</span>
      </div>
    </div>
  );
}