'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, Clock, CheckCircle, MessageSquare, Bot, Loader2, Sparkles, Zap, ExternalLink } from 'lucide-react'
import { useSession } from '@/hooks/useSession'

interface TriageButtonProps {
  className?: string
  selectedMessageId?: string | null
  onTriage?: (messageId?: string) => Promise<any>
  isTriaging?: boolean
  triageResult?: any
  triageError?: string | null
}

interface ProgressState {
  step: string
  done?: boolean
  link?: string
}

interface OutlookConnectionStatus {
  connected: boolean
  email?: string
  tokenExpired?: boolean
  expiresAt?: string
  needsReconnect?: boolean
}

export default function TriageButton({ 
  className = "", 
  selectedMessageId,
  onTriage,
  isTriaging: externalIsTriaging,
  triageResult,
  triageError
}: TriageButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [outlookStatus, setOutlookStatus] = useState<OutlookConnectionStatus>({ connected: false })
  const [checkingConnection, setCheckingConnection] = useState(true)
  const { data: session, status } = useSession()

  // Use external triaging state if provided, otherwise use internal state
  const isTriaging = externalIsTriaging !== undefined ? externalIsTriaging : isLoading

  // Check Outlook connection status
  useEffect(() => {
    checkOutlookConnection()
  }, [session])

  const checkOutlookConnection = async () => {
    setCheckingConnection(true)
    try {
      const response = await fetch('/api/outlook/status')
      const data = await response.json()
      
      setOutlookStatus({
        connected: data.connected || false,
        email: data.email,
        tokenExpired: data.tokenExpired || false,
        expiresAt: data.expiresAt,
        needsReconnect: data.tokenExpired || data.tokenInvalid || false
      })
    } catch (error) {
      console.error('Error checking Outlook connection:', error)
      setOutlookStatus({ connected: false })
    } finally {
      setCheckingConnection(false)
    }
  }

  const disabled = status !== "authenticated" || !outlookStatus.connected || checkingConnection || !selectedMessageId

  const triageOptions = [
    { id: 'urgent', label: 'Mark as Urgent', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
    { id: 'follow-up', label: 'Follow Up Later', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    { id: 'resolved', label: 'Mark as Resolved', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    { id: 'archive', label: 'Archive', icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  ]

  const handleTriage = (optionId: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[TriageButton] Triage action: ${optionId}`)
    }
    // TODO: Implement actual triage logic
    setIsOpen(false)
  }

  const runAITriage = async () => {
    if (!outlookStatus.connected) {
      alert('Please connect your Outlook account first')
      return
    }

    if (!onTriage) {
      alert('Triage function not available')
      return
    }

    if (!selectedMessageId) {
      alert('Please select a message to triage')
      return
    }

    try {
      await onTriage(selectedMessageId)
      setIsOpen(false)
    } catch (error) {
      console.error('AI Triage failed:', error)
      alert(`Triage failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleConnectOutlook = () => {
    window.location.href = '/api/auth/outlook'
  }

  return (
    <>
      {/* Enhanced Main Button */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled || isTriaging}
        className={`
          relative inline-flex items-center justify-center gap-2 px-4 py-2.5 
          bg-gradient-to-r from-orange-500 to-red-500 text-white 
          border border-orange-400 rounded-lg 
          hover:from-orange-600 hover:to-red-600 
          active:from-orange-700 active:to-red-700
          transition-all duration-200 shadow-md hover:shadow-lg
          disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-sm
          ${isTriaging ? 'animate-pulse' : ''}
          ${className}
        `}
        title={
          !selectedMessageId 
            ? "Select a message to triage" 
            : status !== "authenticated" 
            ? "Please log in to use AI triage" 
            : !outlookStatus.connected 
            ? "Connect Outlook to enable AI triage" 
            : "AI Triage Options"
        }
      >
        {isTriaging ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : checkingConnection ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        <span className="font-medium">
          {checkingConnection ? 'Checking...' : isTriaging ? 'Triaging...' : 'AI Triage'}
        </span>
        {outlookStatus.connected && !isTriaging && !checkingConnection && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        )}
      </button>

      {/* Enhanced Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">AI Triage Center</h2>
                    <p className="text-orange-100 text-sm">Smart email organization & response</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Connection Status */}
              {!outlookStatus.connected && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-red-800">Outlook Connection Required</h3>
                      <p className="text-sm text-red-600">Connect your Outlook account to use AI triage</p>
                    </div>
                  </div>
                  <button
                    onClick={handleConnectOutlook}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Connect Outlook Account
                  </button>
                </div>
              )}

              {/* Message Selection Status */}
              {!selectedMessageId && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-yellow-800">No Message Selected</h3>
                      <p className="text-sm text-yellow-600">Please select a message from the list to triage</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Triage Result Display */}
              {triageResult && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-800">Triage Complete</h3>
                      <p className="text-sm text-green-600">AI analysis results available</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><strong>Category:</strong> {triageResult.category}</div>
                    <div><strong>Urgency:</strong> {triageResult.urgency}</div>
                    <div><strong>Summary:</strong> {triageResult.summary}</div>
                    {triageResult.dueDate && (
                      <div><strong>Due Date:</strong> {triageResult.dueDate}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Triage Error Display */}
              {triageError && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-red-800">Triage Failed</h3>
                      <p className="text-sm text-red-600">{triageError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Triage Options */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {triageOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleTriage(option.id)}
                        disabled={!outlookStatus.connected}
                        className={`
                          flex items-center gap-2 p-3 rounded-lg border transition-all duration-200 
                          hover:shadow-md hover:scale-105 ${option.bgColor} ${option.borderColor}
                          hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        <Icon className={`h-4 w-4 ${option.color}`} />
                        <span className={`text-sm font-medium ${option.color}`}>{option.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* AI Triage Section */}
              <div className={`rounded-xl p-4 border ${outlookStatus.connected && selectedMessageId ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${outlookStatus.connected && selectedMessageId ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-300'}`}>
                    <Bot className={`h-4 w-4 ${outlookStatus.connected && selectedMessageId ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI-Powered Triage</h3>
                    <p className="text-sm text-gray-600">Automated email classification & response</p>
                  </div>
                </div>
                
                <button
                  onClick={runAITriage}
                  disabled={!outlookStatus.connected || !selectedMessageId || isTriaging}
                  className={`
                    w-full flex items-center justify-center gap-3 p-3 
                    ${outlookStatus.connected && selectedMessageId && !isTriaging
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }
                    rounded-lg font-medium transition-all duration-200 
                    shadow-md hover:shadow-lg
                    ${isTriaging ? 'animate-pulse' : ''}
                  `}
                >
                  {isTriaging ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isTriaging ? 'Triaging...' : 'Run AI Triage'}
                </button>
                
                <p className="text-xs text-gray-500 text-center mt-2">
                  {!outlookStatus.connected 
                    ? "🔗 Connect your Outlook account to enable AI triage functionality."
                    : !selectedMessageId
                    ? "📧 Select a message from the list to enable AI triage."
                    : "🤖 AI analyzes emails, applies categories, flags, and creates draft replies. Safe mode - nothing is moved or sent automatically."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Progress Modal */}
      {progress && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Progress Header */}
            <div className={`px-6 py-4 ${progress.done && !progress.step.includes('Error') ? 'bg-gradient-to-r from-green-500 to-emerald-500' : progress.step.includes('Error') ? 'bg-gradient-to-r from-red-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    {!progress.done ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : progress.step.includes('Error') ? (
                      <AlertTriangle className="h-5 w-5 text-white" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">AI Triage Progress</h2>
                    <p className="text-white/80 text-sm">
                      {!progress.done ? 'Processing emails...' : progress.step.includes('Error') ? 'Error occurred' : 'Completed successfully'}
                    </p>
                  </div>
                </div>
                {progress.done && (
                  <button
                    onClick={() => setProgress(null)}
                    className="text-white/80 hover:text-white transition-colors p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-gray-700 font-medium">{progress.step}</span>
                </div>

                {progress.done && !progress.step.includes('Error') && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">Success!</span>
                    </div>
                    <p className="text-sm text-green-700">
                      AI triage completed successfully! Check your Outlook for categorized emails and draft replies.
                    </p>
                  </div>
                )}

                {progress.done && progress.step.includes('Error') && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">Error</span>
                    </div>
                    <p className="text-sm text-red-700">
                      {progress.step.replace('❌ Error: ', '')}
                    </p>
                  </div>
                )}

                {progress.done && (
                  <button
                    onClick={() => setProgress(null)}
                    className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
