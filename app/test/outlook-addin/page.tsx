'use client'

import React, { useState } from 'react'

export default function OutlookAddinTestPage() {
  const [testMessage, setTestMessage] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const testAPI = async () => {
    if (!testMessage.trim()) return

    setLoading(true)
    setResponse('')

    try {
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

      const data = await res.json()
      setResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      setResponse(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Outlook Add-in Test</h1>
          <p className="text-lg text-gray-600">
            Test the API endpoint that the Outlook add-in uses
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Message
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter a test message (e.g., 'What is Section 20?')"
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
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                  {response}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Expected Behavior:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>API should return a JSON response with success: true</li>
            <li>Response should contain a 'response' or 'result' field with AI-generated text</li>
            <li>No CORS errors should occur</li>
            <li>Response should be relevant to the input message</li>
          </ul>
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-900 mb-2">Troubleshooting:</h3>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>If you get CORS errors, check the API endpoint CORS headers</li>
            <li>If you get 401 errors, check authentication requirements</li>
            <li>If you get 500 errors, check server logs for detailed error messages</li>
            <li>If response is empty, check if the AI service is configured correctly</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
