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
import { supabase } from '@/lib/supabaseClient'

interface OutlookConnectButtonProps {
  className?: string;
  onSyncComplete?: () => void;
}

export default function OutlookConnectButton({ 
  className = "", 
  onSyncComplete 
}: OutlookConnectButtonProps) {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'checking' | 'disconnected'>('checking')
  const [userEmail, setUserEmail] = useState<string>('')
  const router = useRouter()

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      // Check if user has Microsoft OAuth tokens - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
      const authResult = await supabase.auth.getUser()
      const authData = authResult?.data || {}
      const user = authData.user || null
      
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