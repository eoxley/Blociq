'use client'

import React, { useState, useEffect } from 'react'
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
  Mail,
  Shield,
  Building
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface OutlookConnectButtonProps {
  className?: string;
  onSyncComplete?: () => void;
}

export default function OutlookConnectButton({ 
  className = "", 
  onSyncComplete 
}: OutlookConnectButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'checking' | 'disconnected'>('checking')
  const [syncStatus, setSyncStatus] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      // Check if user has Microsoft OAuth tokens
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setConnectionStatus('disconnected')
        return
      }

      const { data: tokens, error } = await supabase
        .from('outlook_tokens')
        .select('email, expires_at')
        .eq('user_id', user.id)
        .single()

      if (error || !tokens) {
        setConnectionStatus('disconnected')
        return
      }

      // Check if token is expired
      const isExpired = new Date(tokens.expires_at) < new Date()
      if (isExpired) {
        setConnectionStatus('disconnected')
        return
      }

      setConnectionStatus('connected')
      setUserEmail(tokens.email)
    } catch (error) {
      console.error('Error checking Outlook connection:', error)
      setConnectionStatus('disconnected')
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
        setSyncStatus('error')
        setTimeout(() => setSyncStatus(''), 3000)
        console.error('Sync failed')
      }
    } catch (error) {
      console.error('Error syncing inbox:', error)
      setSyncStatus('error')
      setTimeout(() => setSyncStatus(''), 3000)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSyncCalendar = async () => {
    setIsSyncing(true)
    setSyncStatus('syncing')
    
    try {
      const response = await fetch('/api/sync-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSyncStatus('success')
        setTimeout(() => setSyncStatus(''), 3000)
        
        console.log('Calendar sync completed:', data)
      } else {
        setSyncStatus('error')
        setTimeout(() => setSyncStatus(''), 3000)
        console.error('Calendar sync failed')
      }
    } catch (error) {
      console.error('Error syncing calendar:', error)
      setSyncStatus('error')
      setTimeout(() => setSyncStatus(''), 3000)
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'checking':
        return <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Microsoft Connected'
      case 'checking':
        return 'Checking connection...'
      case 'disconnected':
        return 'Not Connected'
      default:
        return 'Not Connected'
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'checking':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'disconnected':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...'
      case 'success':
        return 'Sync completed!'
      case 'error':
        return 'Sync failed'
      default:
        return ''
    }
  }

  if (connectionStatus === 'checking') {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              <span className="text-sm text-gray-600">Checking Microsoft connection...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (connectionStatus === 'connected') {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Microsoft Integration</CardTitle>
            </div>
            <Badge className={getStatusColor()}>
              {getStatusIcon()}
              <span className="ml-1">{getStatusText()}</span>
            </Badge>
          </div>
          {userEmail && (
            <p className="text-sm text-gray-600">Connected as: {userEmail}</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4 text-blue-500" />
            <span>Outlook emails automatically synced</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4 text-green-500" />
            <span>Calendar events automatically synced</span>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSyncInbox}
              disabled={isSyncing}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              {isSyncing && syncStatus === 'syncing' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Emails
            </Button>
            
            <Button
              onClick={handleSyncCalendar}
              disabled={isSyncing}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              {isSyncing && syncStatus === 'syncing' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Calendar
            </Button>
          </div>
          
          {syncStatus && (
            <div className={`text-sm p-2 rounded ${
              syncStatus === 'success' ? 'bg-green-50 text-green-700' :
              syncStatus === 'error' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {getSyncStatusText()}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Show connect button when disconnected
  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Microsoft Integration</CardTitle>
          </div>
          <Badge className={getStatusColor()}>
            {getStatusIcon()}
            <span className="ml-1">{getStatusText()}</span>
          </Badge>
        </div>
        <p className="text-sm text-gray-600">Connect your Outlook account to sync emails and calendar</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="h-4 w-4 text-blue-500" />
          <span>Sync Outlook emails automatically</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4 text-green-500" />
          <span>Sync calendar events automatically</span>
        </div>
        
        <Button
          onClick={() => router.push('/api/auth/outlook')}
          size="sm"
          className="w-full"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Connect Outlook Account
        </Button>
      </CardContent>
    </Card>
  )
} 