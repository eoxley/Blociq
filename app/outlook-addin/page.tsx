'use client'

import { useEffect, useState } from 'react'
import { Wand2 } from 'lucide-react'
import AskBlocChat from '../../components/outlook-addin/AskBlocChat'
import GenerateReplyModal from '../../components/outlook-addin/GenerateReplyModal'
import BlocIQLogo from '../../components/BlocIQLogo'

export default function OutlookAddin() {
  const [isOfficeReady, setIsOfficeReady] = useState(false)
  // Authentication removed - add-in works without authentication
  const isAuthenticated = true
  const [showReplyModal, setShowReplyModal] = useState(false)

  useEffect(() => {
    // Initialize Office.js
    if (typeof Office !== 'undefined') {
      Office.onReady((info) => {
        console.log('Office.js ready:', info)
        setIsOfficeReady(true)
        
        // Auto-detect if this is a reply context
        if (window.location.href.includes('reply') || window.location.href.includes('compose')) {
          setShowReplyModal(true)
        }
        
        // No authentication required
      })
    } else {
      // For testing in browser without Office.js
      console.log('Office.js not available - running in development mode')
      setIsOfficeReady(true)
    }
  }, [])

  // Authentication functions removed - no longer needed

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

  // Main add-in interface - works with or without authentication
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
          onClick={() => setShowReplyModal(true)}
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

      {/* Enhanced Chat Interface */}
      <div className="flex-1 overflow-hidden bg-gradient-to-b from-white via-[#fafbfc] to-white">
        <AskBlocChat />
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

        {/* Generate Reply Modal */}
        <GenerateReplyModal 
          isOpen={showReplyModal}
          onClose={() => setShowReplyModal(false)}
          autoTrigger={window.location.href.includes('reply') || window.location.href.includes('compose')}
        />
    </div>
  )
}