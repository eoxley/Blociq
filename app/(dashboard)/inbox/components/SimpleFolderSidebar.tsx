'use client'

import React from 'react'

interface Folder {
  id: string
  label: string
  count: number
  icon: string
}

interface SimpleFolderSidebarProps {
  folders: Folder[]
  selectedFolder?: string
  onFolderSelect?: (folderId: string) => void
}

export default function SimpleFolderSidebar({ 
  folders, 
  selectedFolder = 'inbox',
  onFolderSelect 
}: SimpleFolderSidebarProps) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Folders</h3>
      <div className="space-y-2">
        {folders.map((folder) => (
          <div
            key={folder.id}
            onClick={() => onFolderSelect?.(folder.id)}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
              selectedFolder === folder.id 
                ? 'bg-indigo-100 border border-indigo-200' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{folder.icon}</span>
              <span className="font-medium">{folder.label}</span>
            </div>
            <span className={`text-sm px-2 py-1 rounded-full ${
              selectedFolder === folder.id
                ? 'bg-indigo-200 text-indigo-800'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {folder.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
} 