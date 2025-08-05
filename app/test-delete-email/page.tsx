'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function TestDeleteEmailPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testDeleteEmail = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/delete-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          emailId: 'test-email-id' 
        }),
      })

      const data = await response.json()
      setResult({ status: response.status, data })
      
      if (response.ok) {
        toast.success('Delete API call successful')
      } else {
        toast.error(`Delete API call failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error testing delete email:', error)
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
      toast.error('Error testing delete email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test Delete Email API</h1>
      
      <Button 
        onClick={testDeleteEmail} 
        disabled={loading}
        className="mb-6"
      >
        {loading ? 'Testing...' : 'Test Delete Email API'}
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
          <li>Should return 400 if no emailId provided</li>
          <li>Should return 404 if email not found</li>
          <li>Should move email to "Deleted Items" folder if successful</li>
        </ul>
      </div>
    </div>
  )
} 