'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function TestDragDropPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testMoveEmail = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/move-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          emailId: 'test-email-id',
          folderId: 'test-folder-id'
        }),
      })

      const data = await response.json()
      setResult({ status: response.status, data })
      
      if (response.ok) {
        toast.success('Move email API call successful')
      } else {
        toast.error(`Move email API call failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error testing move email:', error)
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
      toast.error('Error testing move email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test Drag & Drop Email API</h1>
      
      <Button 
        onClick={testMoveEmail} 
        disabled={loading}
        className="mb-6"
      >
        {loading ? 'Testing...' : 'Test Move Email API'}
      </Button>

      {result && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Result:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">Expected Behavior:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Should return 401 Unauthorized if not authenticated</li>
          <li>Should return 400 if no emailId or folderId provided</li>
          <li>Should return 404 if email or folder not found</li>
          <li>Should move email to specified folder if successful</li>
          <li>Should sync with Outlook if message_id is available</li>
        </ul>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Drag & Drop Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Go to the inbox page</li>
          <li>Select an email from the list</li>
          <li>Drag the email to a folder in the sidebar</li>
          <li>The email should move to that folder in both BlocIQ and Outlook</li>
          <li>Check that the email appears in the correct folder</li>
        </ol>
      </div>
    </div>
  )
} 