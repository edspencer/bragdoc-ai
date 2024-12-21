import * as React from "react"
import { cn } from "@/lib/utils"
import { Star, StarHalf } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const impactLabels: Record<number, string> = {
  1: "Low Impact",
  2: "Medium Impact",
  3: "High Impact",
}

const impactDescriptions: Record<number, string> = {
  1: "Routine tasks or minor improvements with individual/small team benefit",
  2: "Notable improvements with team/department level impact",
  3: "Major initiatives with organization-wide strategic impact",
}

export interface ImpactRatingProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "onChange"> {
  value?: number | null
  onChange?: (value: number) => void
  source?: "user" | "llm" | null
  readOnly?: boolean
  updatedAt?: Date | null
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

  const handleMouseEnter = (starValue: number) => {
    if (!readOnly) {
      setHoveredValue(starValue)
    }
  }

  const handleMouseLeave = () => {
    setHoveredValue(null)
  }

  const handleClick = (starValue: number) => {
    if (!readOnly && onChange) {
      onChange(starValue)
    }
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

    const tooltipContent = (
      <div className="max-w-xs">
        <div className="font-semibold">{impactLabels[starValue as 1 | 2 | 3]}</div>
        <div className="text-sm text-muted-foreground">
          {impactDescriptions[starValue as 1 | 2 | 3]}
        </div>
        {starValue === (value ?? 2) && source && updatedAt && (
          <div className="mt-1 text-xs text-muted-foreground">
            Set by {source === "llm" ? "AI" : "user"}
            {updatedAt && ` on ${new Date(updatedAt).toLocaleDateString()}`}
          </div>
        )}
      </div>
    )

    return (
      <TooltipProvider key={starValue}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Star
              className={starClass}
              onMouseEnter={() => handleMouseEnter(starValue)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(starValue)}
              data-testid={`impact-star-${starValue}`}
              role="button"
              aria-label={`Rate impact ${starValue} out of 3 stars`}
            />
          </TooltipTrigger>
          <TooltipContent>
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {[1, 2, 3].map(renderStar)}
    </div>
  )
}
