import useSWR from 'swr'
import { useState, useCallback } from 'react'

// Default folders fallback when Graph API is unavailable
// Note: These are only used as fallback and should not be used for actual Graph operations
const DEFAULT_FOLDERS = [
  { id: 'default-inbox', displayName: 'Inbox', wellKnownName: 'inbox', isFallback: true },
  { id: 'default-drafts', displayName: 'Drafts', wellKnownName: 'drafts', isFallback: true },
  { id: 'default-sent', displayName: 'Sent Items', wellKnownName: 'sentitems', isFallback: true },
  { id: 'default-deleted', displayName: 'Deleted Items', wellKnownName: 'deleteditems', isFallback: true },
  { id: 'default-archive', displayName: 'Archive', wellKnownName: 'archive', isFallback: true },
  { id: 'default-junk', displayName: 'Junk Email', wellKnownName: 'junkemail', isFallback: true }
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
  
  const { data, error, isLoading, mutate } = useSWR('/api/outlook/v2/folders', fetcher, {
    // Add retry logic and error handling
    errorRetryCount: 3,
    errorRetryInterval: 1000,
    onError: (err) => {
      console.error('Failed to fetch folders:', err)
    }
  })
  
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('useFolders hook:', { 
      data, 
      error, 
      isLoading, 
      manualFolders: manualFolders.length,
      dataOk: data?.ok,
      dataItems: data?.items?.length || 0
    })
  }
  
  // Combine Graph folders with manual folders
  const graphFolders = data?.ok && data?.items?.length > 0 ? data.items : []
  
  // Check if there was an error with the Graph API
  const hasGraphError = data?.ok === false || error
  
  // Always include manual folders, combine with Graph folders or defaults
  // This ensures manual folders are never lost
  // Graph folders take precedence over defaults
  const folders = graphFolders.length > 0 
    ? [...graphFolders, ...manualFolders] 
    : [...DEFAULT_FOLDERS, ...manualFolders]
  
  // Ensure all folders have proper IDs (Graph folders should have real IDs)
  const processedFolders = folders.map(folder => ({
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
    error,
    hasGraphError,
    refresh,
    addManualFolder
  }
}

export function useMessages(folderId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    folderId ? `/api/outlook/v2/messages/list?folderId=${folderId}` : null,
    fetcher,
    {
      // Add retry logic and error handling
      errorRetryCount: 3,
      errorRetryInterval: 1000,
      onError: (err) => {
        console.error('Failed to fetch messages:', err)
      }
    }
  )
  
  const messages = data?.ok ? data.items : []
  const hasError = data?.ok === false || error
  
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('useMessages hook:', { 
      folderId, 
      messagesCount: messages.length, 
      isLoading, 
      error, 
      hasError,
      dataOk: data?.ok,
      dataItems: data?.items?.length || 0
    })
  }
  
  return {
    messages,
    isLoading,
    error,
    hasError,
    refresh: mutate
  }
}
