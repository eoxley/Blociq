import * as React from "react"
import { cn } from "@/lib/utils"

const badgeVariants = {
  default: "bg-slate-100 text-slate-700 border border-slate-200",
  destructive: "bg-error/10 text-error border border-error/20",
  success: "bg-success/10 text-success border border-success/20",
  warning: "bg-warning/10 text-warning border border-warning/20",
  info: "bg-info/10 text-info border border-info/20",
  outline: "border border-slate-300 text-slate-600",

  // BlocIQ-specific
  urgent: "bg-error/10 text-error border border-error/20",
  finance: "bg-primary/10 text-primary border border-primary/20",
  complaint: "bg-warning/10 text-warning border border-warning/20"
}

export function Badge({
  children,
  variant = "default",
  className = ""
}: {
  children: React.ReactNode
  variant?: keyof typeof badgeVariants
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
