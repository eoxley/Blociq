'use client'

import React, { useState, useEffect } from 'react'

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  details?: string;
  timing?: number;
}

export default function OutlookDebugPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (name: string, status: 'pending' | 'success' | 'error', details?: string, timing?: number) => {
    setResults(prev => prev.map(r => 
      r.name === name 
        ? { ...r, status, details, timing }
        : r
    ));
  };

  const addTest = (name: string) => {
    setResults(prev => [...prev, { name, status: 'pending' }]);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Basic connectivity
    addTest('Basic Connectivity');
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/ask-ai/health');
      const timing = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        updateResult('Basic Connectivity', 'success', `Server responding: ${JSON.stringify(data)}`, timing);
      } else {
        updateResult('Basic Connectivity', 'error', `HTTP ${response.status}: ${response.statusText}`, timing);
      }
    } catch (error) {
      updateResult('Basic Connectivity', 'error', `Network error: ${error.message}`, Date.now() - startTime);
    }

    // Test 2: Ask AI API
    addTest('Ask AI API');
    const askStartTime = Date.now();
    
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userQuestion: 'Hello, this is a test message',
          useMemory: 'false'
        })
      });
      
      const askTiming = Date.now() - askStartTime;
      
      if (response.ok) {
        const data = await response.json();
        updateResult('Ask AI API', 'success', `Response received: ${data.response?.substring(0, 100)}...`, askTiming);
      } else {
        const errorText = await response.text();
        updateResult('Ask AI API', 'error', `HTTP ${response.status}: ${errorText}`, askTiming);
      }
    } catch (error) {
      updateResult('Ask AI API', 'error', `Network error: ${error.message}`, Date.now() - askStartTime);
    }

    // Test 3: AI Reply API
    addTest('AI Reply API');
    const replyStartTime = Date.now();
    
    try {
      const response = await fetch('/api/addin/generate-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: 'Please generate a reply to this test email',
          outlookContext: {
            from: 'test@example.com',
            subject: 'Test Subject',
            bodyPreview: 'This is a test email for the Outlook add-in',
            receivedDateTime: new Date().toISOString()
          }
        })
      });
      
      const replyTiming = Date.now() - replyStartTime;
      
      if (response.ok) {
        const data = await response.json();
        updateResult('AI Reply API', 'success', `Reply generated: ${data.success ? 'Success' : 'Failed'}`, replyTiming);
      } else {
        const errorText = await response.text();
        updateResult('AI Reply API', 'error', `HTTP ${response.status}: ${errorText}`, replyTiming);
      }
    } catch (error) {
      updateResult('AI Reply API', 'error', `Network error: ${error.message}`, Date.now() - replyStartTime);
    }

    // Test 4: CORS Headers
    addTest('CORS Headers');
    const corsStartTime = Date.now();
    
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'OPTIONS',
      });
      
      const corsTiming = Date.now() - corsStartTime;
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
      };
      
      updateResult('CORS Headers', 'success', `Headers: ${JSON.stringify(corsHeaders)}`, corsTiming);
    } catch (error) {
      updateResult('CORS Headers', 'error', `CORS check failed: ${error.message}`, Date.now() - corsStartTime);
    }

    // Test 5: Chat Page Access
    addTest('Chat Page Access');
    const chatStartTime = Date.now();
    
    try {
      const response = await fetch('/ask-ai');
      const chatTiming = Date.now() - chatStartTime;
      
      if (response.ok) {
        updateResult('Chat Page Access', 'success', `Chat page accessible: ${response.status}`, chatTiming);
      } else {
        updateResult('Chat Page Access', 'error', `Chat page error: ${response.status}`, chatTiming);
      }
    } catch (error) {
      updateResult('Chat Page Access', 'error', `Page access failed: ${error.message}`, Date.now() - chatStartTime);
    }

    // Test 6: AI Reply Page Access
    addTest('AI Reply Page Access');
    const aiReplyStartTime = Date.now();
    
    try {
      const response = await fetch('/ai-reply');
      const aiReplyTiming = Date.now() - aiReplyStartTime;
      
      if (response.ok) {
        updateResult('AI Reply Page Access', 'success', `AI Reply page accessible: ${response.status}`, aiReplyTiming);
      } else {
        updateResult('AI Reply Page Access', 'error', `AI Reply page error: ${response.status}`, aiReplyTiming);
      }
    } catch (error) {
      updateResult('AI Reply Page Access', 'error', `Page access failed: ${error.message}`, Date.now() - aiReplyStartTime);
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
    }
  };

  const getStatusColor = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Outlook Add-in Diagnostic</h1>
          <p className="text-lg text-gray-600">
            Comprehensive testing of all Outlook add-in endpoints and functionality
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </button>
          </div>

          {results.length === 0 && !isRunning && (
            <div className="text-center text-gray-500 py-8">
              <p>Click "Run All Tests" to start the diagnostic</p>
            </div>
          )}

          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className={`p-4 rounded-lg border-2 ${getStatusColor(result.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getStatusIcon(result.status)}</span>
                    <h3 className="font-semibold">{result.name}</h3>
                  </div>
                  {result.timing && (
                    <span className="text-sm font-medium">
                      {result.timing}ms
                    </span>
                  )}
                </div>
                {result.details && (
                  <div className="mt-2 text-sm">
                    <pre className="whitespace-pre-wrap font-mono text-xs bg-white p-2 rounded border">
                      {result.details}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-4">How to Use This Diagnostic:</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <strong>1. Run from Browser:</strong> Test all endpoints from your web browser to verify server-side functionality
            </div>
            <div>
              <strong>2. Compare with Add-in:</strong> If tests pass here but fail in Outlook, the issue is with the add-in JavaScript or Office API
            </div>
            <div>
              <strong>3. Check Network:</strong> Look for timing differences that might indicate network/proxy issues
            </div>
            <div>
              <strong>4. CORS Issues:</strong> If CORS headers are missing, the add-in won't be able to make API calls
            </div>
            <div>
              <strong>5. API Errors:</strong> Check specific error messages to identify configuration or authentication issues
            </div>
          </div>
        </div>

        {/* Expected URLs */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mt-6">
          <h3 className="font-semibold text-amber-900 mb-4">Outlook Add-in URLs:</h3>
          <div className="space-y-2 text-sm text-amber-800 font-mono">
            <div>Chat Interface: <strong>/ask-ai</strong></div>
            <div>AI Reply: <strong>/ai-reply</strong></div>
            <div>Ask API: <strong>/api/ask-ai</strong></div>
            <div>Reply API: <strong>/api/addin/generate-reply</strong></div>
          </div>
        </div>
      </div>
    </div>
  )
}