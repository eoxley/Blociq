'use client'
import { memo } from 'react'
import { cn } from '@/lib/utils'

interface DraggableEmailRowProps {
  messageId: string
  sourceFolderId: string
  children: React.ReactNode
  className?: string
  onDragStart: (e: React.DragEvent, messageId: string, sourceFolderId: string) => void
}

export const DraggableEmailRow = memo(function DraggableEmailRow({ 
  messageId, 
  sourceFolderId, 
  children, 
  className,
  onDragStart 
}: DraggableEmailRowProps) {
  
  const handleDragStart = (e: React.DragEvent) => {
    onDragStart(e, messageId, sourceFolderId)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        'cursor-grab active:cursor-grabbing',
        className
      )}
    >
      {children}
    </div>
  )
})
