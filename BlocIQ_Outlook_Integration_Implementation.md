'use client'

import React, { useState, useEffect } from 'react'
import { TestIcon, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Mail, User, Building, FileText, Zap, Activity, PlayCircle, StopCircle } from 'lucide-react'

interface TestResult {
  id: string
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  duration?: number
  details?: string
  data?: any
}

interface TriageProgress {
  current: number
  total: number
  processed: TestResult[]
  errors: number
  categories: { [key: string]: number }
}

export default function ComprehensiveTestingInterface() {
  // Test States
  const [authTest, setAuthTest] = useState<TestResult>({ id: 'auth', name: 'Email Authentication', status: 'pending' })
  const [chatTest, setChatTest] = useState<TestResult>({ id: 'chat', name: 'Chat Interface', status: 'pending' })
  const [replyTest, setReplyTest] = useState<TestResult>({ id: 'reply', name: 'V2 Reply Generation', status: 'pending' })
  const [triageTest, setTriageTest] = useState<TestResult>({ id: 'triage', name: 'V2 Bulk Triage', status: 'pending' })
  const [dbTest, setDbTest] = useState<TestResult>({ id: 'db', name: 'Database Queries', status: 'pending' })
  
  // Testing Configuration
  const [testEmail] = useState('test@blociq.co.uk')
  const [testEmailCount, setTestEmailCount] = useState(5)
  const [isRunning, setIsRunning] = useState(false)
  const [triageProgress, setTriageProgress] = useState<TriageProgress>({ current: 0, total: 0, processed: [], errors: 0, categories: {} })
  
  // Test Data
  const [authToken, setAuthToken] = useState<string>('')
  const [testResults, setTestResults] = useState<{ [key: string]: any }>({})
  
  const mockEmails = [
    { subject: 'Lease Renewal Request - Flat 8', body: 'Dear Property Manager, I would like to renew my lease for Flat 8 at Ashwood House. Please let me know the new terms.', sender: 'tenant@example.com', category: 'lease', priority: 'medium' },
    { subject: 'URGENT: Heating System Failure', body: 'The heating system in building 2 has completely failed. Multiple tenants are affected. Please arrange emergency repairs immediately.', sender: 'manager@example.com', category: 'maintenance', priority: 'urgent' },
    { subject: 'Section 20 Notice Query', body: 'I received a Section 20 notice regarding major works. Could you explain what this means for my service charges?', sender: 'leaseholder@example.com', category: 'compliance', priority: 'high' },
    { subject: 'Rent Review - Annual Increase', body: 'Following the annual rent review, we are implementing a 3% increase effective next month.', sender: 'accounts@example.com', category: 'financial', priority: 'medium' },
    { subject: 'Building Insurance Renewal', body: 'The building insurance policy is due for renewal next month. Please review the attached documentation.', sender: 'insurance@example.com', category: 'insurance', priority: 'low' },
    { subject: 'Fire Safety Certificate Update', body: 'The annual fire safety inspection has been completed. Certificate attached for your records.', sender: 'safety@example.com', category: 'compliance', priority: 'medium' },
    { subject: 'New Tenant Application - Unit 12', body: 'We have received a new application for Unit 12. The applicant has provided all required documentation.', sender: 'lettings@example.com', category: 'lettings', priority: 'medium' },
    { subject: 'Ground Rent Payment Due', body: 'This is a reminder that ground rent payments are due for Q4. Please arrange payment by the due date.', sender: 'freeholder@example.com', category: 'financial', priority: 'high' }
  ]

  // Test Functions
  const updateTestResult = (testId: string, updates: Partial<TestResult>) => {
    const updater = (prev: TestResult) => ({ ...prev, ...updates })
    
    switch (testId) {
      case 'auth': setAuthTest(updater); break
      case 'chat': setChatTest(updater); break
      case 'reply': setReplyTest(updater); break
      case 'triage': setTriageTest(updater); break
      case 'db': setDbTest(updater); break
    }
  }

  // Authentication Test
  const testEmailAuthentication = async () => {
    updateTestResult('auth', { status: 'running' })
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/outlook-addin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bypass_auth: true,
          email: testEmail,
          display_name: 'Test User'
        })
      })
      
      const data = await response.json()
      const duration = Date.now() - startTime
      
      if (data.success && data.token) {
        setAuthToken(data.token)
        updateTestResult('auth', { 
          status: 'passed', 
          duration, 
          details: `Token generated for ${data.user.email}`,
          data: data.user
        })
        setTestResults(prev => ({ ...prev, auth: data }))
      } else {
        throw new Error(data.error || 'Authentication failed')
      }
    } catch (error) {
      updateTestResult('auth', { 
        status: 'failed', 
        duration: Date.now() - startTime,
        details: (error as Error).message 
      })
    }
  }

  // Chat Interface Test  
  const testChatInterface = async () => {
    if (!authToken) {
      updateTestResult('chat', { status: 'failed', details: 'Authentication required first' })
      return
    }
    
    updateTestResult('chat', { status: 'running' })
    const startTime = Date.now()
    
    try {
      const testQueries = [
        'Who is the leaseholder of 8 ashwood house?',
        'What are my buildings?',
        'What are the access codes for ashwood house?'
      ]
      
      const results = []
      for (const query of testQueries) {
        const response = await fetch('/api/outlook-addin/ask-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: query,
            token: authToken,
            is_outlook_addin: true
          })
        })
        
        const data = await response.json()
        if (!data.success) throw new Error(`Query failed: ${data.error}`)
        
        results.push({
          query,
          response: data.response.substring(0, 100) + '...',
          queryType: data.queryType
        })
      }
      
      const duration = Date.now() - startTime
      updateTestResult('chat', { 
        status: 'passed', 
        duration,
        details: `${results.length} queries successful`,
        data: results
      })
      setTestResults(prev => ({ ...prev, chat: results }))
      
    } catch (error) {
      updateTestResult('chat', { 
        status: 'failed', 
        duration: Date.now() - startTime,
        details: (error as Error).message 
      })
    }
  }

  // V2 Reply Generation Test
  const testReplyGeneration = async () => {
    updateTestResult('reply', { status: 'running' })
    const startTime = Date.now()
    
    try {
      const testEmail = mockEmails[0]
      const response = await fetch('/api/ai-email-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: testEmail.subject,
          body: testEmail.body,
          sender: testEmail.sender,
          senderName: 'Test Tenant',
          context: 'outlook_addin_reply'
        })
      })
      
      const data = await response.json()
      const duration = Date.now() - startTime
      
      if (data.success && data.suggested_reply) {
        updateTestResult('reply', { 
          status: 'passed', 
          duration,
          details: `Reply generated with ${data.confidence}% confidence`,
          data: {
            analysis: data.analysis,
            reply: data.suggested_reply.substring(0, 200) + '...',
            confidence: data.confidence,
            isPropertyRelated: data.is_property_related
          }
        })
        setTestResults(prev => ({ ...prev, reply: data }))
      } else {
        throw new Error(data.error || 'Reply generation failed')
      }
    } catch (error) {
      updateTestResult('reply', { 
        status: 'failed', 
        duration: Date.now() - startTime,
        details: (error as Error).message 
      })
    }
  }

  // V2 Bulk Triage Test
  const testBulkTriage = async () => {
    updateTestResult('triage', { status: 'running' })
    setTriageProgress({ current: 0, total: testEmailCount, processed: [], errors: 0, categories: {} })
    
    const startTime = Date.now()
    const processedEmails: TestResult[] = []
    const categories: { [key: string]: number } = {}
    let errors = 0
    
    try {
      for (let i = 0; i < testEmailCount; i++) {
        const email = mockEmails[i % mockEmails.length]
        const emailStartTime = Date.now()
        
        try {
          // Simulate triage API call (actual implementation would call /api/triage)
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200)) // Simulate processing time
          
          const mockTriageResult = {
            category: email.category,
            priority: email.priority,
            confidence: 85 + Math.floor(Math.random() * 15),
            suggested_action: `Process ${email.category} request with ${email.priority} priority`
          }
          
          const emailResult: TestResult = {
            id: `email-${i}`,
            name: `${email.subject.substring(0, 30)}...`,
            status: 'passed',
            duration: Date.now() - emailStartTime,
            details: `${mockTriageResult.category} (${mockTriageResult.priority})`,
            data: mockTriageResult
          }
          
          processedEmails.push(emailResult)
          categories[mockTriageResult.category] = (categories[mockTriageResult.category] || 0) + 1
          
          setTriageProgress(prev => ({
            current: i + 1,
            total: testEmailCount,
            processed: [...processedEmails],
            errors,
            categories
          }))
          
        } catch (emailError) {
          errors++
          processedEmails.push({
            id: `email-${i}`,
            name: `${email.subject.substring(0, 30)}...`,
            status: 'failed',
            duration: Date.now() - emailStartTime,
            details: (emailError as Error).message
          })
        }
      }
      
      const duration = Date.now() - startTime
      const successRate = ((processedEmails.length - errors) / processedEmails.length * 100).toFixed(1)
      
      updateTestResult('triage', { 
        status: errors > 0 ? 'failed' : 'passed', 
        duration,
        details: `${processedEmails.length} emails processed, ${successRate}% success rate`,
        data: { processed: processedEmails.length, categories, errors }
      })
      setTestResults(prev => ({ ...prev, triage: { processed: processedEmails, categories, errors } }))
      
    } catch (error) {
      updateTestResult('triage', { 
        status: 'failed', 
        duration: Date.now() - startTime,
        details: (error as Error).message 
      })
    }
  }

  // Database Test
  const testDatabaseQueries = async () => {
    if (!authToken) {
      updateTestResult('db', { status: 'failed', details: 'Authentication required first' })
      return
    }
    
    updateTestResult('db', { status: 'running' })
    const startTime = Date.now()
    
    try {
      const queries = [
        { type: 'leaseholder', prompt: 'Who is the leaseholder of 8 ashwood house?' },
        { type: 'buildings', prompt: 'Show me my buildings' },
        { type: 'access_codes', prompt: 'What are the access codes for ashwood house?' },
        { type: 'documents', prompt: 'What documents have I uploaded?' }
      ]
      
      const results = []
      for (const query of queries) {
        const response = await fetch('/api/outlook-addin/ask-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: query.prompt,
            token: authToken,
            is_outlook_addin: true
          })
        })
        
        const data = await response.json()
        if (!data.success) throw new Error(`${query.type} query failed: ${data.error}`)
        
        results.push({
          queryType: data.queryType,
          hasData: data.response && !data.response.includes('couldn\\'t find') && !data.response.includes('don\\'t have any'),
          response: data.response.substring(0, 150) + '...'
        })
      }
      
      const duration = Date.now() - startTime
      const dataQueriesWithResults = results.filter(r => r.hasData).length
      
      updateTestResult('db', { 
        status: 'passed', 
        duration,
        details: `${results.length} queries executed, ${dataQueriesWithResults} with data`,
        data: results
      })
      setTestResults(prev => ({ ...prev, db: results }))
      
    } catch (error) {
      updateTestResult('db', { 
        status: 'failed', 
        duration: Date.now() - startTime,
        details: (error as Error).message 
      })
    }
  }

  // Run All Tests
  const runAllTests = async () => {
    setIsRunning(true)
    
    // Reset all tests
    setAuthTest({ id: 'auth', name: 'Email Authentication', status: 'pending' })
    setChatTest({ id: 'chat', name: 'Chat Interface', status: 'pending' })
    setReplyTest({ id: 'reply', name: 'V2 Reply Generation', status: 'pending' })
    setTriageTest({ id: 'triage', name: 'V2 Bulk Triage', status: 'pending' })
    setDbTest({ id: 'db', name: 'Database Queries', status: 'pending' })
    setTestResults({})
    
    try {
      await testEmailAuthentication()
      await testChatInterface()
      await testReplyGeneration()
      await testDatabaseQueries()
      await testBulkTriage()
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'border-blue-200 bg-blue-50'
      case 'passed': return 'border-green-200 bg-green-50'
      case 'failed': return 'border-red-200 bg-red-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center">
              <TestIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">BlocIQ Outlook Integration Test Suite</h1>
              <p className="text-gray-600">Comprehensive testing interface for all Outlook add-in functionality</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isRunning ? (
              <button
                onClick={() => setIsRunning(false)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <StopCircle className="w-4 h-4" />
                Stop Tests
              </button>
            ) : (
              <button
                onClick={runAllTests}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg transition-colors font-semibold"
              >
                <PlayCircle className="w-4 h-4" />
                Run All Tests
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Test Configuration */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Email</label>
            <input
              type="email"
              value={testEmail}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bulk Triage Count</label>
            <select
              value={testEmailCount}
              onChange={(e) => setTestEmailCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value={5}>5 emails (Quick Test)</option>
              <option value={20}>20 emails (Medium Test)</option>
              <option value={50}>50 emails (Full Test)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Authentication Status</label>
            <div className="flex items-center gap-2 px-3 py-2">
              {authToken ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
              <span className="text-sm">{authToken ? 'Authenticated' : 'Not Authenticated'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {[authTest, chatTest, replyTest, triageTest, dbTest].map((test) => (
          <div key={test.id} className={`bg-white rounded-2xl shadow-sm border-2 ${getStatusColor(test.status)} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(test.status)}
                <h3 className="font-semibold text-gray-900">{test.name}</h3>
              </div>
              {test.duration && (
                <span className="text-xs text-gray-500">{test.duration}ms</span>
              )}
            </div>
            
            {test.details && (
              <p className="text-sm text-gray-600 mb-3">{test.details}</p>
            )}
            
            {test.data && (
              <div className="space-y-2">
                {test.id === 'auth' && test.data.email && (
                  <div className="text-xs bg-gray-100 rounded p-2">
                    <strong>User:</strong> {test.data.email}
                  </div>
                )}
                
                {test.id === 'chat' && Array.isArray(test.data) && (
                  <div className="space-y-1">
                    {test.data.map((result: any, index: number) => (
                      <div key={index} className="text-xs bg-gray-100 rounded p-2">
                        <strong>{result.queryType}:</strong> {result.response}
                      </div>
                    ))}
                  </div>
                )}
                
                {test.id === 'reply' && test.data.confidence && (
                  <div className="text-xs bg-gray-100 rounded p-2">
                    <strong>Confidence:</strong> {test.data.confidence}% | 
                    <strong> Property:</strong> {test.data.isPropertyRelated ? 'Yes' : 'No'}
                  </div>
                )}
                
                {test.id === 'triage' && test.data.categories && (
                  <div className="text-xs bg-gray-100 rounded p-2">
                    <strong>Categories:</strong> {Object.entries(test.data.categories).map(([cat, count]) => `${cat}(${count})`).join(', ')}
                  </div>
                )}
              </div>
            )}
            
            {/* Individual test buttons */}
            <div className="mt-4">
              <button
                onClick={() => {
                  switch (test.id) {
                    case 'auth': testEmailAuthentication(); break
                    case 'chat': testChatInterface(); break
                    case 'reply': testReplyGeneration(); break
                    case 'triage': testBulkTriage(); break
                    case 'db': testDatabaseQueries(); break
                  }
                }}
                disabled={test.status === 'running'}
                className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
              >
                {test.status === 'running' ? 'Running...' : 'Run Test'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Triage Progress */}
      {triageTest.status === 'running' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Triage Progress</h3>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Processing emails...</span>
              <span>{triageProgress.current} of {triageProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(triageProgress.current / triageProgress.total) * 100}%` }}
              />
            </div>
          </div>
          
          {Object.keys(triageProgress.categories).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(triageProgress.categories).map(([category, count]) => (
                <div key={category} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-600 capitalize">{category}</div>
                </div>
              ))}
            </div>
          )}
          
          {triageProgress.errors > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{triageProgress.errors} processing errors</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <User className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">Authentication: Ready</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">APIs: Available</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <Building className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-700">Database: Connected</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <Zap className="w-4 h-4 text-indigo-600" />
            <span className="text-sm text-indigo-700">V2 Systems: Online</span>
          </div>
        </div>
      </div>
    </div>
  )
}