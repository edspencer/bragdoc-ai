import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export function Spinner({ className, size = 24, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      className={cn("animate-spin text-muted-foreground", className)}
      {...props}
    >
      <Loader2 size={size} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
