'use client'

import React, { useEffect, useState } from 'react'
import { Sparkles, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

declare global {
  interface Window {
    generateReply: () => Promise<void>
  }
}

export default function GenerateReplyAddin() {
  const [status, setStatus] = useState<'ready' | 'loading' | 'success' | 'error'>('ready')
  const [message, setMessage] = useState<string>('BlocIQ Generate Reply ready.')
  const [isOfficeReady, setIsOfficeReady] = useState(false)

  // Initialize Office add-in and expose global function
  useEffect(() => {
    const initializeOffice = () => {
      if (typeof Office !== 'undefined') {
        Office.onReady(() => {
          setIsOfficeReady(true)
          setMessage('BlocIQ Generate Reply ready.')
        })
      } else {
        // Fallback for development/testing
        setIsOfficeReady(true)
        setMessage('BlocIQ Generate Reply ready (development mode).')
      }
    }

    // Expose generateReply function globally
    window.generateReply = async () => {
      try {
        setStatus('loading')
        setMessage('Generating AI reply...')

        // Get current email context
        let emailContext = 'No email context available'

        if (typeof Office !== 'undefined' && Office.context?.mailbox?.item) {
          try {
            await new Promise<void>((resolve, reject) => {
              Office.context.mailbox.item.body.getAsync('text', (result) => {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                  emailContext = result.value || 'No email content found'
                  resolve()
                } else {
                  console.warn('Could not load email context:', result.error)
                  reject(new Error('Failed to load email context'))
                }
              })
            })
          } catch (contextError) {
            console.warn('Using fallback context due to error:', contextError)
            emailContext = 'Email context unavailable'
          }
        }

        // Call API to generate reply
        const response = await fetch('/api/generate-draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            context: emailContext
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        const replyText = data.reply || data.response || data.message || 'Generated reply not available'

        // Insert AI-generated reply into Outlook compose box
        if (typeof Office !== 'undefined' && Office.context?.mailbox?.item) {
          await new Promise<void>((resolve, reject) => {
            const htmlReply = `<div style="font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${replyText.replace(/\n/g, '<br>')}</div>`

            Office.context.mailbox.item.body.setAsync(htmlReply, { coercionType: Office.CoercionType.Html }, (result) => {
              if (result.status === Office.AsyncResultStatus.Succeeded) {
                resolve()
              } else {
                console.error('Error setting reply text:', result.error)
                reject(new Error('Failed to insert reply'))
              }
            })
          })

          setStatus('success')
          setMessage('AI reply generated and inserted successfully!')
        } else {
          // Development mode fallback
          setStatus('success')
          setMessage(`AI reply generated: "${replyText}"`)
        }

      } catch (error) {
        console.error('Error generating reply:', error)
        setStatus('error')
        setMessage('Failed to generate reply. Please try again.')
      }

      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('ready')
        setMessage('BlocIQ Generate Reply ready.')
      }, 3000)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeOffice)
    } else {
      initializeOffice()
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', initializeOffice)
      // Clean up global function
      if (typeof window !== 'undefined' && window.generateReply) {
        delete window.generateReply
      }
    }
  }, [])

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />
      default:
        return <Sparkles className="h-6 w-6 text-teal-600" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'border-teal-200 bg-teal-50'
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-gray-200 bg-white'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-6 rounded-t-xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">BlocIQ Generate Reply</h1>
              <p className="text-sm text-teal-100">AI-Powered Email Assistant</p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className={`border-x border-b rounded-b-xl p-6 shadow-lg ${getStatusColor()}`}>
          <div className="text-center">
            <div className="mb-4">
              {getStatusIcon()}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {status === 'loading' && 'Generating Reply...'}
              {status === 'success' && 'Reply Generated!'}
              {status === 'error' && 'Error Occurred'}
              {status === 'ready' && 'Ready to Generate'}
            </h2>
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              {message}
            </p>

            {/* Connection Status */}
            <div className="flex items-center justify-center gap-2 text-sm mb-4">
              <div className={`w-2 h-2 rounded-full ${isOfficeReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-gray-600">
                {isOfficeReady ? 'Connected to Outlook' : 'Initializing...'}
              </span>
            </div>

            {/* Test Button for Development */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => window.generateReply?.()}
                disabled={status === 'loading'}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                {status === 'loading' ? 'Generating...' : 'Test Generate Reply'}
              </button>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4 text-teal-600" />
            How to Use
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Open or reply to an email in Outlook</li>
            <li>• Click the "Generate Reply" button in the ribbon</li>
            <li>• BlocIQ will analyze the email and generate a professional response</li>
            <li>• Review and edit the generated reply as needed</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Powered by BlocIQ AI • Property Management Assistant
          </p>
        </div>
      </div>
    </div>
  )
}