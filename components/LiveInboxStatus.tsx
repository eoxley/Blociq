'use client'

import { useState, useEffect } from 'react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { Bell, Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface LiveInboxStatusProps {
  isSubscribed: boolean
  onSetupWebhook?: () => void
}

export default function LiveInboxStatus({ isSubscribed, onSetupWebhook }: LiveInboxStatusProps) {
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState<'unknown' | 'active' | 'inactive'>('unknown')

  useEffect(() => {
    // Check webhook status on mount
    checkWebhookStatus()
  }, [])

  const checkWebhookStatus = async () => {
    try {
      const response = await fetch('/api/outlook/webhook/status')
      if (response.ok) {
        const data = await response.json()
        setWebhookStatus(data.active ? 'active' : 'inactive')
      } else {
        setWebhookStatus('inactive')
      }
    } catch (error) {
      console.error('Failed to check webhook status:', error)
      setWebhookStatus('inactive')
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

  const getStatusColor = () => {
    if (isSubscribed && webhookStatus === 'active') {
      return 'text-green-600 bg-green-100'
    } else if (isSubscribed) {
      return 'text-yellow-600 bg-yellow-100'
    } else {
      return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = () => {
    if (isSubscribed && webhookStatus === 'active') {
      return 'Fully Live'
    } else if (isSubscribed) {
      return 'Partially Live'
    } else {
      return 'Connecting...'
    }
  }

  const getStatusIcon = () => {
    if (isSubscribed && webhookStatus === 'active') {
      return <Wifi className="h-4 w-4" />
    } else if (isSubscribed) {
      return <Bell className="h-4 w-4" />
    } else {
      return <WifiOff className="h-4 w-4" />
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Status Indicator */}
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>

      {/* Setup Webhook Button (if needed) */}
      {isSubscribed && webhookStatus !== 'active' && (
        <BlocIQButton
          onClick={handleSetupWebhook}
          disabled={isSettingUp}
          size="sm"
          variant="outline"
          className="text-blue-600 border-blue-300 hover:bg-blue-50"
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
    </div>
  )
} 