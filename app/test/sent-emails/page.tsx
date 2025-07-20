'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Database, Shield, Clock } from 'lucide-react'
import SentEmailsList from '@/components/SentEmailsList'

export default function SentEmailsTestPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sent Emails Log</h1>
        <p className="text-gray-600">
          View and manage all emails sent through BlocIQ. This demonstrates the sent_emails table logging functionality.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sent Emails List */}
        <div className="lg:col-span-2">
          <SentEmailsList limit={20} />
        </div>

        {/* Features Overview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Automatic logging to Supabase</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-sm">Row Level Security (RLS)</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Real-time timestamps</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Outlook integration tracking</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Database Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Table:</span>
                  <Badge variant="outline">sent_emails</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Primary Key:</span>
                  <code className="text-xs">id (UUID)</code>
                </div>
                <div className="flex justify-between">
                  <span>User Association:</span>
                  <code className="text-xs">user_id (UUID)</code>
                </div>
                <div className="flex justify-between">
                  <span>Outlook Tracking:</span>
                  <code className="text-xs">outlook_id (TEXT)</code>
                </div>
                <div className="flex justify-between">
                  <span>Building Context:</span>
                  <code className="text-xs">building_id (UUID)</code>
                </div>
                <div className="flex justify-between">
                  <span>Thread Linking:</span>
                  <code className="text-xs">related_incoming_email (UUID)</code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
{`{
  "status": "sent",
  "log_id": "uuid",
  "message": "Email sent successfully",
  "outlook_message_id": "outlook_123..."
}`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-green-500" />
                <span>Users only see their own sent emails</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-green-500" />
                <span>Authentication required for all operations</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-green-500" />
                <span>Silent error handling for logging failures</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-green-500" />
                <span>Outlook message ID tracking</span>
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
                <h3 className="font-semibold mb-3">Database Table</h3>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
{`CREATE TABLE sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  building_id UUID REFERENCES buildings(id),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  outlook_id TEXT,
  related_incoming_email UUID REFERENCES incoming_emails(id)
);`}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Logging Logic</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Send email via Outlook API</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Log to sent_emails table</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span>Mark original as handled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <span>Update email history</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>Return success response</span>
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