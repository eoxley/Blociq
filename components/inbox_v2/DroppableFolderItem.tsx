'use client'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { FolderIcon } from 'lucide-react'
import { memo } from 'react'

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
        isOver ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 shadow-lg scale-[1.02]' : 'hover:bg-gray-50',
        isSelected ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300' : '',
        className
      )}
      onClick={handleClick}
      title={`${displayName}${messageCount ? ` (${messageCount})` : ''}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FolderIcon className={cn(
          'h-4 w-4 flex-shrink-0 transition-colors duration-200',
          isOver ? 'text-blue-600 scale-110' : 'text-gray-500 group-hover:text-gray-700'
        )} />
        <span className={cn(
          'truncate text-sm font-medium transition-colors duration-200',
          isOver ? 'text-blue-800' : 'text-gray-700'
        )}>
          {displayName}
        </span>
      </div>
      
      {messageCount !== undefined && (
        <span className={cn(
          'text-xs px-2 py-1 rounded-full transition-all duration-200',
          isOver ? 'bg-blue-200 text-blue-800 scale-110' : 'bg-gray-200 text-gray-600'
        )}>
          {messageCount}
        </span>
      )}
      
      {isOver && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 border-2 border-blue-400 rounded-md pointer-events-none animate-pulse" />
      )}
    </div>
  )
}
