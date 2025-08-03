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
}

export default function SimpleFolderSidebar({ folders }: SimpleFolderSidebarProps) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Folders</h3>
      <div className="space-y-2">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{folder.icon}</span>
              <span className="font-medium">{folder.label}</span>
            </div>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {folder.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
} 