'use client'
import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { memo } from 'react'

interface DraggableEmailRowProps {
  messageId: string
  sourceFolderId: string
  children: React.ReactNode
  className?: string
}

export const DraggableEmailRow = memo(function DraggableEmailRow({ messageId, sourceFolderId, children, className }: DraggableEmailRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `msg:${messageId}`,
    data: { messageId, sourceFolderId },
  })

  // Remove conflicting native drag handler and use only @dnd-kit
  const style = transform ? { 
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 'auto'
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-draggable="true"
      data-dragging={isDragging ? "true" : "false"}
      className={cn(
        'relative rounded-lg border bg-background cursor-grab active:cursor-grabbing select-none',
        isDragging ? 'opacity-50 shadow-xl scale-[1.02] z-50' : 'hover:shadow-md transition-all duration-150',
        className
      )}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  )
})
