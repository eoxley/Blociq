'use client'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { FolderIcon } from 'lucide-react'

interface DroppableFolderItemProps {
  id: string
  displayName: string
  messageCount?: number
  isSelected?: boolean
  onSelect?: (folderId: string) => void
  className?: string
}

export function DroppableFolderItem({ 
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
      className={cn(
        'px-3 py-2 rounded-md cursor-pointer transition-all duration-200 flex items-center justify-between group',
        isOver ? 'bg-blue-100 border-2 border-blue-300 shadow-md' : 'hover:bg-gray-100',
        isSelected ? 'bg-blue-50 border border-blue-200' : '',
        className
      )}
      onClick={handleClick}
      title={`${displayName}${messageCount ? ` (${messageCount})` : ''}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FolderIcon className={cn(
          'h-4 w-4 flex-shrink-0',
          isOver ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
        )} />
        <span className={cn(
          'truncate text-sm',
          isOver ? 'text-blue-800 font-medium' : 'text-gray-700'
        )}>
          {displayName}
        </span>
      </div>
      
      {messageCount !== undefined && (
        <span className={cn(
          'text-xs px-2 py-1 rounded-full',
          isOver ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
        )}>
          {messageCount}
        </span>
      )}
      
      {isOver && (
        <div className="absolute inset-0 bg-blue-50 border-2 border-blue-300 rounded-md pointer-events-none animate-pulse" />
      )}
    </div>
  )
}
