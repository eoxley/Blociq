'use client'
import { memo, useState } from 'react'
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
  const [isDragOver, setIsDragOver] = useState(false)

  const handleClick = () => {
    onSelect?.(id)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    onDrop(e, id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
    onDragOver(e)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={cn(
        'relative px-3 py-2 rounded-md cursor-pointer transition-all duration-200 flex items-center justify-between group',
        'hover:bg-gray-100',
        isSelected ? 'bg-[#4f46e5] text-white shadow-sm' : 'text-gray-700',
        isDragOver && !isSelected ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : '',
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
          isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
        )}>
          {messageCount}
        </span>
      )}
      
      {/* Drag over indicator */}
      {isDragOver && !isSelected && (
        <div className="absolute inset-0 bg-blue-500/10 rounded-md pointer-events-none" />
      )}
    </div>
  )
})
