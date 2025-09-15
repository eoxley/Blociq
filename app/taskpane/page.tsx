'use client'

import React, { useState, useEffect } from 'react'
import { 
  Brain, 
  Send, 
  FileText, 
  Building2, 
  Sparkles, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
  MessageSquare
} from 'lucide-react'

/**
 * Outlook Add-in Taskpane Page
 * 
 * This page serves as the main interface for the BlocIQ Outlook add-in.
 * It should be accessible at: https://[your-domain]/taskpane
 * 
 * To update the Outlook manifest:
 * 1. Update manifest.xml: <SourceLocation DefaultValue="https://[your-domain]/taskpane"/>
 * 2. Redeploy the app
 * 3. Remove and re-sideload the add-in with the updated manifest
 */

interface TaskpaneState {
  isLoading: boolean
  isConnected: boolean
  lastAction: string | null
  error: string | null
}

export default function TaskpanePage() {
  const [state, setState] = useState<TaskpaneState>({
    isLoading: false,
    isConnected: false,
    lastAction: null,
    error: null
  })

  const [message, setMessage] = useState('')

  // Initialize the add-in
  useEffect(() => {
    const initializeAddin = async () => {
      setState(prev => ({ ...prev, isLoading: true }))
      
      try {
        // Check if we're running in Outlook
        if (typeof window !== 'undefined' && (window as any).Office) {
          setState(prev => ({ 
            ...prev, 
            isConnected: true, 
            isLoading: false,
            lastAction: 'Connected to Outlook'
          }))
        } else {
          // Running in browser for testing
          setState(prev => ({ 
            ...prev, 
            isConnected: true, 
            isLoading: false,
            lastAction: 'Running in browser mode'
          }))
        }
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'Failed to initialize add-in'
        }))
      }
    }

    initializeAddin()
  }, [])

  const handleAskBlocIQ = async () => {
    if (!message.trim()) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // This would connect to your Ask BlocIQ API
      // const response = await fetch('/api/ask-ai', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ prompt: message })
      // })
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        lastAction: `Asked: "${message}"`,
        error: null
      }))
      
      setMessage('')
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to process request'
      }))
    }
  }

  const handleAIReply = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // This would connect to your AI Reply API
      // const response = await fetch('/api/ai-reply', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ emailContent: '...' })
      // })
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        lastAction: 'Generated AI reply',
        error: null
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to generate reply'
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">BlocIQ Outlook Add-In</h1>
              <p className="text-white/90 text-sm">AI-powered property management assistant</p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            {state.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : state.isConnected ? (
              <CheckCircle className="h-4 w-4 text-green-300" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-300" />
            )}
            <span className="text-white/80">
              {state.isLoading ? 'Connecting...' : 
               state.isConnected ? 'Connected to Outlook' : 
               'Connection failed'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Status Card */}
        {state.lastAction && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Last Action</p>
                <p className="text-sm text-gray-600">{state.lastAction}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Card */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{state.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Ask BlocIQ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#4f46e5] to-[#a855f7] rounded-xl flex items-center justify-center">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Ask BlocIQ</h3>
                <p className="text-sm text-gray-600">Get AI-powered insights</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask BlocIQ about your properties, leases, or compliance..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] resize-none"
                rows={3}
              />
              
              <button
                onClick={handleAskBlocIQ}
                disabled={!message.trim() || state.isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-xl font-semibold hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Ask BlocIQ
              </button>
            </div>
          </div>

          {/* AI Reply */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">AI Reply</h3>
                <p className="text-sm text-gray-600">Generate smart responses</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Generate AI-powered replies based on the current email content and your property context.
              </p>
              
              <button
                onClick={handleAIReply}
                disabled={state.isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate Reply
              </button>
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">BlocIQ Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Building2 className="h-5 w-5 text-[#4f46e5]" />
              <div>
                <p className="text-sm font-medium text-gray-900">Property Management</p>
                <p className="text-xs text-gray-600">Access building data</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <FileText className="h-5 w-5 text-[#4f46e5]" />
              <div>
                <p className="text-sm font-medium text-gray-900">Document Analysis</p>
                <p className="text-xs text-gray-600">AI-powered insights</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Mail className="h-5 w-5 text-[#4f46e5]" />
              <div>
                <p className="text-sm font-medium text-gray-900">Email Integration</p>
                <p className="text-xs text-gray-600">Smart replies & context</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>BlocIQ Outlook Add-In • Property Intelligence Platform</p>
          <p className="mt-1">
            Connect to your BlocIQ dashboard for full functionality
          </p>
        </div>
      </div>
    </div>
  )
}
