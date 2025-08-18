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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [triage, setTriage] = useState<any | null>(null)
  const [isTriaging, setIsTriaging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = useUser()
  
  const { data, error: fetchError, isLoading, mutate } = useSWR(
    folderId ? `/api/outlook/v2/messages/list?folderId=${folderId}` : null,
    fetcher
  )
  
  const messages = data?.ok ? data.items : []
  
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
  
  const triageMessage = useCallback(async (messageId?: string) => {
    const targetMessageId = messageId || selectedId
    if (!targetMessageId) {
      throw new Error('No message selected for triage')
    }
    
    if (!user?.id) {
      throw new Error('User not authenticated')
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
          messageId: targetMessageId,
          userId: user.id
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Triage failed')
      }
      
      const result = await response.json()
      setTriage(result.triage)
      return result.triage
      
    } catch (err: any) {
      const errorMessage = err.message || 'Triage failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsTriaging(false)
    }
  }, [selectedId, user?.id])
  
  // Debug logging (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[useMessages]', { 
        folderId, 
        messagesCount: messages.length, 
        selectedId,
        isLoading, 
        error: fetchError,
        userId: user?.id
      })
    }
  }, [folderId, messages.length, selectedId, isLoading, fetchError, user?.id])
  
  return {
    messages,
    selectedId,
    setSelectedId,
    triage,
    isTriaging,
    error,
    triageMessage,
    isLoading,
    refresh: mutate
  }
}
