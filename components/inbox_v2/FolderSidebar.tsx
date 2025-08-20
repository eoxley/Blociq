"use client"

import { useState, useEffect } from 'react'
import { useFolders } from '@/hooks/inbox_v2'
import { RefreshCw, Plus, X, Inbox, Send, FileText, Archive, Trash2, Folder } from 'lucide-react'
import { DroppableFolderItem } from './DroppableFolderItem'

interface FolderSidebarProps {
  selectedFolderId: string | null
  onFolderSelect: (folderId: string) => void
}

// Icon mapping for well-known folders
const getFolderIcon = (wellKnownName: string | null) => {
  switch (wellKnownName) {
    case 'inbox':
      return <Inbox className="h-4 w-4" />
    case 'sentitems':
      return <Send className="h-4 w-4" />
    case 'drafts':
      return <FileText className="h-4 w-4" />
    case 'archive':
      return <Archive className="h-4 w-4" />
    case 'deleteditems':
      return <Trash2 className="h-4 w-4" />
    case 'junkemail':
      return <Trash2 className="h-4 w-4" />
    default:
      return <Folder className="h-4 w-4" />
  }
}

export default function FolderSidebar({ selectedFolderId, onFolderSelect }: FolderSidebarProps) {
  const { folders, isFallback, isLoading, refresh, addManualFolder } = useFolders()
  const [isAddingFolder, setIsAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Debug logging
  useEffect(() => {
    console.log('FolderSidebar folders:', {
      total: folders.length,
      folders: folders.map(f => ({ id: f.id, name: f.displayName, type: f.wellKnownName || 'custom' })),
      isFallback,
      isLoading
    })
  }, [folders, isFallback, isLoading])

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      console.log('Adding manual folder:', newFolderName.trim())
      addManualFolder(newFolderName.trim())
      setNewFolderName('')
      setIsAddingFolder(false)
    }
  }

  const handleCancelAdd = () => {
    setNewFolderName('')
    setIsAddingFolder(false)
  }

  return (
    <div className="space-y-2">
      {/* Add Folder Input */}
      {isAddingFolder && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
              autoFocus
            />
            <button
              onClick={handleAddFolder}
              className="px-3 py-2 text-sm bg-[#4f46e5] text-white rounded-md hover:bg-[#4338ca] transition-colors font-medium"
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
      
      {/* Folder List */}
      <div className="space-y-1">
        {folders.map((folder) => (
          <DroppableFolderItem
            key={folder.id}
            id={folder.id}
            displayName={folder.displayName}
            isSelected={selectedFolderId === folder.id}
            onSelect={onFolderSelect}
            icon={getFolderIcon(folder.wellKnownName)}
          />
        ))}
      </div>

      {/* Add Folder Button */}
      <button
        onClick={() => setIsAddingFolder(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Folder
      </button>
    </div>
  )
}
