'use client'

import { useState, useEffect } from 'react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { Bell, Wifi, WifiOff, RefreshCw, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface LiveInboxStatusProps {
  isSubscribed: boolean
  onSetupWebhook?: () => void
}

export default function LiveInboxStatus({ isSubscribed, onSetupWebhook }: LiveInboxStatusProps) {
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState<'unknown' | 'active' | 'inactive'>('unknown')
  const [outlookStatus, setOutlookStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check both webhook and Outlook status on mount
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setIsChecking(true)
    try {
      // Check Outlook connection first
      const outlookResponse = await fetch('/api/outlook/connect')
      if (outlookResponse.ok) {
        const outlookData = await outlookResponse.json()
        setOutlookStatus(outlookData.connected ? 'connected' : 'disconnected')
      } else {
        setOutlookStatus('disconnected')
      }

      // Only check webhook status if Outlook is connected
      if (outlookStatus === 'connected') {
        const webhookResponse = await fetch('/api/outlook/webhook/status')
        if (webhookResponse.ok) {
          const webhookData = await webhookResponse.json()
          setWebhookStatus(webhookData.active ? 'active' : 'inactive')
        } else {
          setWebhookStatus('inactive')
        }
      } else {
        setWebhookStatus('inactive')
      }
    } catch (error) {
      console.error('Failed to check status:', error)
      setOutlookStatus('disconnected')
      setWebhookStatus('inactive')
    } finally {
      setIsChecking(false)
    }
  }

  const handleSetupWebhook = async () => {
    setIsSettingUp(true)
    try {
      const response = await fetch('/api/outlook/setup-webhook', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('🔗 Webhook subscription created', {
          description: 'Real-time email notifications are now active',
          duration: 5000,
        })
        setWebhookStatus('active')
        onSetupWebhook?.()
      } else {
        const error = await response.json()
        toast.error('❌ Failed to setup webhook', {
          description: error.error || 'Please try again',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error setting up webhook:', error)
      toast.error('❌ Network error', {
        description: 'Failed to setup webhook subscription',
        duration: 5000,
      })
    } finally {
      setIsSettingUp(false)
    }
  }

  const handleConnectOutlook = () => {
    // Redirect to Outlook connection page
    window.location.href = '/outlook/connect'
  }

  const getStatusColor = () => {
    if (isSubscribed && webhookStatus === 'active' && outlookStatus === 'connected') {
      return 'text-green-600 bg-green-100'
    } else if (isSubscribed && outlookStatus === 'connected') {
      return 'text-yellow-600 bg-yellow-100'
    } else if (outlookStatus === 'disconnected') {
      return 'text-red-600 bg-red-100'
    } else {
      return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = () => {
    if (isChecking) {
      return 'Checking...'
    } else if (isSubscribed && webhookStatus === 'active' && outlookStatus === 'connected') {
      return 'Fully Live'
    } else if (isSubscribed && outlookStatus === 'connected') {
      return 'Partially Live'
    } else if (outlookStatus === 'disconnected') {
      return 'Outlook Not Connected'
    } else {
      return 'Connecting...'
    }
  }

  const getStatusIcon = () => {
    if (isChecking) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    } else if (isSubscribed && webhookStatus === 'active' && outlookStatus === 'connected') {
      return <CheckCircle className="h-4 w-4" />
    } else if (isSubscribed && outlookStatus === 'connected') {
      return <Bell className="h-4 w-4" />
    } else if (outlookStatus === 'disconnected') {
      return <AlertCircle className="h-4 w-4" />
    } else {
      return <WifiOff className="h-4 w-4" />
    }
  }

  const getStatusDescription = () => {
    if (isSubscribed && webhookStatus === 'active' && outlookStatus === 'connected') {
      return 'Real-time email updates active'
    } else if (isSubscribed && outlookStatus === 'connected') {
      return 'Supabase real-time active, webhook needed'
    } else if (outlookStatus === 'disconnected') {
      return 'Connect Outlook for real-time emails'
    } else {
      return 'Setting up connection...'
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Status Indicator */}
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>

      {/* Action Buttons */}
      {!isChecking && (
        <>
          {/* Connect Outlook Button */}
          {outlookStatus === 'disconnected' && (
            <BlocIQButton
              onClick={handleConnectOutlook}
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <Wifi className="h-3 w-3 mr-1" />
              Connect Outlook
            </BlocIQButton>
          )}

          {/* Setup Webhook Button */}
          {isSubscribed && outlookStatus === 'connected' && webhookStatus !== 'active' && (
            <BlocIQButton
              onClick={handleSetupWebhook}
              disabled={isSettingUp}
              size="sm"
              variant="outline"
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              {isSettingUp ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Setting up...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Enable Real-time
                </>
              )}
            </BlocIQButton>
          )}

          {/* Refresh Status Button */}
          {(outlookStatus === 'unknown' || webhookStatus === 'unknown') && (
            <BlocIQButton
              onClick={checkStatus}
              disabled={isChecking}
              size="sm"
              variant="outline"
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
              Refresh Status
            </BlocIQButton>
          )}
        </>
      )}

      {/* Status Description */}
      <span className="text-xs text-gray-500 hidden sm:inline">
        {getStatusDescription()}
      </span>
    </div>
  )
} 