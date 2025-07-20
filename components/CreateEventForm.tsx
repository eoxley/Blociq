'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Calendar, 
  Building,
  Plus,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface CreateEventFormProps {
  className?: string;
  onEventCreated?: (event: any) => void;
}

export default function CreateEventForm({ 
  className = "", 
  onEventCreated 
}: CreateEventFormProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [building, setBuilding] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !date) {
      setStatus('error')
      setMessage('Please fill in all required fields')
      return
    }

    setIsCreating(true)
    setStatus('idle')
    setMessage('')

    try {
      const response = await fetch('/api/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          date: date,
          building: building.trim() || undefined
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(`Event created successfully! ${data.outlook?.success ? 'Also added to Outlook calendar.' : ''}`)
        
        // Reset form
        setTitle('')
        setDate('')
        setBuilding('')
        
        // Call callback if provided
        if (onEventCreated && data.event) {
          onEventCreated(data.event)
        }
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to create event')
      }
    } catch (error) {
      console.error('Error creating event:', error)
      setStatus('error')
      setMessage('Network error. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Create Event
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event title"
              disabled={isCreating}
              required
            />
          </div>

          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isCreating}
              required
            />
          </div>

          <div>
            <Label htmlFor="building">Building (Optional)</Label>
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="building"
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="Enter building name"
                disabled={isCreating}
                className="pl-10"
              />
            </div>
          </div>

          <Button 
            type="submit"
            disabled={isCreating || !title.trim() || !date}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </>
            )}
          </Button>

          {message && (
            <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
              {getStatusIcon()}
              {message}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
} 