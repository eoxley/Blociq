"use client"
import { cn } from "@/lib/utils"

export default function ChatMessage({ msg, loading }:{ msg?: any; loading?: boolean }) {
  if (loading) {
    return (
      <div className="flex gap-2 items-start">
        <div className="h-6 w-6 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
        </div>
      </div>
    )
  }
  
  const mine = msg.role === "user"
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
        mine ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {msg.content}
      </div>
    </div>
  )
}
