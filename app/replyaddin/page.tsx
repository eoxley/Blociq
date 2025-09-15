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
  MessageSquare,
  Zap
} from 'lucide-react'

/**
 * BlocIQ Generate Reply - Outlook Add-in Landing Page
 * 
 * This page serves as the landing page for the BlocIQ Generate Reply Outlook add-in.
 * It should be accessible at: https://[your-domain]/replyaddin
 * 
 * The add-in provides:
 * - One-click AI reply generation
 * - Property management context
 * - Professional tone and formatting
 * - Direct insertion into email body
 */

interface AddinState {
  isLoading: boolean
  isConnected: boolean
  lastAction: string | null
  error: string | null
}

export default function ReplyAddinPage() {
  const [state, setState] = useState<AddinState>({
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

  const handleGenerateReply = async () => {
    if (!message.trim()) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // This would connect to your generate-draft API
      // const response = await fetch('/api/generate-draft', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ prompt: message })
      // })
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        lastAction: `Generated reply for: "${message}"`,
        error: null
      }))
      
      setMessage('')
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
              <Zap className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">BlocIQ Generate Reply</h1>
              <p className="text-white/90 text-sm">AI-powered email reply generation for property management</p>
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

        {/* Main Feature Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#4f46e5] to-[#a855f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">One-Click AI Reply Generation</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Generate professional, context-aware replies for property management emails with a single click
            </p>
          </div>

          {/* Demo Section */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Try it out:</h3>
            <div className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter an email subject or content to generate a reply..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] resize-none"
                rows={3}
              />
              
              <button
                onClick={handleGenerateReply}
                disabled={!message.trim() || state.isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-xl font-semibold hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Zap className="h-5 w-5" />
                )}
                Generate AI Reply
              </button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered</h3>
            <p className="text-sm text-gray-600">
              Uses advanced AI to understand context and generate professional replies
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Property Context</h3>
            <p className="text-sm text-gray-600">
              Understands property management terminology and industry-specific requirements
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Insertion</h3>
            <p className="text-sm text-gray-600">
              Generated replies are automatically inserted into your email draft
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#4f46e5] text-white rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">1</div>
              <h4 className="font-semibold text-gray-900 mb-2">Click Button</h4>
              <p className="text-sm text-gray-600">Click the BlocIQ button in your Outlook ribbon</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-[#4f46e5] text-white rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">2</div>
              <h4 className="font-semibold text-gray-900 mb-2">AI Analysis</h4>
              <p className="text-sm text-gray-600">AI analyzes the email content and context</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-[#4f46e5] text-white rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">3</div>
              <h4 className="font-semibold text-gray-900 mb-2">Generate Reply</h4>
              <p className="text-sm text-gray-600">Professional reply is generated using BlocIQ intelligence</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-[#4f46e5] text-white rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">4</div>
              <h4 className="font-semibold text-gray-900 mb-2">Insert & Send</h4>
              <p className="text-sm text-gray-600">Reply is inserted into your email, ready to send</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>BlocIQ Generate Reply • Property Intelligence Platform</p>
          <p className="mt-1">
            Seamlessly integrated with Outlook for professional property management
          </p>
        </div>
      </div>
    </div>
  )
}
