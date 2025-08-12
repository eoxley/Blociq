import useSWR from 'swr'
import { useState, useCallback } from 'react'

// Default folders fallback when Graph API is unavailable
const DEFAULT_FOLDERS = [
  { id: 'inbox', displayName: 'Inbox', wellKnownName: 'inbox' },
  { id: 'drafts', displayName: 'Drafts', wellKnownName: 'drafts' },
  { id: 'sent', displayName: 'Sent Items', wellKnownName: 'sentitems' },
  { id: 'deleted', displayName: 'Deleted Items', wellKnownName: 'deleteditems' },
  { id: 'archive', displayName: 'Archive', wellKnownName: 'archive' },
  { id: 'junk', displayName: 'Junk Email', wellKnownName: 'junkemail' }
]

const fetcher = (url: string) => fetch(url).then(res => res.json())

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
  
  const { data, error, isLoading, mutate } = useSWR('/api/outlook/v2/folders', fetcher)
  
  // Combine Graph folders with manual folders
  const graphFolders = data?.ok && data?.items?.length > 0 ? data.items : []
  
  // Always include manual folders, combine with Graph folders or defaults
  // This ensures manual folders are never lost
  const folders = graphFolders.length > 0 
    ? [...graphFolders, ...manualFolders] 
    : [...DEFAULT_FOLDERS, ...manualFolders]
  
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
    folders,
    isFallback,
    isLoading,
    refresh,
    addManualFolder
  }
}

export function useMessages(folderId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    folderId ? `/api/outlook/v2/messages/list?folderId=${folderId}` : null,
    fetcher
  )
  
  const messages = data?.ok ? data.items : []
  
  return {
    messages,
    isLoading,
    refresh: mutate
  }
}
