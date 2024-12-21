import * as React from "react"
import { cn } from "@/lib/utils"
import { Star, StarHalf } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface ImpactRatingProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "onChange"> {
  value?: number | null
  onChange?: (value: number) => void
  source?: "user" | "llm" | null
  readOnly?: boolean
  updatedAt?: Date | null
}

const impactLabels: Record<number, string> = {
  1: "Low impact - Minor achievements and routine tasks",
  2: "Medium impact - Notable achievements that show growth",
  3: "High impact - Major achievements with significant impact",
}

export function ImpactRating({
  value,
  onChange,
  source = "llm",
  readOnly = false,
  updatedAt,
  className,
  ...props
}: ImpactRatingProps) {
  const [hoveredValue, setHoveredValue] = React.useState<number | null>(null)

  const handleStarClick = (starValue: number) => {
    if (readOnly) return
    onChange?.(starValue)
  }

  const renderStar = (starValue: number) => {
    const effectiveValue = (hoveredValue ?? value ?? 2)
    const isActive = effectiveValue >= starValue
    const starClass = cn(
      "w-5 h-5 transition-colors",
      isActive ? "text-yellow-400" : "text-gray-300",
      !readOnly && "cursor-pointer hover:text-yellow-400",
      source === "llm" && "opacity-80"
    )

    return (
      <TooltipTrigger asChild>
        <Star
          className={starClass}
          fill={isActive ? "currentColor" : "none"}
          onClick={() => handleStarClick(starValue)}
          onMouseEnter={() => !readOnly && setHoveredValue(starValue)}
          onMouseLeave={() => !readOnly && setHoveredValue(null)}
          data-testid={`impact-star-${starValue}`}
        />
      </TooltipTrigger>
    )
  }

  const sourceText = source === "llm" ? "AI-suggested" : source === "user" ? "User-defined" : ""
  const timeText = updatedAt
    ? `Last updated ${updatedAt.toLocaleDateString()}`
    : ""
  const tooltipText = `${impactLabels[value as 1 | 2 | 3] ?? ""}\n${sourceText}${
    timeText ? `\n${timeText}` : ""
  }`

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <div
          className={cn(
            "flex items-center gap-1 p-1",
            source === "llm" && "opacity-90",
            className
          )}
          {...props}
        >
          {[1, 2, 3].map((starValue) => renderStar(starValue))}
        </div>
        <TooltipContent>
          <p className="text-sm whitespace-pre-line">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
