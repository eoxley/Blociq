'use client';

import React, { useState, useEffect } from 'react';
import { Inbox, Archive, Trash2, Folder, Plus, X, RefreshCw, CheckCircle, AlertTriangle, MessageSquare, Clock, Star, Building as BuildingIcon, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface OutlookFolder {
  id: string;
  displayName: string;
  wellKnownName?: string;
}

interface FolderListV2Props {
  folders: OutlookFolder[];
  selectedFolderId: string | null;
  loading: boolean;
  onSelect: (id: string | null) => void; // null means refresh
  onDropEmail: (emailId: string, folderId: string) => void;
  emails?: any[]; // Add emails prop for dynamic folder counts
}

export default function FolderListV2({ 
  folders, 
  selectedFolderId, 
  loading, 
  onSelect, 
  onDropEmail,
  emails = []
}: FolderListV2Props) {
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(true);

  // Calculate dynamic folder counts from emails
  const folderCounts = React.useMemo(() => {
    if (!emails || emails.length === 0) {
      return {
        inbox: 0,
        handled: 0,
        all: 0,
        archived: 0,
        complaints: 0,
        queries: 0,
        actionRequired: 0,
        flagged: 0
      }
    }

    return {
      all: emails.length,
      inbox: emails.filter(email => !email.is_read || email.unread).length,
      handled: emails.filter(email => email.is_handled || email.handled).length,
      flagged: emails.filter(email => email.flag_status === 'flagged').length,
      archived: emails.filter(email => email.flag_status === 'archived').length,
      complaints: emails.filter(email => email.categories?.includes('complaint')).length,
      queries: emails.filter(email => email.categories?.includes('query')).length,
      actionRequired: emails.filter(email => !email.is_handled && !email.handled).length
    }
  }, [emails])

  // Calculate building folders from emails
  const buildings = React.useMemo(() => {
    if (!emails || emails.length === 0) return []
    
    const buildingMap = new Map<string, { id: string, name: string, emailCount: number }>()
    
    emails.forEach(email => {
      if (email.building_id) {
        const buildingId = email.building_id.toString()
        const existing = buildingMap.get(buildingId)
        
        if (existing) {
          existing.emailCount++
        } else {
          buildingMap.set(buildingId, {
            id: buildingId,
            name: email.building_name || `Building ${buildingId}`,
            emailCount: 1
          })
        }
      }
    })
    
    return Array.from(buildingMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [emails])

  // Calculate tag folders from emails
  const tags = React.useMemo(() => {
    if (!emails || emails.length === 0) return []
    
    const tagMap = new Map<string, number>()
    
    emails.forEach(email => {
      if (email.categories && Array.isArray(email.categories)) {
        email.categories.forEach(tag => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
        })
      }
    })
    
    return Array.from(tagMap.entries()).map(([tag, count]) => ({
      tag,
      emailCount: count
    })).sort((a, b) => a.tag.localeCompare(b.tag))
  }, [emails])

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
        onSelect(null); // Trigger refresh
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

  const getFolderIcon = (folder: OutlookFolder) => {
    const wellKnownName = folder.wellKnownName?.toLowerCase();
    switch (wellKnownName) {
      case 'inbox': return <Inbox className="h-4 w-4" />;
      case 'archive': return <Archive className="h-4 w-4" />;
      case 'deleteditems': return <Trash2 className="h-4 w-4" />;
      default: return <Folder className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Folders</h2>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onSelect(null)} // Trigger refresh
              disabled={loading}
              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
              title="Refresh folders"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreateFolder(true)}
              disabled={!outlookConnected}
              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={outlookConnected ? "Create new folder" : "Connect Outlook to create folders"}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Outlook Connection Status */}
        {!outlookConnected && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-800">
              <div className="font-medium mb-1">Outlook not connected</div>
              <div className="text-xs">
                Connect your Outlook account to manage folders and move emails.
              </div>
            </div>
          </div>
        )}
        
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
        {loading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ) : folders.length === 0 ? (
          <div className="p-4 text-center">
            <div className="text-sm text-gray-500">No folders found</div>
          </div>
        ) : (
          <div className="p-2 space-y-4">
            {/* Outlook Folders */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">Outlook Folders</h3>
              <div className="space-y-1">
                {folders.map((folder) => {
                  const isSelected = selectedFolderId === folder.id;
                  const Icon = getFolderIcon(folder);
                  
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
                          <span className="ml-3 truncate">{folder.displayName}</span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System Folders */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">System Folders</h3>
              <div className="space-y-1">
                {[
                  { id: 'inbox', label: 'Inbox', icon: Inbox, count: folderCounts.inbox },
                  { id: 'action-required', label: 'Action Required', icon: Clock, count: folderCounts.actionRequired },
                  { id: 'flagged', label: 'Flagged', icon: Star, count: folderCounts.flagged },
                  { id: 'handled', label: 'Handled', icon: CheckCircle, count: folderCounts.handled },
                  { id: 'archived', label: 'Archived', icon: Archive, count: folderCounts.archived }
                ].map((folder) => {
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
                          <folder.icon className="h-4 w-4" />
                          <span className="ml-3 truncate">{folder.label}</span>
                        </div>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                          {folder.count}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Folders */}
            {[
              { id: 'complaints', label: 'Complaints', icon: AlertTriangle, count: folderCounts.complaints },
              { id: 'leaseholder-queries', label: 'Leaseholder Queries', icon: MessageSquare, count: folderCounts.queries }
            ].filter(folder => folder.count > 0).map((folder) => (
              <div key={folder.id}>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">Categories</h3>
                <div className="space-y-1">
                  <div
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, folder.id)}
                    className="rounded-md transition-colors hover:bg-gray-100"
                  >
                    <button
                      onClick={() => onSelect(folder.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors text-gray-700"
                    >
                      <div className="flex items-center">
                        <folder.icon className="h-4 w-4" />
                        <span className="ml-3 truncate">{folder.label}</span>
                      </div>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                        {folder.count}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Building Folders */}
            {buildings.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">Buildings</h3>
                <div className="space-y-1">
                  {buildings.map((building) => (
                    <div
                      key={building.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, `building-${building.id}`)}
                      className="rounded-md transition-colors hover:bg-gray-100"
                    >
                      <button
                        onClick={() => onSelect(`building-${building.id}`)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors text-gray-700"
                      >
                        <div className="flex items-center">
                          <BuildingIcon className="h-4 w-4" />
                          <span className="ml-3 truncate">{building.name}</span>
                        </div>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                          {building.emailCount}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tag Folders */}
            {tags.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">Tags</h3>
                <div className="space-y-1">
                  {tags.map((tag) => (
                    <div
                      key={tag.tag}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, `tag-${tag.tag}`)}
                      className="rounded-md transition-colors hover:bg-gray-100"
                    >
                      <button
                        onClick={() => onSelect(`tag-${tag.tag}`)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors text-gray-700"
                      >
                        <div className="flex items-center">
                          <Tag className="h-4 w-4" />
                          <span className="ml-3 truncate">{tag.tag}</span>
                        </div>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                          {tag.tag}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debug Info */}
            {emails && emails.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-xs font-medium text-blue-900 mb-2">Debug Info</h3>
                <p className="text-xs text-blue-700">
                  Total emails: {emails.length}<br/>
                  Inbox: {folderCounts.inbox}<br/>
                  Handled: {folderCounts.handled}<br/>
                  Flagged: {folderCounts.flagged}<br/>
                  Buildings: {buildings.length}<br/>
                  Tags: {tags.length}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
