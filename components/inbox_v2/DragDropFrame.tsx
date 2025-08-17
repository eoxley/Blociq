'use client'
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, PointerSensor, useSensor, useSensors, closestCenter, DragCancelEvent } from '@dnd-kit/core'
import { useState, useCallback, useRef } from 'react'
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
        distance: 8, // Reduced for better responsiveness
        delay: 150 // Reduced delay for faster activation
      } 
    })
  )
  
  const [busy, setBusy] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragData, setDragData] = useState<any>(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setIsDragging(true)
    setActiveId(e.active.id as string)
    setDragData(e.active.data.current)
    
    // Add visual feedback to body
    document.body.classList.add('dragging')
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleDragOver = useCallback((e: DragOverEvent) => {
    const overId = e.over?.id as string | undefined
    
    // Update drag position for better visual feedback
    if (e.activatorEvent) {
      const event = e.activatorEvent as PointerEvent
      setDragPosition({ x: event.clientX, y: event.clientY })
    }
    
    if (overId?.startsWith('folder:')) {
      setDragOverId(overId)
    } else {
      setDragOverId(null)
    }
  }, [])

  const handleDragCancel = useCallback((e: DragCancelEvent) => {
    setIsDragging(false)
    setActiveId(null)
    setDragOverId(null)
    setDragData(null)
    
    // Remove visual feedback
    document.body.classList.remove('dragging')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''
    
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    setIsDragging(false)
    setActiveId(null)
    setDragOverId(null)
    setDragData(null)
    
    // Remove visual feedback
    document.body.classList.remove('dragging')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''
    
    const msg = e.active?.data?.current as { messageId: string; sourceFolderId: string } | undefined
    const overId = e.over?.id as string | undefined

    if (!msg || !overId?.startsWith('folder:')) {
      return
    }
    
    const destinationId = overId.slice('folder:'.length)
    const { messageId, sourceFolderId } = msg
    
    if (destinationId === sourceFolderId) {
      return // No-op: same folder
    }

    // Show immediate feedback
    const toastId = `move-${messageId}-${Date.now()}`
    toast.loading(`Moving email to ${destinationId}...`, { id: toastId })
    
    // Optimistic UI update
    onMoveSuccess?.(messageId, destinationId)
    setBusy(true)
    
    try {
      const res = await fetch('/api/outlook/v2/messages/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, destinationFolderId: destinationId }),
      })
      
      const json = await res.json().catch(() => ({}))
      
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      
      // Success
      toast.success(`Email moved to ${destinationId}`, { id: toastId })
      
    } catch (err: any) {
      // Revert optimistic update
      onMoveError?.(messageId, err?.message || 'Move failed')
      toast.error(`Failed to move email: ${err?.message || 'Unknown error'}`, { id: toastId })
    } finally {
      setBusy(false)
    }
  }, [onMoveSuccess, onMoveError])

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div 
        aria-busy={busy ? 'true' : 'false'}
        className={`transition-all duration-200 ${isDragging ? 'cursor-grabbing' : ''}`}
        style={{ 
          pointerEvents: busy ? 'none' : 'auto',
          opacity: busy ? 0.7 : 1
        }}
      >
        {children}
      </div>
      
      <DragOverlay>
        {activeId && dragData ? (
          <div className="p-4 bg-white rounded-lg border-2 border-blue-400 shadow-2xl max-w-sm transform rotate-1">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  Moving email...
                </div>
                <div className="text-xs text-gray-500">
                  Drop on a folder to move
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
      
      {/* Enhanced global drag indicator */}
      {isDragging && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div 
            className="absolute bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transform -translate-x-1/2 -translate-y-full"
            style={{
              left: dragPosition.x,
              top: dragPosition.y - 10
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Drop to move email</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Drop zone highlight */}
      {isDragging && !dragOverId && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Drag to a folder</span>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  )
}
