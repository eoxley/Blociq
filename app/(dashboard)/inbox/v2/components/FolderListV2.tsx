'use client';

import { Inbox, Archive, Trash2, Folder } from 'lucide-react';

interface FolderListV2Props {
  folders: Array<{
    id: string;
    name: string;
    count: number;
    type?: 'inbox' | 'archive' | 'deleted' | 'custom';
  }>;
  selectedFolderId: string;
  onSelect: (folderId: string) => void;
  onDropEmail: (emailId: string, folderId: string) => void;
}

export default function FolderListV2({ folders, selectedFolderId, onSelect, onDropEmail }: FolderListV2Props) {
  const getFolderIcon = (type?: string) => {
    switch (type) {
      case 'inbox':
        return <Inbox className="h-4 w-4" />;
      case 'archive':
        return <Archive className="h-4 w-4" />;
      case 'deleted':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Folder className="h-4 w-4" />;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const emailId = e.dataTransfer.getData('emailId');
    if (emailId) {
      onDropEmail(emailId, folderId);
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Folders</h2>
      </div>
      
      <div className="flex-1 p-2">
        <div className="space-y-1">
          {folders.map((folder) => {
            const Icon = getFolderIcon(folder.type);
            const isSelected = selectedFolderId === folder.id;
            
            return (
              <div
                key={folder.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, folder.id)}
                className={`rounded-md transition-colors ${
                  isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
              >
                <button
                  onClick={() => onSelect(folder.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors ${
                    isSelected 
                      ? 'text-blue-700' 
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    {Icon}
                    <span className="ml-3">{folder.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{folder.count}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
