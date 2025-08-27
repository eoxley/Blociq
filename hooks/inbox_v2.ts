import useSWR from 'swr'
import { useState, useCallback, useEffect } from 'react'
import { useUser } from '@supabase/auth-helpers-react'

// Default folders fallback when Graph API is unavailable
const DEFAULT_FOLDERS = [
  { id: 'inbox', displayName: 'Inbox', wellKnownName: 'inbox' },
  { id: 'drafts', displayName: 'Drafts', wellKnownName: 'drafts' },
  { id: 'sent', displayName: 'Sent Items', wellKnownName: 'sentitems' },
  { id: 'deleted', displayName: 'Deleted Items', wellKnownName: 'deleteditems' },
  { id: 'archive', displayName: 'Archive', wellKnownName: 'archive' },
  { id: 'junk', displayName: 'Junk Email', wellKnownName: 'junkemail' }
]

// Enhanced fetcher with better error handling and retry logic
const enhancedFetcher = async (url: string) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Fetch error:', error)
    throw error
  }
}

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
  
  // Enhanced SWR configuration for real-time updates
  const { data, error, isLoading, mutate } = useSWR(
    '/api/outlook/v2/folders', 
    enhancedFetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      dedupingInterval: 10000, // Dedupe requests within 10 seconds
    }
  )
  
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
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      displayName: folderName,
      wellKnownName: 'custom'
    }
    
    const updatedManualFolders = [...manualFolders, newFolder]
    setManualFolders(updatedManualFolders)
    saveManualFolders(updatedManualFolders)
    
    // Log for debugging
    console.log('Added manual folder:', newFolder)
    console.log('Updated manual folders:', updatedManualFolders)
  }, [manualFolders])
  
  const refresh = useCallback(async () => {
    try {
      await mutate()
      console.log('Folders refreshed successfully')
    } catch (error) {
      console.error('Failed to refresh folders:', error)
    }
  }, [mutate])
  
  // Debug logging
  useEffect(() => {
    console.log('useFolders state:', {
      graphFolders: graphFolders.length,
      manualFolders: manualFolders.length,
      totalFolders: folders.length,
      isFallback,
      lastUpdated: new Date().toISOString()
    })
  }, [graphFolders.length, manualFolders.length, folders.length, isFallback])
  
  return {
    folders,
    isFallback,
    isLoading,
    error,
    refresh,
    addManualFolder
  }
}

export function useMessages(folderId: string | null) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [triage, setTriage] = useState<any | null>(null)
  const [isTriaging, setIsTriaging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const user = useUser()
  
  // Enhanced SWR configuration for messages with real-time updates
  const { data, error: fetchError, isLoading, mutate } = useSWR(
    folderId ? `/api/outlook/v2/messages/list?folderId=${folderId}&t=${Date.now()}` : null,
    enhancedFetcher,
    {
      refreshInterval: 15000, // Refresh every 15 seconds for messages
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
      errorRetryInterval: 3000,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  )
  
  const messages = data?.ok ? data.items : []
  
  // Enhanced refresh function with timestamp
  const refresh = useCallback(async () => {
    try {
      setLastRefresh(new Date())
      await mutate()
      console.log('Messages refreshed successfully at:', new Date().toISOString())
    } catch (error) {
      console.error('Failed to refresh messages:', error)
      setError('Failed to refresh messages')
    }
  }, [mutate])
  
  // Selection stability: auto-select first message if none selected and messages exist
  useEffect(() => {
    if (messages.length > 0 && !selectedId) {
      // Prefer first unread message if available
      const firstUnread = messages.find((msg: any) => !msg.isRead)
      const messageToSelect = firstUnread || messages[0]
      if (messageToSelect) {
        setSelectedId(messageToSelect.id)
        if (process.env.NODE_ENV === 'development') {
          console.debug('[useMessages] Auto-selecting first message:', messageToSelect.id)
        }
      }
    }
  }, [messages, selectedId])
  
  // Clear triage when changing folders
  useEffect(() => {
    setTriage(null)
    setError(null)
  }, [folderId])
  
  // Enhanced triage function with better error handling
  const triageMessage = useCallback(async (messageId?: string) => {
    const targetMessageId = messageId || selectedId
    if (!targetMessageId) {
      throw new Error('No message selected for triage')
    }
    
    setIsTriaging(true)
    setError(null)
    
    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: targetMessageId
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Triage failed')
      }
      
      const result = await response.json()
      setTriage(result.triage)
      
      // Refresh messages after successful triage
      setTimeout(() => {
        refresh()
      }, 1000)
      
      return result.triage
      
    } catch (err: any) {
      const errorMessage = err.message || 'Triage failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsTriaging(false)
    }
  }, [selectedId, refresh])
  
  // Auto-refresh messages when user becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && folderId) {
        console.log('User became active, refreshing messages')
        refresh()
      }
    }
    
    const handleFocus = () => {
      if (folderId) {
        console.log('Window focused, refreshing messages')
        refresh()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [folderId, refresh])
  
  // Debug logging (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[useMessages]', { 
        folderId, 
        messagesCount: messages.length, 
        selectedId,
        isLoading, 
        error: fetchError,
        userId: user?.id,
        lastRefresh: lastRefresh.toISOString()
      })
    }
  }, [folderId, messages.length, selectedId, isLoading, fetchError, user?.id, lastRefresh])
  
  return {
    messages,
    selectedId,
    setSelectedId,
    triage,
    isTriaging,
    error,
    triageMessage,
    isLoading,
    refresh,
    lastRefresh
  }
}
