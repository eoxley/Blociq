import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@supabase/auth-helpers-react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

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
    
    // If no messageId provided, perform bulk triage
    if (!targetMessageId) {
      return await performBulkTriage()
    }

    setIsTriaging(true)
    setError(null)

    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: targetMessageId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Triage failed')
      }

      const result = await response.json()
      
      // Update the triage state with the result
      setTriage({
        ...result,
        actionsPerformed: result.actions || [],
        messageId: targetMessageId
      })
      
      return result

    } catch (err: any) {
      const errorMessage = err.message || 'Triage failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsTriaging(false)
    }
  }, [selectedId])

  const performBulkTriage = useCallback(async () => {
    setIsTriaging(true)
    setError(null)

    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulkTriage: true })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Bulk triage failed')
      }

      const result = await response.json()
      
      // Update the triage state with the bulk result
      setTriage({
        ...result,
        actionsPerformed: result.actions || [],
        processed: result.processed || 0,
        summary: result.summary || 'Bulk triage completed'
      })
      
      return result

    } catch (err: any) {
      const errorMessage = err.message || 'Bulk triage failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsTriaging(false)
    }
  }, [])

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
    performBulkTriage,
    isLoading,
    refresh: mutate
  }
}



