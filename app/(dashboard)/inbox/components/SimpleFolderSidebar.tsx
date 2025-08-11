// If a TDZ error persists, check for circular imports and call sites at module scope.
"use client";

import React, { useState } from 'react';
import { FolderOpen, Plus, RefreshCw } from 'lucide-react';
import { useOutlookFolders } from '@/hooks/useOutlookFolders';
import CreateFolderModal from './CreateFolderModal';

interface Folder {
  id: string
  name: string
  unread: number
  total: number
  isStandard: boolean
}

interface SimpleFolderSidebarProps {
  selectedFolder?: string
  onFolderSelect?: (folderId: string) => void
  onEmailDrop?: (emailId: string, folderId: string) => void
}

export default function SimpleFolderSidebar({ 
  selectedFolder = 'inbox',
  onFolderSelect,
  onEmailDrop
}: SimpleFolderSidebarProps) {
  const { folders, isLoading, error, refresh } = useOutlookFolders();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // Fallback folders if API fails
  const fallback = ["Inbox", "Drafts", "Sent", "Deleted", "Archive"].map((name, i) => ({
    id: `fallback-${i}`,
    name,
    unread: 0,
    total: 0,
    isStandard: true,
  }));

  const list = folders.length ? folders : fallback;

  const handleFolderCreated = (newFolder: any) => {
    // Refresh folders after creating a new one
    refresh();
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverFolder(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    
    const emailId = e.dataTransfer.getData('emailId');
    if (emailId && onEmailDrop) {
      onEmailDrop(emailId, folderId);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Folders</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh()}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh folders"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Create new folder"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}
        
        {!isLoading && (
          <div className="space-y-2">
            {list.map((folder) => (
              <div
                key={folder.id}
                onClick={() => onFolderSelect?.(folder.id)}
                onDragOver={(e) => handleDragOver(e, folder.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder.id)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedFolder === folder.id 
                    ? 'bg-indigo-100 border border-indigo-200' 
                    : dragOverFolder === folder.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {folder.isStandard ? (
                    <span className="text-lg">📁</span>
                  ) : (
                    <FolderOpen className="h-4 w-4 text-blue-600" />
                  )}
                  <span className="font-medium">{folder.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    selectedFolder === folder.id
                      ? 'bg-indigo-200 text-indigo-800'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {folder.unread || ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="px-3 py-3 text-xs text-amber-700 bg-amber-50 rounded-lg">
            Couldn't load folders. Showing defaults. (Check Graph permissions/token.)
          </div>
        )}

        {!isLoading && list.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Folder className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No folders yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
            >
              Create your first folder
            </button>
          </div>
        )}
      </div>

      <CreateFolderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onFolderCreated={handleFolderCreated}
      />
    </>
  )
} 