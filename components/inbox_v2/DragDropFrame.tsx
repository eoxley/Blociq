'use client'
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useState } from 'react'
import { toast } from 'sonner'
import { DragOverlay } from './DragOverlay'

type Props = {
  children: React.ReactNode
  onMoveSuccess?: (messageId: string, destinationId: string) => void
  onMoveError?: (messageId: string, error: string) => void
}

export default function DragDropFrame({ children, onMoveSuccess, onMoveError }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { 
        distance: 8, // Slightly increased to prevent accidental drags
        delay: 150 // Small delay to distinguish between clicks and drags
      } 
    })
  )
  const [busy, setBusy] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  function handleDragStart(e: DragStartEvent) {
    setIsDragging(true)
    setActiveId(e.active.id as string)
    // Add a class to the body to prevent text selection during drag
    document.body.classList.add('dragging')
  }

  async function handleDragEnd(e: DragEndEvent) {
    setIsDragging(false)
    setActiveId(null)
    document.body.classList.remove('dragging')
    
    const msg = e.active?.data?.current as { messageId: string; sourceFolderId: string } | undefined
    const overId = e.over?.id as string | undefined // "folder:<id>"

    if (!msg || !overId?.startsWith('folder:')) return
    const destinationId = overId.slice('folder:'.length)
    const { messageId, sourceFolderId } = msg
    if (destinationId === sourceFolderId) return // no-op

    // optimistic UI removal
    onMoveSuccess?.(messageId, destinationId) // consumer can remove from current list immediately
    setBusy(true)
    try {
      const res = await fetch('/api/outlook/v2/messages/move', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messageId, destinationFolderId: destinationId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) throw new Error(json?.error || `${res.status}`)
      // success – nothing else to do
      toast.success(`Email moved successfully`)
    } catch (err: any) {
      // revert if you kept a cache; for demo just notify
      onMoveError?.(messageId, err?.message || 'move failed')
      toast.error(`Failed to move email: ${err?.message || 'Unknown error'}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div 
        aria-busy={busy ? 'true' : 'false'}
        className={isDragging ? 'cursor-grabbing' : ''}
      >
        {children}
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-lg">
            <div className="text-sm font-medium text-gray-900">Moving email...</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
