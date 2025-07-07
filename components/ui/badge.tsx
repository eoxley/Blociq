import * as React from "react"
import { cn } from "@/lib/utils"

const badgeVariants = {
  default: "bg-gray-100 text-gray-800",
  destructive: "bg-red-100 text-red-800",
  success: "bg-green-100 text-green-800",
  outline: "border border-gray-300 text-gray-600",

  // BlocIQ-specific
  urgent: "bg-red-100 text-red-800",
  finance: "bg-cyan-100 text-cyan-800",
  complaint: "bg-yellow-100 text-yellow-800"
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
