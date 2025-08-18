"use client";

import useSWR from "swr";
import { useState, useCallback } from "react";

// Default folders fallback when Graph API is unavailable
const DEFAULT_FOLDERS = [
  { id: 'default-inbox', displayName: 'Inbox', wellKnownName: 'inbox', isFallback: true },
  { id: 'default-drafts', displayName: 'Drafts', wellKnownName: 'drafts', isFallback: true },
  { id: 'default-sent', displayName: 'Sent Items', wellKnownName: 'sentitems', isFallback: true },
  { id: 'default-deleted', displayName: 'Deleted Items', wellKnownName: 'deleteditems', isFallback: true },
  { id: 'default-archive', displayName: 'Archive', wellKnownName: 'archive', isFallback: true },
  { id: 'default-junk', displayName: 'Junk Email', wellKnownName: 'junkemail', isFallback: true }
];

const jsonFetcher = async (url: string) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return r.json();
};

// Get manual folders from localStorage
const getManualFolders = (): any[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('inbox-manual-folders')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save manual folders to localStorage
const saveManualFolders = (folders: any[]): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('inbox-manual-folders', JSON.stringify(folders))
  } catch {
    // Ignore storage errors
  }
}

export function useFolders() {
  const [manualFolders, setManualFolders] = useState(getManualFolders)
  
  const { data, error, isLoading, mutate } = useSWR('/api/outlook/v2/folders', jsonFetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: true,
    revalidateOnReconnect: true,
    dedupingInterval: 3000,
  })
  
  // Combine Graph folders with manual folders
  const graphFolders = data?.ok && data?.items?.length > 0 ? data.items : []
  
  // Always include manual folders, combine with Graph folders or defaults
  // This ensures manual folders are never lost
  // Graph folders take precedence over defaults
  const folders = graphFolders.length > 0 
    ? [...graphFolders, ...manualFolders] 
    : [...DEFAULT_FOLDERS, ...manualFolders]
  
  // Ensure all folders have proper IDs (Graph folders should have real IDs)
  const processedFolders = folders.map((folder: any) => ({
    ...folder,
    // Ensure Graph folders keep their real IDs, fallback folders are marked
    id: folder.isFallback ? folder.id : folder.id,
    // Mark if this is a real Graph folder
    isGraphFolder: !folder.isFallback && graphFolders.some((gf: any) => gf.id === folder.id)
  }))
  
  const isFallback = graphFolders.length === 0
  
  const addManualFolder = useCallback((folderName: string) => {
    const newFolder = {
      id: `manual-${Date.now()}`,
      displayName: folderName,
      wellKnownName: 'custom'
    }
    
    const updatedManualFolders = [...manualFolders, newFolder]
    setManualFolders(updatedManualFolders)
    saveManualFolders(updatedManualFolders)
  }, [manualFolders])
  
  const refresh = useCallback(() => {
    mutate()
  }, [mutate])
  
  return {
    folders: processedFolders,
    isFallback,
    isLoading,
    refresh,
    addManualFolder
  }
}
