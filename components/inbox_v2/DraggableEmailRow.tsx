'use client'
import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { memo, useState, useEffect } from 'react'
import { GripVertical } from 'lucide-react'

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

  const [isHovered, setIsHovered] = useState(false)

  const style = transform ? { 
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 'auto'
  } : undefined

  // Handle hover state for better visual feedback
  useEffect(() => {
    if (isDragging) {
      setIsHovered(false)
    }
  }, [isDragging])

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-draggable="true"
      data-dragging={isDragging ? "true" : "false"}
      className={cn(
        'relative rounded-lg border bg-background transition-all duration-200',
        isDragging 
          ? 'opacity-60 shadow-2xl scale-[1.02] z-50 cursor-grabbing' 
          : 'hover:shadow-md cursor-grab active:cursor-grabbing',
        'select-none touch-none', // Prevent text selection and touch conflicts
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...listeners}
      {...attributes}
    >
      {/* Enhanced drag handle indicator */}
      <div className={cn(
        'absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-md transition-all duration-200',
        'opacity-0 hover:opacity-100 group-hover:opacity-100',
        isDragging && 'opacity-100',
        isHovered && 'opacity-100'
      )}>
        <div className={cn(
          'w-1 h-4 bg-gray-300 rounded-full transition-all duration-200',
          isDragging && 'bg-zinc-500 scale-110',
          isHovered && 'bg-gray-400'
        )} />
      </div>
      
      {/* Drag handle icon */}
      <div className={cn(
        'absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md transition-all duration-200',
        'opacity-0 hover:opacity-100 group-hover:opacity-100',
        isDragging && 'opacity-100',
        isHovered && 'opacity-100'
      )}>
        <GripVertical className={cn(
          'h-4 w-4 text-gray-400 transition-all duration-200',
          isDragging && 'text-zinc-500 scale-110',
          isHovered && 'text-gray-500'
        )} />
      </div>
      
      {children}
      
      {/* Enhanced drag overlay when dragging - neutral colors only */}
      {isDragging && (
        <div className="absolute inset-0 bg-zinc-50/50 border-2 border-zinc-400 rounded-lg pointer-events-none">
          <div className="absolute top-2 left-2 w-2 h-2 bg-zinc-500 rounded-full animate-pulse" />
          <div className="absolute bottom-2 right-2 w-2 h-2 bg-zinc-500 rounded-full animate-pulse" />
        </div>
      )}
      
      {/* Hover indicator - neutral colors only */}
      {isHovered && !isDragging && (
        <div className="absolute inset-0 bg-zinc-50/20 border border-zinc-200 rounded-lg pointer-events-none transition-all duration-200" />
      )}
    </div>
  )
})
