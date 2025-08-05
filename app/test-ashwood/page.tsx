'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function TestAshwoodPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)

  const checkAshwood = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/check-ashwood')
      const result = await response.json()
      setData(result)
      console.log('Ashwood check result:', result)
    } catch (error) {
      console.error('Error checking Ashwood:', error)
      setData({ error: 'Failed to check Ashwood House' })
    } finally {
      setLoading(false)
    }
  }

  const debugAshwood = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug-ashwood')
      const result = await response.json()
      setDebugData(result)
      console.log('Debug Ashwood result:', result)
    } catch (error) {
      console.error('Error debugging Ashwood:', error)
      setDebugData({ error: 'Failed to debug Ashwood House' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Ashwood House Test</h1>
      
      <div className="space-y-4">
        <Button onClick={checkAshwood} disabled={loading}>
          {loading ? 'Checking...' : 'Check Ashwood House Data (Auth Required)'}
        </Button>

        <Button onClick={debugAshwood} disabled={loading}>
          {loading ? 'Checking...' : 'Debug Ashwood House Data (No Auth)'}
        </Button>
      </div>

      {data && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Auth Check Results:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

      {debugData && (
        <div className="mt-6 p-4 bg-blue-100 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Debug Results:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 