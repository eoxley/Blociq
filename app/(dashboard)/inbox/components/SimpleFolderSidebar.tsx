'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Folder, FolderOpen, Trash2 } from 'lucide-react'
import CreateFolderModal from './CreateFolderModal'

interface Folder {
  id: string
  label: string
  count: number
  icon: string
  isCustom?: boolean
}

interface SimpleFolderSidebarProps {
  folders: Folder[]
  selectedFolder?: string
  onFolderSelect?: (folderId: string) => void
  onEmailDrop?: (emailId: string, folderId: string) => void
}

export default function SimpleFolderSidebar({ 
  folders, 
  selectedFolder = 'inbox',
  onFolderSelect,
  onEmailDrop
}: SimpleFolderSidebarProps) {
  const [customFolders, setCustomFolders] = useState<Folder[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // Fetch custom folders on component mount
  useEffect(() => {
    const fetchCustomFolders = async () => {
      try {
        console.log('📁 Fetching custom folders...');
        const response = await fetch('/api/folders');
        if (response.ok) {
          const data = await response.json();
          console.log('📁 Folders response:', data);
          const customFoldersData = data.folders.map((folder: any) => ({
            id: folder.id,
            label: folder.name,
            count: 0, // Will be calculated separately
            icon: '📁',
            isCustom: true
          }));
          setCustomFolders(customFoldersData);
          console.log('✅ Custom folders loaded:', customFoldersData.length);
        } else {
          console.error('❌ Failed to fetch folders:', response.status);
        }
      } catch (error) {
        console.error('❌ Failed to fetch custom folders:', error);
        // Don't show error to user, just log it
      }
    };

    fetchCustomFolders();
  }, []);

  const handleFolderCreated = (newFolder: any) => {
    const folderData = {
      id: newFolder.id,
      label: newFolder.name,
      count: 0,
      icon: '📁',
      isCustom: true
    };
    setCustomFolders(prev => [...prev, folderData]);
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
    console.log('📁 Drop event:', { emailId, folderId });
    
    if (emailId && onEmailDrop) {
      console.log('📁 Calling onEmailDrop with:', emailId, folderId);
      onEmailDrop(emailId, folderId);
    } else {
      console.warn('⚠️ Missing emailId or onEmailDrop callback');
    }
  };

  const allFolders = [...folders, ...customFolders];

  return (
    <>
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Folders</h3>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Create new folder"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        
        <div className="space-y-2">
          {allFolders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => onFolderSelect?.(folder.id)}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder.id)}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedFolder === folder.id 
                  ? 'bg-indigo-100 border-2 border-indigo-200 shadow-sm' 
                  : dragOverFolder === folder.id
                  ? 'bg-blue-50 border-2 border-blue-400 shadow-md scale-105'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {folder.isCustom ? (
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                ) : (
                  <span className="text-lg">{folder.icon}</span>
                )}
                <span className="font-medium">{folder.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm px-2 py-1 rounded-full ${
                  selectedFolder === folder.id
                    ? 'bg-indigo-200 text-indigo-800'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {folder.count}
                </span>
                {folder.isCustom && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle folder deletion
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete folder"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {allFolders.length === 0 && (
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