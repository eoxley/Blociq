"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface SheetContentProps {
  side?: "left" | "right"
  className?: string
  children: React.ReactNode
}

interface SheetHeaderProps {
  className?: string
  children: React.ReactNode
}

interface SheetTitleProps {
  className?: string
  children: React.ReactNode
}

const Sheet = ({ open, onOpenChange, children }: SheetProps) => {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-[80]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      {children}
    </div>
  )
}

const SheetContent = ({ side = "right", className, children }: SheetContentProps) => {
  return (
    <div className={cn(
      "fixed top-0 h-full bg-background border-l shadow-xl transition-transform duration-300",
      side === "right" ? "right-0 border-l" : "left-0 border-r",
      className
    )}>
      {children}
    </div>
  )
}

const SheetHeader = ({ className, children }: SheetHeaderProps) => {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>
      {children}
    </div>
  )
}

const SheetTitle = ({ className, children }: SheetTitleProps) => {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
      {children}
    </h2>
  )
}

export { Sheet, SheetContent, SheetHeader, SheetTitle }
