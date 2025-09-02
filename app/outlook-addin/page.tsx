'use client'

import { useEffect, useState } from 'react'
import { Wand2, User, LogOut, MessageSquare, Send, Loader } from 'lucide-react'

// Minimal BlocIQ Logo component
function BlocIQLogo({ className = '', size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3 12L12 3L21 12V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect
        x="9"
        y="15"
        width="6"
        height="6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="19" cy="2" r="2.5" fill="currentColor" />
      <rect x="18" y="6" width="2" height="2" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  )
}

export default function MinimalOutlookAddin() {
  const [isOfficeReady, setIsOfficeReady] = useState(false)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string}>>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    // Initialize Office.js
    if (typeof window !== 'undefined' && typeof (window as any).Office !== 'undefined') {
      (window as any).Office.onReady((info: any) => {
        console.log('Office.js ready:', info)
        setIsOfficeReady(true)
      })
    } else {
      // For testing in browser without Office.js
      console.log('Office.js not available - running in development mode')
      setIsOfficeReady(true)
    }

    // Check for existing authentication
    const savedAuth = localStorage.getItem('blociq-addin-auth')
    if (savedAuth) {
      const { email, token } = JSON.parse(savedAuth)
      setIsAuthenticated(true)
      setUserEmail(email)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)

    try {
      const response = await fetch('/api/auth/outlook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsAuthenticated(true)
        setUserEmail(loginEmail)
        localStorage.setItem('blociq-addin-auth', JSON.stringify({
          email: loginEmail,
          token: data.token
        }))
      } else {
        alert(data.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed. Please try again.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('blociq-addin-auth')
    setIsAuthenticated(false)
    setUserEmail('')
    setChatMessages([])
  }

  const handleGenerateReply = async () => {
    setIsLoading(true)
    try {
      // Get current email content
      if (typeof (window as any).Office !== 'undefined') {
        const currentEmail = await new Promise((resolve) => {
          (window as any).Office.context.mailbox.item.body.getAsync('text', (result: any) => {
            resolve(result.value)
          })
        })

        const response = await fetch('/api/ai-email-reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('blociq-addin-auth') || '{}').token}`
          },
          body: JSON.stringify({
            emailContent: currentEmail
          }),
        })

        const data = await response.json()
        
        if (response.ok) {
          // Insert the AI reply into the compose window
          (window as any).Office.context.mailbox.item.body.setAsync(data.reply, {coercionType: (window as any).Office.CoercionType.Text})
          alert('AI reply generated and inserted!')
        } else {
          alert(data.error || 'Failed to generate reply')
        }
      } else {
        alert('AI reply generation feature requires Outlook environment')
      }
    } catch (error) {
      console.error('Reply generation error:', error)
      alert('Failed to generate reply. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const userMessage = { role: 'user', content: newMessage }
    setChatMessages(prev => [...prev, userMessage])
    setNewMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ask-ai-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('blociq-addin-auth') || '{}').token}`
        },
        body: JSON.stringify({
          message: newMessage,
          context: 'outlook-addin'
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        const aiMessage = { role: 'assistant', content: data.response }
        setChatMessages(prev => [...prev, aiMessage])
      } else {
        const errorMessage = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
        setChatMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
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

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#f8fafc] via-white to-[#f1f5f9] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#6A00F5] via-[#7A2BE2] to-[#8A2BE2] text-white p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
              <BlocIQLogo size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">BlocIQ AI Assistant</h1>
              <p className="text-white/90 text-xs">Property Management AI</p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <User className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In to BlocIQ</h2>
                <p className="text-gray-600 text-sm">Access your AI property management assistant</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6A00F5] focus:border-transparent transition-all"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6A00F5] focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] hover:from-[#5A00E5] hover:to-[#7A1BD2] text-white py-4 px-6 rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
                >
                  {isLoggingIn ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader className="w-5 h-5 animate-spin" />
                      Signing In...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  Use your BlocIQ account credentials to access the AI assistant
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#f8fafc] via-white to-[#f1f5f9] flex flex-col">
      {/* Enhanced Header with Authentication */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#6A00F5] via-[#7A2BE2] to-[#8A2BE2] text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
              <BlocIQLogo size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">BlocIQ AI Assistant</h1>
              <p className="text-white/90 text-xs">Welcome, {userEmail}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs">Logout</span>
          </button>
        </div>
      </div>

      {/* AI Reply Button */}
      <div className="flex-shrink-0 p-6 bg-white border-b border-gray-100">
        <button 
          onClick={handleGenerateReply}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] hover:from-[#5A00E5] hover:to-[#7A1BD2] text-white py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
        >
          {isLoading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <Wand2 className="w-5 h-5" />
          )}
          Generate AI Email Reply
        </button>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden bg-gradient-to-b from-white via-[#fafbfc] to-white p-6">
        <div className="h-full bg-white rounded-3xl shadow-lg border border-gray-100 p-6 flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-sm">Start a conversation with your AI assistant</p>
                </div>
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <p className="text-sm text-gray-600">AI is thinking...</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about property management, compliance, leases..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#6A00F5] focus:border-transparent transition-all text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] hover:from-[#5A00E5] hover:to-[#7A1BD2] text-white p-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}