import { Check } from "lucide-react"
import { memo } from "react"
import equal from "fast-deep-equal"

export const AchievementAction = memo(function AchievementAction({ action }: { action: any }) {
  const { achievements } = action

  if (!achievements || achievements.length === 0) {
    return <p>Extracting Achievements...</p>
  }

  return (
    <div className="flex gap-4 flex-wrap">
      {achievements.map((achievement: any) => (
        <AchievementCreated key={achievement.title} achievement={achievement} />
      ))}
    </div>
  )
}, (prevProps, nextProps) => {
  return equal(prevProps.action, nextProps.action)
})

export const AchievementCreated = memo(function AchievementCreated({ achievement }: { achievement: any }) {
  return (
    <div className="bg-slate-100 border border-slate-400 text-slate-700 px-2 py-1 rounded-md relative max-w-54" role="alert">
      <span className="inline-block align-middle mr-2">
        <Check className="size-4" />
      </span>

      <span className="block sm:inline text-sm">{achievement.title}</span>
    </div>
  )
}, (prevProps, nextProps) => {
  return equal(prevProps.achievement, nextProps.achievement)
})
