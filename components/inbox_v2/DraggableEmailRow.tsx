'use client'
import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface DraggableEmailRowProps {
  messageId: string
  sourceFolderId: string
  children: React.ReactNode
  className?: string
}

export function DraggableEmailRow({ messageId, sourceFolderId, children, className }: DraggableEmailRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `msg:${messageId}`,
    data: { messageId, sourceFolderId },
  })

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border p-2 bg-background cursor-grab active:cursor-grabbing',
        isDragging ? 'opacity-60 shadow-lg scale-105' : 'hover:shadow-md transition-all duration-200',
        className
      )}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  )
}
