'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Database, Shield, Clock, Zap } from 'lucide-react'
import DailySummary from '@/components/DailySummary'

export default function DailySummaryTestPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Daily Summary Test</h1>
        <p className="text-gray-600">
          Test the AI-powered daily summary that analyses your tasks, emails, and compliance alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Summary */}
        <div className="lg:col-span-2">
          <DailySummary />
        </div>

        {/* Features Overview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Real-time data analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-sm">AI-powered insights</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Daily morning summaries</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Instant refresh capability</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Tasks:</span>
                  <Badge variant="outline">building_todos</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Emails:</span>
                  <Badge variant="outline">incoming_emails</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Compliance:</span>
                  <Badge variant="outline">compliance_documents</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Buildings:</span>
                  <Badge variant="outline">buildings</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Endpoint</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                GET /api/daily-summary
              </code>
              <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-x-auto">
{`{
  "summary": "Good morning! Here's your daily summary..."
}`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span>Overdue tasks (past due date)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <span>Tasks due today</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Unread emails</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span>Compliance alerts (7 days)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Technical Details */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Technical Implementation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Data Queries</h3>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
{`// Overdue and due today tasks
SELECT * FROM building_todos 
WHERE is_complete = false 
AND due_date <= today

// Unread emails
SELECT * FROM incoming_emails 
WHERE is_read = false

// Compliance alerts
SELECT * FROM compliance_documents 
WHERE expiry_date <= 7_days_from_now
AND expiry_date >= today`}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">AI Prompt Structure</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Group data by building</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Calculate overdue days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span>Count unread emails</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <span>Format for OpenAI GPT-4o</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>Return friendly summary</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 