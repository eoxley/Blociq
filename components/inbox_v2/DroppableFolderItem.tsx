'use client'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { FolderIcon, ArrowRight, CheckCircle } from 'lucide-react'
import { memo, useState, useEffect, ReactNode } from 'react'

interface DroppableFolderItemProps {
  id: string
  displayName: string
  messageCount?: number
  isSelected?: boolean
  onSelect?: (folderId: string) => void
  className?: string
  icon?: ReactNode
}

export const DroppableFolderItem = memo(function DroppableFolderItem({ 
  id, 
  displayName, 
  messageCount, 
  isSelected, 
  onSelect,
  className,
  icon
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
        'hover:bg-gray-100 border border-transparent',
        'focus:outline-none focus:ring-0 focus:border-transparent',
        'focus-visible:outline-none focus-visible:ring-0 focus-visible:border-transparent',
        isOver 
          ? 'bg-gray-200 border-2 border-gray-300 shadow-md scale-[1.02] transform z-10' 
          : '',
        isSelected && !isOver ? 'bg-[#4f46e5] text-white font-medium' : '',
        isAnimating ? 'animate-pulse' : '',
        className
      )}
      onClick={handleClick}
      title={`${displayName}${messageCount ? ` (${messageCount})` : ''}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative">
          {icon || <FolderIcon className="h-4 w-4 flex-shrink-0" />}
          {isOver && (
            <div className="absolute inset-0 bg-gray-400 rounded-full animate-ping opacity-75" />
          )}
        </div>
        <span className={cn(
          'truncate text-sm font-medium transition-all duration-200',
          isOver ? 'text-gray-800 font-semibold' : isSelected ? 'text-white' : 'text-gray-700'
        )}>
          {displayName}
        </span>
      </div>
      
      {messageCount !== undefined && (
        <span className={cn(
          'text-xs px-2 py-1 rounded-full transition-all duration-200',
          isOver 
            ? 'bg-gray-200 text-gray-800 scale-110 font-semibold' 
            : isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
        )}>
          {messageCount}
        </span>
      )}
      
      {/* Drop indicator - neutral colors only */}
      {isOver && (
        <div className="absolute inset-0 bg-gray-200/30 border-2 border-gray-400 rounded-md pointer-events-none" />
      )}
      
      {/* Drop arrow indicator - neutral colors only */}
      {isOver && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <ArrowRight className="h-4 w-4 text-gray-600 animate-bounce" />
        </div>
      )}
      
      {/* Success indicator - neutral colors only */}
      {isOver && (
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <CheckCircle className="h-4 w-4 text-gray-500 animate-pulse" />
        </div>
      )}
      
      {/* Glow effect when dragging over - neutral colors only */}
      {isOver && (
        <div className="absolute inset-0 bg-gray-400/10 rounded-md pointer-events-none animate-ping" />
      )}
      
      {/* Drop zone highlight - neutral colors only */}
      {isOver && (
        <div className="absolute inset-0 bg-gray-500/5 rounded-md pointer-events-none border-2 border-dashed border-gray-400" />
      )}
    </div>
  )
})
