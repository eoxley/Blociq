"use client"

import { useState } from 'react'
import { useFolders } from '@/hooks/inbox_v2'
import { RefreshCw, Plus, X } from 'lucide-react'
import { DroppableFolderItem } from './DroppableFolderItem'

interface FolderSidebarProps {
  selectedFolderId: string | null
  onFolderSelect: (folderId: string) => void
}

export default function FolderSidebar({ selectedFolderId, onFolderSelect }: FolderSidebarProps) {
  const { folders, isFallback, isLoading, refresh, addManualFolder } = useFolders()
  const [isAddingFolder, setIsAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full"></span>
          Folders
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAddingFolder(true)}
            className="p-1.5 text-[#4f46e5] hover:text-[#a855f7] hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-md transition-all duration-200"
            title="Add folder"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="p-1.5 text-gray-500 hover:text-[#4f46e5] hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 rounded-md transition-all duration-200"
            title="Refresh folders"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Add Folder Input */}
      {isAddingFolder && (
        <div className="mb-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
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
              className="px-3 py-2 text-sm bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-md hover:brightness-110 transition-all duration-200 font-medium"
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
        {folders.map((folder) => (
          <DroppableFolderItem
            key={folder.id}
            id={folder.id}
            displayName={folder.displayName}
            isSelected={selectedFolderId === folder.id}
            onSelect={onFolderSelect}
          />
        ))}
      </div>
    </div>
  )
}
