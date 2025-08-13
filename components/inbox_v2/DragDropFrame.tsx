'use client'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useState } from 'react'
import { toast } from 'sonner'

type Props = {
  children: React.ReactNode
  onMoveSuccess?: (messageId: string, destinationId: string) => void
  onMoveError?: (messageId: string, error: string) => void
}

export default function DragDropFrame({ children, onMoveSuccess, onMoveError }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [busy, setBusy] = useState(false)

  async function handleDragEnd(e: DragEndEvent) {
    const msg = e.active?.data?.current as { messageId: string; sourceFolderId: string } | undefined
    const overId = e.over?.id as string | undefined // "folder:<id>"

    if (!msg || !overId?.startsWith('folder:')) return
    const destinationId = overId.slice('folder:'.length)
    const { messageId, sourceFolderId } = msg
    
    // Prevent dropping on fallback folders (they don't support Graph operations)
    if (destinationId.startsWith('default-')) {
      toast.error('Cannot move emails to fallback folders. Please use a real Outlook folder.')
      return
    }
    
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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div aria-busy={busy ? 'true' : 'false'}>{children}</div>
    </DndContext>
  )
}
