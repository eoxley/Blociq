'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Mail, 
  Calendar, 
  User, 
  Building, 
  ExternalLink,
  RefreshCw,
  Loader2
} from 'lucide-react'

interface SentEmail {
  id: string
  to_email: string
  subject: string
  body: string
  building_id: string | null
  building_name?: string
  sent_at: string
  outlook_id: string | null
  related_incoming_email: string | null
  created_at: string
}

interface SentEmailsListProps {
  className?: string;
  limit?: number;
}

export default function SentEmailsList({ 
  className = "", 
  limit = 10 
}: SentEmailsListProps) {
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchSentEmails()
  }, [limit])

  const fetchSentEmails = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('sent_emails')
        .select(`
          *,
          buildings(name)
        `)
        .order('sent_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching sent emails:', error)
        return
      }

      setSentEmails(data?.map(email => ({
        ...email,
        building_name: email.buildings?.[0]?.name
      })) || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSentEmails()
    setRefreshing(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    }
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Sent Emails
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading sent emails...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Sent Emails
          </CardTitle>
          <Button 
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sentEmails.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No sent emails found</p>
            <p className="text-sm">Sent emails will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sentEmails.map((email) => (
              <Card key={email.id} className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {email.subject}
                    </h3>
                    <div className="flex items-center gap-2">
                      {email.outlook_id && (
                        <Badge variant="outline" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Outlook
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                        Sent
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>To: {email.to_email}</span>
                    </div>
                    
                    {email.building_name && (
                      <div className="flex items-center gap-2">
                        <Building className="h-3 w-3" />
                        <span>{email.building_name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(email.sent_at)}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    <p className="whitespace-pre-wrap">
                      {truncateText(email.body, 150)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 