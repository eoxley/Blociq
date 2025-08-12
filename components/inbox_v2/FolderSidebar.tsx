"use client"

import { useState } from 'react'
import { useFolders } from '@/hooks/inbox_v2'
import { useInboxContext } from '@/app/(dashboard)/inbox/InboxV2'
import { RefreshCw, Folder, Inbox, Archive, Trash2, Send, FileText, Shield, Plus, X } from 'lucide-react'

interface FolderSidebarProps {
  selectedFolderId: string | null
  onFolderSelect: (folderId: string) => void
}

const getFolderIcon = (wellKnownName: string) => {
  switch (wellKnownName) {
    case 'inbox': return Inbox
    case 'drafts': return FileText
    case 'sentitems': return Send
    case 'deleteditems': return Trash2
    case 'archive': return Archive
    case 'junkemail': return Shield
    default: return Folder
  }
}

export default function FolderSidebar({ selectedFolderId, onFolderSelect }: FolderSidebarProps) {
  const { folders, isFallback, isLoading, refresh, addManualFolder } = useFolders()
  const { moveMessage } = useInboxContext()
  const [isAddingFolder, setIsAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      addManualFolder(newFolderName.trim())
      setNewFolderName('')
      setIsAddingFolder(false)
    }
  }

  const handleCancelAdd = () => {
    setNewFolderName('')
    setIsAddingFolder(false)
  }

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFolder(folderId)
  }

  const handleDragLeave = () => {
    setDragOverFolder(null)
  }

  const handleDrop = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    setDragOverFolder(null)
    
    // Get the message ID from the drag data
    const messageId = e.dataTransfer.getData('text/plain')
    
    if (messageId && folderId !== selectedFolderId) {
      try {
        await moveMessage(messageId, folderId)
      } catch (error) {
        console.error('Error moving message:', error)
      }
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Folders</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAddingFolder(true)}
            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            title="Add folder"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Refresh folders"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Add Folder Input */}
      {isAddingFolder && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
              autoFocus
            />
            <button
              onClick={handleAddFolder}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
            <button
              onClick={handleCancelAdd}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-1">
        {folders.map((folder) => {
          const Icon = getFolderIcon(folder.wellKnownName)
          const isSelected = selectedFolderId === folder.id
          const isDragOver = dragOverFolder === folder.id
          
          return (
            <div
              key={folder.id}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder.id)}
              className={`transition-all duration-200 ${
                isDragOver ? 'scale-105' : ''
              }`}
            >
              <button
                onClick={() => onFolderSelect(folder.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded-md transition-colors ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : isDragOver
                    ? 'bg-green-50 text-green-700 border-2 border-dashed border-green-400'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{folder.displayName}</span>
                {isDragOver && (
                  <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Drop here
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
