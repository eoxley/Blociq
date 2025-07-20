"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

<<<<<<< HEAD
import { cn } from "@/lib/utils"
=======
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("w-full h-2 bg-muted rounded", className)}
        {...props}
      >
        <div
          className="h-2 bg-primary rounded transition-all"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    );
  }
);
>>>>>>> locked-ui-baseline

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-gray-200",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 transition-all"
      style={{
        transform: `translateX(-${100 - (value || 0)}%)`,
        backgroundColor: 'var(--progress-color, #3b82f6)'
      }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
