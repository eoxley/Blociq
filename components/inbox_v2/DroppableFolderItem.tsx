'use client'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { FolderIcon, ArrowRight, CheckCircle } from 'lucide-react'
import { memo, useState, useEffect } from 'react'

interface DroppableFolderItemProps {
  id: string
  displayName: string
  messageCount?: number
  isSelected?: boolean
  onSelect?: (folderId: string) => void
  className?: string
}

export const DroppableFolderItem = memo(function DroppableFolderItem({ 
  id, 
  displayName, 
  messageCount, 
  isSelected, 
  onSelect,
  className 
}: DroppableFolderItemProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder:${id}` })
  const [isAnimating, setIsAnimating] = useState(false)

  // Handle animation when drag over state changes
  useEffect(() => {
    if (isOver) {
      setIsAnimating(true)
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isOver])

  const handleClick = () => {
    onSelect?.(id)
  }

  return (
    <div
      ref={setNodeRef}
      data-folder-id={id}
      data-droppable="true"
      data-over={isOver ? "true" : "false"}
      className={cn(
        'relative px-3 py-2 rounded-md cursor-pointer transition-all duration-200 flex items-center justify-between group',
        'hover:bg-gray-50 border border-transparent',
        isOver 
          ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-500 shadow-lg scale-[1.02] transform z-10' 
          : '',
        isSelected && !isOver ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300' : '',
        isAnimating ? 'animate-pulse' : '',
        className
      )}
      onClick={handleClick}
      title={`${displayName}${messageCount ? ` (${messageCount})` : ''}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="relative">
          <FolderIcon className={cn(
            'h-4 w-4 flex-shrink-0 transition-all duration-200',
            isOver 
              ? 'text-blue-600 scale-125' 
              : 'text-gray-500 group-hover:text-gray-700'
          )} />
          {isOver && (
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75" />
          )}
        </div>
        <span className={cn(
          'truncate text-sm font-medium transition-all duration-200',
          isOver ? 'text-blue-800 font-semibold' : 'text-gray-700'
        )}>
          {displayName}
        </span>
      </div>
      
      {messageCount !== undefined && (
        <span className={cn(
          'text-xs px-2 py-1 rounded-full transition-all duration-200',
          isOver 
            ? 'bg-blue-200 text-blue-800 scale-110 font-semibold' 
            : 'bg-gray-200 text-gray-600'
        )}>
          {messageCount}
        </span>
      )}
      
      {/* Drop indicator */}
      {isOver && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-200/30 to-indigo-200/30 border-2 border-blue-500 rounded-md pointer-events-none" />
      )}
      
      {/* Drop arrow indicator */}
      {isOver && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <ArrowRight className="h-4 w-4 text-blue-600 animate-bounce" />
        </div>
      )}
      
      {/* Success indicator */}
      {isOver && (
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <CheckCircle className="h-4 w-4 text-green-600 animate-pulse" />
        </div>
      )}
      
      {/* Glow effect when dragging over */}
      {isOver && (
        <div className="absolute inset-0 bg-blue-400/10 rounded-md pointer-events-none animate-ping" />
      )}
      
      {/* Drop zone highlight */}
      {isOver && (
        <div className="absolute inset-0 bg-blue-500/5 rounded-md pointer-events-none border-2 border-dashed border-blue-400" />
      )}
    </div>
  )
})
