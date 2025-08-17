'use client'
import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface DragOverlayProps {
  children: React.ReactNode
}

export function DragOverlay({ children }: DragOverlayProps) {
  return (
    <DndKitDragOverlay>
      <div className="opacity-95 shadow-2xl rounded-lg border-2 border-blue-400 bg-white transform rotate-1 scale-105 transition-all duration-200 animate-pulse">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-blue-400/20 rounded-lg blur-sm -z-10" />
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* Corner indicators */}
        <div className="absolute top-2 left-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <div className="absolute bottom-2 left-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <div className="absolute bottom-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      </div>
    </DndKitDragOverlay>
  )
}
