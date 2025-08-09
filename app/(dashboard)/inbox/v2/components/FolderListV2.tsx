'use client';

import { useState, useEffect } from 'react';
import { Inbox, Archive, Trash2, Folder, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface Folder {
  id: string;
  displayName: string;
  childFolderCount?: number;
  wellKnownName?: string;
}

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
  const [outlookFolders, setOutlookFolders] = useState<Folder[]>([]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Outlook folders on component mount
  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/folders');
      const data = await response.json();
      
      if (response.ok) {
        setOutlookFolders(data.items || []);
      } else {
        console.error('Failed to fetch folders:', data.error);
        toast.error('Failed to load folders');
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Failed to load folders');
    } finally {
      setIsLoading(false);
    }
  };

  const createFolder = async (name: string, parentFolderId?: string) => {
    try {
      setIsCreating(true);
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentFolderId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Folder "${name}" created`);
        setNewFolderName('');
        setShowCreateFolder(false);
        await fetchFolders(); // Refresh the folder list
      } else {
        throw new Error(data.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create folder');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }
    createFolder(newFolderName.trim());
  };

  const getFolderIcon = (type?: string) => {
    switch (type) {
      case 'inbox': return <Inbox className="h-4 w-4" />;
      case 'archive': return <Archive className="h-4 w-4" />;
      case 'deleted': return <Trash2 className="h-4 w-4" />;
      default: return <Folder className="h-4 w-4" />;
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
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Folders</h2>
          <button
            onClick={() => setShowCreateFolder(true)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 transition-colors"
            title="Create new folder"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        
        {/* Create Folder Form */}
        {showCreateFolder && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setShowCreateFolder(false);
                }}
                autoFocus
              />
              <button
                onClick={() => setShowCreateFolder(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCreateFolder}
                disabled={isCreating || !newFolderName.trim()}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowCreateFolder(false)}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 pr-2">
        {isLoading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ) : (
          <div className="p-2">
            <div className="space-y-1">
              {/* Built-in folders */}
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

              {/* Outlook folders */}
              {outlookFolders
                .filter(folder => !folder.wellKnownName) // Exclude well-known folders as they're already shown above
                .map((folder) => {
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
                          <Folder className="h-4 w-4" />
                          <span className="ml-3">{folder.displayName}</span>
                        </div>
                        {folder.childFolderCount ? (
                          <span className="text-sm text-gray-500">{folder.childFolderCount}</span>
                        ) : null}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
