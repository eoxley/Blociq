"use client"

import { useFolders } from '@/hooks/inbox_v2'
import { RefreshCw, Folder, Inbox, Archive, Trash2, Send, FileText, Shield } from 'lucide-react'

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
  const { folders, isFallback, isLoading, refresh } = useFolders()

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Folders</h3>
        <button
          onClick={() => refresh()}
          disabled={isLoading}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Refresh folders"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="text-xs text-gray-500 mb-3 px-1">
        {isFallback ? "Using default folders (Graph unavailable)" : "Connected to Outlook"}
      </div>
      
      <div className="space-y-1">
        {folders.map((folder) => {
          const Icon = getFolderIcon(folder.wellKnownName)
          const isSelected = selectedFolderId === folder.id
          
          return (
            <button
              key={folder.id}
              onClick={() => onFolderSelect(folder.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded-md transition-colors ${
                isSelected
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{folder.displayName}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
