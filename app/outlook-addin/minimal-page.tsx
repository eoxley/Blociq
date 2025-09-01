'use client'

import { useEffect, useState } from 'react'
import { Wand2 } from 'lucide-react'

// Minimal BlocIQ Logo component
function BlocIQLogo({ className = '', size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3 12L12 3L21 12V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect
        x="9"
        y="15"
        width="6"
        height="6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="19" cy="2" r="2.5" fill="currentColor" />
      <rect x="18" y="6" width="2" height="2" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  )
}

export default function MinimalOutlookAddin() {
  const [isOfficeReady, setIsOfficeReady] = useState(false)
  const [showReplyModal, setShowReplyModal] = useState(false)

  useEffect(() => {
    // Initialize Office.js
    if (typeof window !== 'undefined' && typeof (window as any).Office !== 'undefined') {
      (window as any).Office.onReady((info: any) => {
        console.log('Office.js ready:', info)
        setIsOfficeReady(true)
      })
    } else {
      // For testing in browser without Office.js
      console.log('Office.js not available - running in development mode')
      setIsOfficeReady(true)
    }
  }, [])

  const handleGenerateReply = () => {
    alert('AI Reply Generation - Feature Coming Soon!')
  }

  const handleAskQuestion = () => {
    alert('AI Chat - Feature Coming Soon!')
  }

  if (!isOfficeReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading BlocIQ Add-in</h3>
          <p className="text-gray-600 text-sm">Connecting to Outlook...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#f8fafc] via-white to-[#f1f5f9] flex flex-col">
      {/* Enhanced Header with Master Branding */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#6A00F5] via-[#7A2BE2] to-[#8A2BE2] text-white p-4 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-2 right-4 w-16 h-16 bg-white rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-2 left-4 w-12 h-12 bg-white rounded-full blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
              <BlocIQLogo size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-white via-white/95 to-white/90 bg-clip-text text-transparent">
                BlocIQ AI Assistant
              </h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-300 rounded-full animate-pulse shadow-lg"></div>
                <p className="text-white/90 text-xs font-medium">
                  Property Management AI • Ready to Help
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg"></div>
            <span className="text-xs text-white/80 font-medium">Online</span>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="flex-shrink-0 p-6 bg-white border-b border-gray-100">
        <button 
          onClick={handleGenerateReply}
          className="w-full bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] hover:from-[#5A00E5] hover:to-[#7A1BD2] text-white py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-white/20 backdrop-blur-sm"
        >
          <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
            <Wand2 className="w-4 h-4" />
          </div>
          Generate AI Email Reply
          <div className="w-2 h-2 bg-teal-300 rounded-full animate-pulse"></div>
        </button>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 font-medium">
            Or ask me anything about property management below ↓
          </p>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden bg-gradient-to-b from-white via-[#fafbfc] to-white p-6">
        <div className="h-full bg-white rounded-3xl shadow-lg border border-gray-100 p-6 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <BlocIQLogo size={32} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">BlocIQ AI Assistant</h3>
              <p className="text-gray-600 text-sm mb-4">
                Your property management AI assistant is ready to help with lease analysis, compliance tracking, and more.
              </p>
              <button 
                onClick={handleAskQuestion}
                className="px-6 py-3 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
              >
                Start Conversation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] rounded-lg flex items-center justify-center">
            <BlocIQLogo size={12} className="text-white" />
          </div>
          <p className="text-xs text-gray-600 font-medium">
            Powered by <span className="bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] bg-clip-text text-transparent font-bold">BlocIQ</span> • AI-driven property management
          </p>
          <div className="w-1 h-1 bg-[#6A00F5] rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}