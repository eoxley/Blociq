'use client'

import React, { useState } from 'react'

export default function OutlookAddinSimpleTestPage() {
  const [testMessage, setTestMessage] = useState('Hello')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const testAPI = async () => {
    setLoading(true)
    setResponse('')

    try {
      console.log('Testing API call...')
      
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

      console.log('Response status:', res.status)
      console.log('Response ok:', res.ok)

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Error response:', errorText)
        setResponse(`Error: ${res.status} - ${errorText}`)
        return
      }

      const data = await res.json()
      console.log('Response data:', data)

      if (data.response) {
        setResponse(data.response)
      } else if (data.result) {
        setResponse(data.result)
      } else {
        setResponse('No response field found')
      }

    } catch (error) {
      console.error('Error:', error)
      setResponse(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Simple Outlook Add-in Test</h1>
          <p className="text-lg text-gray-600">
            Test the basic API functionality
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Message
              </label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a test message"
              />
            </div>

            <button
              onClick={testAPI}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test API'}
            </button>

            {response && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response
                </label>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">{response}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Enter a test message (e.g., "Hello" or "What is Section 20?")</li>
            <li>Click "Test API" button</li>
            <li>Check the response below</li>
            <li>Open browser console (F12) to see detailed logs</li>
            <li>If this works, the issue is in the Outlook add-in JavaScript</li>
            <li>If this doesn't work, the issue is with the API endpoint</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
