'use client'

import React, { useState } from 'react'

export default function OutlookAddinDebugPage() {
  const [testMessage, setTestMessage] = useState('What is Section 20?')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [debugLog, setDebugLog] = useState<string[]>([])

  const addLog = (message: string) => {
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testAPI = async () => {
    if (!testMessage.trim()) return

    setLoading(true)
    setResponse('')
    setDebugLog([])

    addLog('Starting API test...')
    addLog(`Sending message: "${testMessage}"`)

    try {
      addLog('Making API request to /api/ask-ai')
      
      const res = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testMessage,
          context: 'outlook-addin'
        })
      })

      addLog(`Response status: ${res.status}`)
      addLog(`Response headers: ${JSON.stringify(Object.fromEntries(res.headers.entries()))}`)

      if (!res.ok) {
        const errorText = await res.text()
        addLog(`Error response: ${errorText}`)
        setResponse(`Error: ${res.status} - ${errorText}`)
        return
      }

      const data = await res.json()
      addLog(`Response data keys: ${Object.keys(data).join(', ')}`)
      addLog(`Response data: ${JSON.stringify(data, null, 2)}`)

      if (data.response || data.result) {
        const responseText = data.response || data.result
        addLog(`Found response text: "${responseText.substring(0, 100)}..."`)
        setResponse(responseText)
      } else {
        addLog('No response or result field found in API response')
        setResponse('No response received from AI')
      }

    } catch (error) {
      addLog(`Error: ${error.message}`)
      setResponse(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Outlook Add-in Debug</h1>
          <p className="text-lg text-gray-600">
            Debug the Outlook add-in API communication
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Controls */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">API Test</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Message
                </label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter a test message"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <button
                onClick={testAPI}
                disabled={loading || !testMessage.trim()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Testing...' : 'Test API Call'}
              </button>

              {response && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Response
                  </label>
                  <div className="bg-gray-100 p-4 rounded-lg max-h-60 overflow-auto">
                    <pre className="text-sm whitespace-pre-wrap">{response}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Debug Log */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Debug Log</h2>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg max-h-96 overflow-auto font-mono text-sm">
              {debugLog.length === 0 ? (
                <div className="text-gray-500">No debug information yet...</div>
              ) : (
                debugLog.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
            </div>

            <button
              onClick={() => setDebugLog([])}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Log
            </button>
          </div>
        </div>

        {/* Expected Behavior */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Expected Behavior:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>API should return status 200</li>
            <li>Response should contain 'response' or 'result' field</li>
            <li>Response should contain AI-generated text</li>
            <li>No CORS errors should occur</li>
            <li>Response should be relevant to the input message</li>
          </ul>
        </div>

        {/* Troubleshooting */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-900 mb-2">Troubleshooting:</h3>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>If you get CORS errors, check the API endpoint CORS headers</li>
            <li>If you get 401 errors, check authentication requirements</li>
            <li>If you get 500 errors, check server logs for detailed error messages</li>
            <li>If response is empty, check if the AI service is configured correctly</li>
            <li>If response format is wrong, check the API response structure</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
