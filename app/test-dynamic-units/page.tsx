'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function TestDynamicUnitsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testDynamicUnits = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/list-buildings')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
      console.log('📊 Dynamic units test result:', result)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('❌ Test failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Dynamic Unit Count Test</h1>
      
      <Button onClick={testDynamicUnits} disabled={loading} className="mb-6">
        {loading ? 'Testing...' : 'Test Dynamic Unit Count'}
      </Button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-semibold mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-green-800 font-semibold mb-2">✅ Test Results</h3>
            <p className="text-green-600">
              Found {data.count || 0} buildings with dynamic unit counts
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Buildings with Dynamic Unit Counts</h3>
            <div className="space-y-4">
              {data.buildings?.map((building: any) => (
                <div key={building.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-900">{building.name}</h4>
                      <p className="text-sm text-gray-600">{building.address}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {building.unit_count || 0} units
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-gray-800 font-semibold mb-2">Raw API Response</h3>
            <pre className="text-sm text-gray-600 overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
} 