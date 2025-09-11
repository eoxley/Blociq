'use client'

import React, { useState } from 'react'
import CalendarSyncWidget from '@/components/CalendarSyncWidget'
import { toast } from 'sonner'

export default function CalendarSyncTestPage() {
  const [syncCount, setSyncCount] = useState(0)

  const handleSyncComplete = () => {
    setSyncCount(prev => prev + 1)
    toast.success('Calendar sync completed!')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Calendar Sync Test</h1>
          <p className="text-lg text-gray-600">
            Test the Outlook calendar integration and sync functionality
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Calendar Sync Widget</h2>
            <CalendarSyncWidget onSyncComplete={handleSyncComplete} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sync Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Sync attempts:</span>
                <span className="font-medium">{syncCount}</span>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Test Instructions:</h3>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Click "Connect Outlook Calendar" if not connected</li>
                  <li>Authorize the connection in the popup</li>
                  <li>Return to this page and click "Sync Now"</li>
                  <li>Check the Property Events on the homepage</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Expected Behavior:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Calendar events from Outlook should appear in Property Events</li>
            <li>Events should be properly formatted with titles, times, and locations</li>
            <li>Manual events and calendar events should be displayed together</li>
            <li>Sync should work without errors and show success messages</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
