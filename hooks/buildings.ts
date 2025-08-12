import { useState, useCallback, useEffect } from 'react'
import { BuildingNotes, BuildingStructure } from '@/types/buildings'

interface BuildingInfoData {
  notes: BuildingNotes | null
  structure: BuildingStructure | null
  isLoading: boolean
  refresh: () => Promise<void>
  saveNotes: (data: { markdown: string; html: string }) => Promise<boolean>
  saveStructure: (data: { json: Record<string, any> }) => Promise<boolean>
}

export function useBuildingInfo(buildingId: string): BuildingInfoData {
  const [notes, setNotes] = useState<BuildingNotes | null>(null)
  const [structure, setStructure] = useState<BuildingStructure | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchBuildingInfo = useCallback(async () => {
    if (!buildingId) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/buildings/${buildingId}/info`)
      if (response.ok) {
        const data = await response.json()
        if (data.ok) {
          setNotes(data.notes || null)
          setStructure(data.structure || null)
        }
      }
    } catch (error) {
      console.error('Error fetching building info:', error)
    } finally {
      setIsLoading(false)
    }
  }, [buildingId])

  const refresh = useCallback(async () => {
    await fetchBuildingInfo()
  }, [fetchBuildingInfo])

  const saveNotes = useCallback(async (data: { markdown: string; html: string }): Promise<boolean> => {
    try {
      const response = await fetch(`/api/buildings/${buildingId}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_markdown: data.markdown,
          content_html: data.html,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          // Update local state
          setNotes({
            title: 'Building Information',
            content_markdown: data.markdown,
            content_html: data.html,
            updated_at: new Date().toISOString(),
          })

          // Post to ingest API
          try {
            await fetch('/api/ask/ingest', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                building_id: buildingId,
                doc_type: 'building_info',
                content_text: data.markdown,
                content_html: data.html,
              }),
            })
          } catch (ingestError) {
            console.warn('Failed to ingest notes:', ingestError)
          }

          return true
        }
      }
      return false
    } catch (error) {
      console.error('Error saving notes:', error)
      return false
    }
  }, [buildingId])

  const saveStructure = useCallback(async (data: { json: Record<string, any> }): Promise<boolean> => {
    try {
      const response = await fetch(`/api/buildings/${buildingId}/structure`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          structure_json: data.json,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          // Update local state
          setStructure({
            structure_json: data.json,
            updated_at: new Date().toISOString(),
          })

          // Post to ingest API
          try {
            await fetch('/api/ask/ingest', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                building_id: buildingId,
                doc_type: 'building_structure',
                content_text: JSON.stringify(data.json),
              }),
            })
          } catch (ingestError) {
            console.warn('Failed to ingest structure:', ingestError)
          }

          return true
        }
      }
      return false
    } catch (error) {
      console.error('Error saving structure:', error)
      return false
    }
  }, [buildingId])

  // Initial fetch
  useEffect(() => {
    fetchBuildingInfo()
  }, [fetchBuildingInfo])

  return {
    notes,
    structure,
    isLoading,
    refresh,
    saveNotes,
    saveStructure,
  }
}
