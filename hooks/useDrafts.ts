import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@supabase/auth-helpers-react'

export interface Draft {
  id: string
  type: 'email' | 'reply'
  subject: string
  recipient?: string
  building_id?: string
  building_name?: string
  building_address?: string
  content: string
  context?: string
  email_id?: string
  original_email?: {
    subject: string
    from_email: string
    body_preview: string
  }
  created_at: string
  updated_at: string
}

export interface CreateDraftData {
  type: 'email' | 'reply'
  subject?: string
  recipient?: string
  building_id?: string
  content: string
  context?: string
  email_id?: string
}

export interface UpdateDraftData {
  id: string
  type: 'email' | 'reply'
  subject?: string
  recipient?: string
  building_id?: string
  content: string
  context?: string
}

export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = useUser()

  const fetchDrafts = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/drafts')
      if (!response.ok) {
        throw new Error('Failed to fetch drafts')
      }
      
      const data = await response.json()
      if (data.success) {
        setDrafts(data.drafts || [])
      } else {
        throw new Error(data.error || 'Failed to fetch drafts')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching drafts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const createDraft = useCallback(async (draftData: CreateDraftData): Promise<Draft | null> => {
    if (!user) return null

    try {
      setError(null)
      
      const response = await fetch('/api/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftData),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create draft')
      }
      
      const data = await response.json()
      if (data.success) {
        const newDraft = data.draft
        setDrafts(prev => [newDraft, ...prev])
        return newDraft
      } else {
        throw new Error(data.error || 'Failed to create draft')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error creating draft:', err)
      return null
    }
  }, [user])

  const updateDraft = useCallback(async (draftData: UpdateDraftData): Promise<Draft | null> => {
    if (!user) return null

    try {
      setError(null)
      
      const response = await fetch('/api/drafts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftData),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update draft')
      }
      
      const data = await response.json()
      if (data.success) {
        const updatedDraft = data.draft
        setDrafts(prev => prev.map(draft => 
          draft.id === updatedDraft.id ? updatedDraft : draft
        ))
        return updatedDraft
      } else {
        throw new Error(data.error || 'Failed to update draft')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error updating draft:', err)
      return null
    }
  }, [user])

  const deleteDraft = useCallback(async (id: string, type: 'email' | 'reply'): Promise<boolean> => {
    if (!user) return false

    try {
      setError(null)
      
      const response = await fetch('/api/drafts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, type }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete draft')
      }
      
      const data = await response.json()
      if (data.success) {
        setDrafts(prev => prev.filter(draft => draft.id !== id))
        return true
      } else {
        throw new Error(data.error || 'Failed to delete draft')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error deleting draft:', err)
      return false
    }
  }, [user])

  const getDraftById = useCallback((id: string): Draft | undefined => {
    return drafts.find(draft => draft.id === id)
  }, [drafts])

  const getDraftsByType = useCallback((type: 'email' | 'reply'): Draft[] => {
    return drafts.filter(draft => draft.type === type)
  }, [drafts])

  const getDraftsByBuilding = useCallback((buildingId: string): Draft[] => {
    return drafts.filter(draft => draft.building_id === buildingId)
  }, [drafts])

  // Fetch drafts when user changes
  useEffect(() => {
    if (user) {
      fetchDrafts()
    } else {
      setDrafts([])
    }
  }, [user, fetchDrafts])

  return {
    drafts,
    isLoading,
    error,
    fetchDrafts,
    createDraft,
    updateDraft,
    deleteDraft,
    getDraftById,
    getDraftsByType,
    getDraftsByBuilding,
  }
}
