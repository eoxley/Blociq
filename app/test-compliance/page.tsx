'use client'

import React, { useState } from 'react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'

export default function TestCompliancePage() {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [seedResults, setSeedResults] = useState<any>(null)
  const [seeding, setSeeding] = useState(false)

  const runTest = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/compliance/test')
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      setTestResults({ error: 'Failed to run test', details: error })
    } finally {
      setLoading(false)
    }
  }

  const runSeed = async () => {
    setSeeding(true)
    try {
      const response = await fetch('/api/compliance/seed', { method: 'POST' })
      const data = await response.json()
      setSeedResults(data)
    } catch (error) {
      setSeedResults({ error: 'Failed to run seed', details: error })
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Compliance Data Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <BlocIQCard>
            <BlocIQCardHeader>
              <h2 className="text-xl font-semibold">Test Compliance Data</h2>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              <p className="text-gray-600 mb-4">
                Test the compliance data queries to see what's available in the database.
              </p>
              <BlocIQButton 
                onClick={runTest} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Testing...' : 'Run Test'}
              </BlocIQButton>
            </BlocIQCardContent>
          </BlocIQCard>

          <BlocIQCard>
            <BlocIQCardHeader>
              <h2 className="text-xl font-semibold">Seed Compliance Data</h2>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              <p className="text-gray-600 mb-4">
                Create sample compliance assets and assign them to buildings for testing.
              </p>
              <BlocIQButton 
                onClick={runSeed} 
                disabled={seeding}
                variant="secondary"
                className="w-full"
              >
                {seeding ? 'Seeding...' : 'Run Seed'}
              </BlocIQButton>
            </BlocIQCardContent>
          </BlocIQCard>
        </div>

        {testResults && (
          <BlocIQCard className="mb-6">
            <BlocIQCardHeader>
              <h2 className="text-xl font-semibold">Test Results</h2>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </BlocIQCardContent>
          </BlocIQCard>
        )}

        {seedResults && (
          <BlocIQCard className="mb-6">
            <BlocIQCardHeader>
              <h2 className="text-xl font-semibold">Seed Results</h2>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(seedResults, null, 2)}
              </pre>
            </BlocIQCardContent>
          </BlocIQCard>
        )}

        <BlocIQCard>
          <BlocIQCardHeader>
            <h2 className="text-xl font-semibold">Next Steps</h2>
          </BlocIQCardHeader>
          <BlocIQCardContent>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Run the test to see what data is currently available</li>
              <li>If no data exists, run the seed to create sample data</li>
              <li>Navigate to <code className="bg-gray-200 px-2 py-1 rounded">/compliance</code> to see the compliance overview page</li>
              <li>Check the browser console for any error messages</li>
            </ol>
          </BlocIQCardContent>
        </BlocIQCard>
      </div>
    </div>
  )
}