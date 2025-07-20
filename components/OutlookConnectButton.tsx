'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ExternalLink,
  RefreshCw,
  Mail
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface OutlookConnectButtonProps {
  className?: string;
  onSyncComplete?: () => void;
}

export default function OutlookConnectButton({ 
  className = "", 
  onSyncComplete 
}: OutlookConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'checking'>('checking')
  const [syncStatus, setSyncStatus] = useState<string>('')
  const router = useRouter()

  // Check connection status on mount
  React.useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/outlook/status')
      if (response.ok) {
        const data = await response.json()
        setConnectionStatus(data.connected ? 'connected' : 'disconnected')
      } else {
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      console.error('Error checking Outlook connection:', error)
      setConnectionStatus('disconnected')
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      // Redirect to OAuth endpoint
      window.location.href = '/api/auth/outlook'
    } catch (error) {
      console.error('Error connecting to Outlook:', error)
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/outlook/disconnect', {
        method: 'POST'
      })
      
      if (response.ok) {
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      console.error('Error disconnecting from Outlook:', error)
    }
  }

  const handleSyncInbox = async () => {
    setIsSyncing(true)
    setSyncStatus('syncing')
    
    try {
      const response = await fetch('/api/sync-outlook-inbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSyncStatus('success')
        setTimeout(() => setSyncStatus(''), 3000)
        
        // Call the callback to refresh the inbox
        if (onSyncComplete) {
          onSyncComplete()
        }
        
        console.log('Sync completed:', data)
      } else {
        const errorData = await response.json()
        setSyncStatus('error')
        setTimeout(() => setSyncStatus(''), 3000)
        console.error('Sync failed:', errorData)
      }
    } catch (error) {
      console.error('Error syncing inbox:', error)
      setSyncStatus('error')
      setTimeout(() => setSyncStatus(''), 3000)
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected'
      case 'disconnected':
        return 'Disconnected'
      case 'checking':
        return 'Checking...'
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'disconnected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'checking':
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...'
      case 'success':
        return '✓ Synced'
      case 'error':
        return '✗ Error'
      default:
        return 'Sync Inbox'
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Outlook Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Connection Status</span>
          <Badge className={`flex items-center gap-1 ${getStatusColor()}`}>
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </div>

        {connectionStatus === 'connected' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Your Outlook calendar is connected. You can now add events directly from BlocIQ.
            </p>
            
            {/* Sync Inbox Button */}
            <Button 
              onClick={handleSyncInbox}
              disabled={isSyncing}
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-2"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {getSyncStatusText()}
            </Button>
            
            <Button 
              onClick={handleDisconnect}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Disconnect Outlook
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Connect your Outlook calendar to automatically add events from AI suggestions and sync your inbox.
            </p>
            <Button 
              onClick={handleConnect}
              disabled={isConnecting || connectionStatus === 'checking'}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect Outlook
                </>
              )}
            </Button>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p>• Add calendar events from AI suggestions</p>
          <p>• Sync emails from Outlook inbox</p>
          <p>• Automatic reminders and notifications</p>
          <p>• Sync with your existing Outlook calendar</p>
        </div>
      </CardContent>
    </Card>
  )
} 