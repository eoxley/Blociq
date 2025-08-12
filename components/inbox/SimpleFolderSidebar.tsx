'use client';

import { useState, useEffect } from 'react';
import { useOutlookFolders } from '@/hooks/useOutlookFolders';
import { trace } from '@/lib/trace';

interface SimpleFolderSidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onDropToFolder?: (e: React.DragEvent, folder: any) => void;
}

export default function SimpleFolderSidebar({
  selectedFolderId,
  onSelectFolder,
  onDropToFolder
}: SimpleFolderSidebarProps) {
  const { folders, isLoading, isFallback, addCustomFolder, removeCustomFolder } = useOutlookFolders();
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    trace("Sidebar mounted", { file: "components/inbox/SimpleFolderSidebar.tsx" });
    trace("Sidebar folders", { source: isFallback ? "fallback" : "graph", count: folders.length });
  }, [folders.length, isFallback]);

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (addCustomFolder(newFolderName)) {
      setNewFolderName('');
    }
  };

  if (isLoading) {
    return (
      <aside className="w-full h-full bg-white">
        <div className="p-2 text-xs text-muted-foreground">Loading folders...</div>
        <div className="p-2 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full h-full bg-white overflow-y-auto">
      {/* Graph fallback caption - only show if Graph failed */}
      {isFallback && (
        <div className="p-2 text-xs text-muted-foreground">
          Using default folders (Graph unavailable)
        </div>
      )}
      
      {/* Folder list */}
      <ul className="space-y-1 p-2">
        {folders.map((folder) => {
                     const isSelected = selectedFolderId === folder.id;
           const isCustom = folder.id?.startsWith('custom:');
          
          return (
            <li
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              onDragOver={onDropToFolder ? (e) => {
                e.preventDefault();
                if (onDropToFolder) onDropToFolder(e, folder);
              } : undefined}
              onDrop={onDropToFolder ? (e) => {
                e.preventDefault();
                if (onDropToFolder) onDropToFolder(e, folder);
              } : undefined}
              className={`
                rounded-md px-3 py-2 hover:bg-muted cursor-pointer flex items-center justify-between
                ${isSelected ? 'bg-muted font-medium' : ''}
              `}
            >
              <span className="truncate">{folder.displayName}</span>
              {isCustom && (
                <button
                  aria-label="Remove folder"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCustomFolder(folder.displayName);
                  }}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Add custom folder control */}
      <div className="p-2 border-t">
        <form onSubmit={handleAddFolder} className="flex items-center gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Add folder…"
            maxLength={40}
            className="w-full rounded-md border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newFolderName.trim()}
            className="rounded-md border px-2 py-1 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
        </form>
      </div>
    </aside>
  );
}
