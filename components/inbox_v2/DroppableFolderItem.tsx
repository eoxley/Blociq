'use client'
import { memo } from 'react'
import { cn } from '@/lib/utils'
import { FolderIcon } from 'lucide-react'

interface DroppableFolderItemProps {
  id: string
  displayName: string
  messageCount?: number
  isSelected?: boolean
  onSelect?: (folderId: string) => void
  className?: string
  icon?: React.ReactNode
  onDrop: (e: React.DragEvent, folderId: string) => void
  onDragOver: (e: React.DragEvent) => void
}

export const DroppableFolderItem = memo(function DroppableFolderItem({ 
  id, 
  displayName, 
  messageCount, 
  isSelected, 
  onSelect,
  className,
  icon,
  onDrop,
  onDragOver
}: DroppableFolderItemProps) {

  const handleClick = () => {
    onSelect?.(id)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onDrop(e, id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver(e)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleClick}
      className={cn(
        'relative px-3 py-2 rounded-md cursor-pointer transition-colors duration-200 flex items-center justify-between group',
        'hover:bg-gray-100',
        isSelected ? 'text-[#4f46e5] font-medium' : '',
        className
      )}
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
        </div>
        <span className={cn(
          'truncate text-sm font-medium',
          isSelected ? 'text-white' : 'text-gray-700'
        )}>
          {displayName}
        </span>
      </div>
      
      {messageCount !== undefined && (
        <span className={cn(
          'text-xs px-2 py-1 rounded-full',
          isSelected ? 'bg-[#4f46e5]/10 text-[#4f46e5]' : 'bg-gray-200 text-gray-600'
        )}>
          {messageCount}
        </span>
      )}
    </div>
  )
})
