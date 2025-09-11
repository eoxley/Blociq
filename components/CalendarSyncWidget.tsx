'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, RefreshCw, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface CalendarSyncWidgetProps {
  onSyncComplete?: () => void
}

interface SyncStatus {
  isConnected: boolean
  lastSync: string | null
  eventCount: number
}

export default function CalendarSyncWidget({ onSyncComplete }: CalendarSyncWidgetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    lastSync: null,
    eventCount: 0
  })

  useEffect(() => {
    checkSyncStatus()
  }, [])

  const checkSyncStatus = async () => {
    try {
      const response = await fetch('/api/outlook/status')
      if (response.ok) {
        const data = await response.json()
        setSyncStatus({
          isConnected: data.connected || false,
          lastSync: data.lastSync || null,
          eventCount: data.eventCount || 0
        })
      }
    } catch (error) {
      console.error('Error checking sync status:', error)
    }
  }

  const handleSyncCalendar = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Calendar synced successfully! ${data.synced} events added.`)
        setSyncStatus(prev => ({
          ...prev,
          lastSync: new Date().toISOString(),
          eventCount: prev.eventCount + data.synced
        }))
        onSyncComplete?.()
      } else {
        toast.error(data.message || 'Failed to sync calendar')
      }
    } catch (error) {
      console.error('Calendar sync error:', error)
      toast.error('Failed to sync calendar. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectOutlook = () => {
    // Redirect to Outlook connection
    window.location.href = '/api/auth/outlook'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Outlook Calendar</h3>
            <p className="text-sm text-gray-600">Sync your calendar events</p>
          </div>
        </div>
        
        {syncStatus.isConnected ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Not Connected</span>
          </div>
        )}
      </div>

      {syncStatus.isConnected ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Events synced:</span>
              <span className="ml-2 font-medium">{syncStatus.eventCount}</span>
            </div>
            <div>
              <span className="text-gray-600">Last sync:</span>
              <span className="ml-2 font-medium">
                {syncStatus.lastSync 
                  ? new Date(syncStatus.lastSync).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : 'Never'
                }
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSyncCalendar}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </>
              )}
            </button>
            
            <button
              onClick={() => window.open('https://outlook.live.com/calendar/', '_blank')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open Outlook
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Connect your Outlook calendar to automatically sync meetings and events to your property management dashboard.
          </p>
          
          <button
            onClick={handleConnectOutlook}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Connect Outlook Calendar
          </button>
        </div>
      )}
    </div>
  )
}
