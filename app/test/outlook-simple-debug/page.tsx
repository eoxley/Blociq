'use client'

import React, { useState } from 'react'

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  details?: string;
  timing?: number;
}

export default function OutlookSimpleDebugPage() {
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

    // Test 1: Basic Server Health
    addTest('Server Health Check');
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/ask-ai/health');
      const timing = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        updateResult('Server Health Check', 'success', `Server responding: ${JSON.stringify(data)}`, timing);
      } else {
        updateResult('Server Health Check', 'error', `HTTP ${response.status}: ${response.statusText}`, timing);
      }
    } catch (error) {
      updateResult('Server Health Check', 'error', `Network error: ${error.message}`, Date.now() - startTime);
    }

    // Test 2: Simple Ask AI without authentication
    addTest('Ask AI API (No Auth)');
    const askStartTime = Date.now();
    
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userQuestion: 'Hello, this is a test message for Outlook add-in debugging',
          useMemory: 'false'
        })
      });
      
      const askTiming = Date.now() - askStartTime;
      
      if (response.ok) {
        const data = await response.json();
        updateResult('Ask AI API (No Auth)', 'success', `Response: ${data.response?.substring(0, 200)}...`, askTiming);
      } else {
        const errorText = await response.text();
        updateResult('Ask AI API (No Auth)', 'error', `HTTP ${response.status}: ${errorText.substring(0, 500)}`, askTiming);
      }
    } catch (error) {
      updateResult('Ask AI API (No Auth)', 'error', `Network error: ${error.message}`, Date.now() - askStartTime);
    }

    // Test 3: AI Reply Generation
    addTest('AI Reply Generation');
    const replyStartTime = Date.now();
    
    try {
      const response = await fetch('/api/addin/generate-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: 'Please generate a reply to this test email for Outlook add-in testing',
          outlookContext: {
            from: 'testuser@example.com',
            subject: 'Testing Outlook Add-in Reply Generation',
            bodyPreview: 'This is a test email to verify that the Outlook add-in can generate contextual replies using AI.',
            receivedDateTime: new Date().toISOString()
          }
        })
      });
      
      const replyTiming = Date.now() - replyStartTime;
      
      if (response.ok) {
        const data = await response.json();
        updateResult('AI Reply Generation', 'success', `Success: ${data.success}, Body: ${data.bodyHtml?.substring(0, 200)}...`, replyTiming);
      } else {
        const errorText = await response.text();
        updateResult('AI Reply Generation', 'error', `HTTP ${response.status}: ${errorText.substring(0, 500)}`, replyTiming);
      }
    } catch (error) {
      updateResult('AI Reply Generation', 'error', `Network error: ${error.message}`, Date.now() - replyStartTime);
    }

    // Test 4: CORS Preflight
    addTest('CORS Preflight Check');
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
      
      updateResult('CORS Preflight Check', 'success', `CORS Headers: ${JSON.stringify(corsHeaders, null, 2)}`, corsTiming);
    } catch (error) {
      updateResult('CORS Preflight Check', 'error', `CORS check failed: ${error.message}`, Date.now() - corsStartTime);
    }

    // Test 5: OpenAI API Key Test (indirect)
    addTest('OpenAI Integration Test');
    const openaiStartTime = Date.now();
    
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userQuestion: 'What is BlocIQ?',
          useMemory: 'false'
        })
      });
      
      const openaiTiming = Date.now() - openaiStartTime;
      
      if (response.ok) {
        const data = await response.json();
        if (data.response && data.response.length > 10) {
          updateResult('OpenAI Integration Test', 'success', `AI responded with ${data.response.length} characters`, openaiTiming);
        } else {
          updateResult('OpenAI Integration Test', 'error', `No proper AI response: ${JSON.stringify(data)}`, openaiTiming);
        }
      } else {
        const errorText = await response.text();
        updateResult('OpenAI Integration Test', 'error', `HTTP ${response.status}: ${errorText.substring(0, 300)}`, openaiTiming);
      }
    } catch (error) {
      updateResult('OpenAI Integration Test', 'error', `Network error: ${error.message}`, Date.now() - openaiStartTime);
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
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🔧 Outlook Add-in Simple Diagnostic</h1>
          <p className="text-lg text-gray-600">
            Environment-independent testing for Outlook add-in APIs
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Core API Tests</h2>
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? '🔄 Running Tests...' : '▶️ Run All Tests'}
            </button>
          </div>

          {results.length === 0 && !isRunning && (
            <div className="text-center text-gray-500 py-12">
              <div className="text-6xl mb-4">🚀</div>
              <p className="text-lg">Ready to test Outlook add-in functionality</p>
              <p className="text-sm text-gray-400">Click "Run All Tests" to start</p>
            </div>
          )}

          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className={`p-4 rounded-lg border-2 transition-all ${getStatusColor(result.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getStatusIcon(result.status)}</span>
                    <h3 className="font-semibold text-lg">{result.name}</h3>
                  </div>
                  {result.timing && (
                    <span className="text-sm font-mono bg-white px-2 py-1 rounded">
                      {result.timing}ms
                    </span>
                  )}
                </div>
                {result.details && (
                  <div className="mt-3 text-sm">
                    <pre className="whitespace-pre-wrap font-mono text-xs bg-white p-3 rounded border max-h-32 overflow-y-auto">
                      {result.details}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Troubleshooting Guide */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
              📋 Test Interpretations
            </h3>
            <div className="space-y-3 text-sm text-blue-800">
              <div>
                <strong>✅ All Green:</strong> APIs working, issue likely in Outlook add-in JavaScript
              </div>
              <div>
                <strong>❌ Server Health:</strong> Development server not running properly
              </div>
              <div>
                <strong>❌ Ask AI API:</strong> Backend configuration issue (env vars, database)
              </div>
              <div>
                <strong>❌ AI Reply:</strong> OpenAI API key or reply adapter issue
              </div>
              <div>
                <strong>❌ CORS:</strong> Cross-origin headers missing, add-in can't call APIs
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h3 className="font-semibold text-amber-900 mb-4 flex items-center">
              🛠️ Next Steps
            </h3>
            <div className="space-y-3 text-sm text-amber-800">
              <div>
                <strong>If tests pass:</strong> Check Outlook add-in manifest and JavaScript
              </div>
              <div>
                <strong>If tests fail:</strong> Fix environment variables and restart server
              </div>
              <div>
                <strong>CORS issues:</strong> Verify add-in domain is whitelisted
              </div>
              <div>
                <strong>Slow responses:</strong> Check OpenAI API quota and network
              </div>
            </div>
          </div>
        </div>

        {/* URLs Reference */}
        <div className="bg-gray-100 border border-gray-300 rounded-xl p-6 mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">📍 Outlook Add-in Endpoint Reference</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
            <div>
              <div className="font-semibold text-gray-700 mb-2">Pages:</div>
              <div className="text-blue-600">/ask-ai</div>
              <div className="text-blue-600">/ai-reply</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">APIs:</div>
              <div className="text-green-600">/api/ask-ai</div>
              <div className="text-green-600">/api/addin/generate-reply</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}