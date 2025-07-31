import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function TestEnvPage() {
  const supabase = createClient(cookies())

  try {
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.error('Auth error:', authError)
      throw new Error('Authentication failed')
    }
    
    if (!session) {
      redirect('/login')
    }

    // Fetch environment check data
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/check-env`)
    const envData = await response.json()

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Environment Variables Check</h1>
            
            <div className="space-y-6">
              {/* Summary */}
              <div className={`p-4 rounded-lg ${envData.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full ${envData.ok ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <h2 className="ml-3 text-lg font-semibold">
                    {envData.ok ? '✅ All Required Environment Variables Present' : '❌ Missing Required Environment Variables'}
                  </h2>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Checked {envData.totalChecked} variables ({envData.requiredCount} required, {envData.optionalCount} optional)
                </p>
              </div>

              {/* Required Variables */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Environment Variables</h3>
                <div className="space-y-2">
                  {envData.results.filter(r => r.required).map((result) => (
                    <div key={result.key} className={`flex items-center justify-between p-3 rounded-lg border ${
                      result.present ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div>
                        <div className="font-medium">{result.key}</div>
                        <div className="text-sm text-gray-600">{result.maskedValue}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        result.present ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.present ? 'Present' : 'Missing'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional Variables */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Optional Environment Variables</h3>
                <div className="space-y-2">
                  {envData.results.filter(r => !r.required).map((result) => (
                    <div key={result.key} className={`flex items-center justify-between p-3 rounded-lg border ${
                      result.present ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div>
                        <div className="font-medium">{result.key}</div>
                        <div className="text-sm text-gray-600">{result.maskedValue}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        result.present ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {result.present ? 'Present' : 'Not Set'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Environment Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Environment Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Environment:</span> {envData.environment}
                  </div>
                  <div>
                    <span className="font-medium">Vercel Environment:</span> {envData.vercelEnv || 'Not set'}
                  </div>
                  <div>
                    <span className="font-medium">Timestamp:</span> {new Date(envData.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Missing Variables Summary */}
              {envData.missingRequired.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Missing Required Variables</h3>
                  <ul className="list-disc list-inside space-y-1 text-red-700">
                    {envData.missingRequired.map((key) => (
                      <li key={key}>{key}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-red-600 mt-3">
                    Please add these environment variables to your Vercel project settings.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )

  } catch (error) {
    console.error('Error in TestEnvPage:', error)
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load environment check</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <a
            href="/dashboard"
            className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }
} 