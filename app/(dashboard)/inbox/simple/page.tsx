'use client'

import { useState, useEffect } from 'react'

export default function SimpleInboxPage() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    console.log('🧪 SimpleInboxPage: Component mounted')
    setIsLoaded(true)
  }, [])

  console.log('🎨 SimpleInboxPage: Rendering...')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Simple Inbox Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <div className="space-y-2">
            <p><strong>Component Loaded:</strong> {isLoaded ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
            <p><strong>User Agent:</strong> {typeof window !== 'undefined' ? window.navigator.userAgent : 'Server-side'}</p>
          </div>
        </div>

        <div className="mt-6">
          <a 
            href="/inbox" 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Main Inbox
          </a>
        </div>
      </div>
    </div>
  )
} 