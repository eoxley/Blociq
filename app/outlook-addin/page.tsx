'use client'

import { useEffect, useState } from 'react'
import Head from 'next/head'
import AskBlocChat from '../../components/outlook-addin/AskBlocChat'

export default function OutlookAddin() {
  const [isOfficeReady, setIsOfficeReady] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    // Initialize Office.js
    if (typeof Office !== 'undefined') {
      Office.onReady((info) => {
        console.log('Office.js ready:', info)
        setIsOfficeReady(true)
        
        // Check authentication status
        checkAuthStatus()
      })
    } else {
      // For testing in browser without Office.js
      console.log('Office.js not available - running in development mode')
      setIsOfficeReady(true)
      setIsAuthenticated(true)
    }
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/addin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'verify' }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user) {
          setIsAuthenticated(true)
          console.log('User authenticated:', data.user.email)
        } else {
          setIsAuthenticated(false)
        }
      } else {
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsAuthenticated(false)
    }
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      setAuthError(null)
      
      const response = await fetch('/api/addin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          email,
          password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setIsAuthenticated(true)
        setShowLogin(false)
        console.log('Login successful')
      } else {
        setAuthError(data.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setAuthError('Connection failed. Please try again.')
    }
  }

  if (!isOfficeReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading BlocIQ Add-in</h3>
          <p className="text-gray-600 text-sm">Connecting to Outlook...</p>
        </div>
      </div>
    )
  }

  // Main add-in interface - works with or without authentication
  return (
    <>
      <Head>
        <title>BlocIQ - Outlook Add-in</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
      </Head>
      
      <div className="h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">BQ</span>
              </div>
              <div>
                <h1 className="font-semibold text-sm">BlocIQ AI Assistant</h1>
                <p className="text-blue-100 text-xs">
                  {isAuthenticated ? 'Authenticated' : 'Guest Mode'} • Property Management AI
                </p>
              </div>
            </div>
            
            {!isAuthenticated && (
              <button
                onClick={() => setShowLogin(true)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Login Modal */}
        {showLogin && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 m-4 w-full max-w-sm">
              <h2 className="text-lg font-semibold mb-4">Sign in to BlocIQ</h2>
              
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleLogin(
                  formData.get('email') as string,
                  formData.get('password') as string
                )
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="your@email.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••"
                    />
                  </div>

                  {authError && (
                    <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                      {authError}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogin(false)
                        setAuthError(null)
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              </form>
              
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-600">
                  Continue without signing in for limited features
                </p>
                <button
                  onClick={() => {
                    setShowLogin(false)
                    setAuthError(null)
                  }}
                  className="text-blue-600 text-xs hover:underline mt-1"
                >
                  Use Guest Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <AskBlocChat />
        </div>
        
        {/* Footer */}
        <div className="flex-shrink-0 px-3 py-2 bg-gray-50 border-t text-center">
          <p className="text-xs text-gray-500">
            Powered by BlocIQ • AI-driven property management
          </p>
        </div>
      </div>
    </>
  )
}