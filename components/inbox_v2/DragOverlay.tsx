'use client'
import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface DragOverlayProps {
  children: React.ReactNode
}

export function DragOverlay({ children }: DragOverlayProps) {
  return (
    <DndKitDragOverlay>
      <div className="opacity-80 shadow-2xl rounded-lg border-2 border-blue-400 bg-white transform rotate-2 scale-105">
        {children}
      </div>
    </DndKitDragOverlay>
  )
}
