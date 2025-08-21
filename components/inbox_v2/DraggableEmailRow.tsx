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
    // Set proper data transfer for drag-and-drop to work
    e.dataTransfer.setData('text/plain', messageId)
    e.dataTransfer.setData('application/json', JSON.stringify({
      messageId,
      sourceFolderId
    }))
    
    // Set drag image and effect
    e.dataTransfer.effectAllowed = 'move'
    
    // Call the parent handler
    onDragStart(e, messageId, sourceFolderId)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all duration-200',
        'hover:bg-gray-50',
        className
      )}
    >
      {children}
    </div>
  )
})
