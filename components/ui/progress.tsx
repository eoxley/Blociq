import * as React from "react";
import { cn } from "../../lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

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

Progress.displayName = "Progress";

export { Progress };
