'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  Brain,
  PenTool,
  CheckSquare,
  CheckCircle,
  SkipForward,
  X,
  Clock,
  User,
  Building,
  Loader2,
  Mail,
  Calendar,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface Email {
  id: string
  subject: string | null
  from_name: string | null
  from_email: string | null
  received_at: string | null
  body_preview: string | null
  body_full: string | null
  building_id: string | null
  is_read: boolean | null
  is_handled: boolean | null
  tags: string[] | null
  outlook_id: string | null
  buildings?: { name: string } | null
}

interface TriageAssistantProps {
  isOpen: boolean
  onClose: () => void
  onEmailProcessed?: () => void
}

export default function TriageAssistant({
  isOpen,
  onClose,
  onEmailProcessed
}: TriageAssistantProps) {
  const supabase = createClientComponentClient()
  const [currentEmail, setCurrentEmail] = useState<Email | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [draftReply, setDraftReply] = useState<string | null>(null)
  const [processedCount, setProcessedCount] = useState(0)
  const [totalUnhandled, setTotalUnhandled] = useState(0)

  // Load the next unhandled email
  const loadNextEmail = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('incoming_emails')
        .select(`
          id, subject, from_name, from_email, received_at, body_preview, body_full, building_id, is_read, is_handled, tags, outlook_id, buildings(name)
        `)
        .eq('is_handled', false)
        .order('received_at', { ascending: true })
        .limit(1)
        .single()

      if (!error && data) {
        // Fix buildings property: flatten if array
        const email = {
          ...data,
          buildings: Array.isArray(data.buildings) ? data.buildings[0] : data.buildings
        }
        setCurrentEmail(email)
        
        // Mark as read
        await supabase
          .from('incoming_emails')
          .update({ is_read: true })
          .eq('id', email.id)
      } else {
        setCurrentEmail(null) // No more emails
      }
    } catch (error) {
      console.error('Error loading next email:', error)
      setCurrentEmail(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Get total count of unhandled emails
  const getUnhandledCount = async () => {
    try {
      const { count, error } = await supabase
        .from('incoming_emails')
        .select('*', { count: 'exact', head: true })
        .eq('is_handled', false)

      if (!error) {
        setTotalUnhandled(count || 0)
      }
    } catch (error) {
      console.error('Error getting unhandled count:', error)
    }
  }

  // Initialize triage mode
  useEffect(() => {
    if (isOpen) {
      loadNextEmail()
      getUnhandledCount()
      setProcessedCount(0)
      setSummary(null)
      setDraftReply(null)
    }
  }, [isOpen])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    
    const date = new Date(dateString)
    return date.toLocaleString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSenderInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email.split('@')[0].slice(0, 2).toUpperCase()
    }
    return '??'
  }

  const handleSummarise = async () => {
    if (!currentEmail) return
    
    setIsProcessing(true)
    try {
      const response = await fetch('/api/summarise-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_id: currentEmail.id
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSummary(result.summary)
        toast.success('Email summarized')
      } else {
        toast.error(result.error || 'Failed to summarize email')
      }
    } catch (error) {
      console.error('Error summarizing email:', error)
      toast.error('Failed to summarize email')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDraftReply = async () => {
    if (!currentEmail) return
    
    setIsProcessing(true)
    try {
      const response = await fetch('/api/generate-email-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_id: currentEmail.id,
          building_id: currentEmail.building_id
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setDraftReply(result.draft)
        toast.success('Reply draft generated')
      } else {
        toast.error(result.error || 'Failed to generate reply draft')
      }
    } catch (error) {
      console.error('Error generating reply draft:', error)
      toast.error('Failed to generate reply draft')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCreateTodo = async () => {
    if (!currentEmail) return
    
    setIsProcessing(true)
    try {
      // Create a task based on the email
      const taskTitle = `Follow up: ${currentEmail.subject || 'Email from ' + (currentEmail.from_name || currentEmail.from_email)}`
      const taskDescription = `Email from ${currentEmail.from_name || currentEmail.from_email}\n\n${currentEmail.body_preview || ''}`
      
      const { data, error } = await supabase
        .from('building_tasks')
        .insert({
          title: taskTitle,
          description: taskDescription,
          building_id: currentEmail.building_id,
          priority: 'medium',
          status: 'pending',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          created_by: (await supabase.auth.getUser()).data.user?.id
        })

      if (!error) {
        toast.success('To-do created successfully')
        await processEmail()
      } else {
        toast.error('Failed to create to-do')
      }
    } catch (error) {
      console.error('Error creating to-do:', error)
      toast.error('Failed to create to-do')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMarkHandled = async () => {
    if (!currentEmail) return
    
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('incoming_emails')
        .update({ 
          is_handled: true, 
          handled_at: new Date().toISOString() 
        })
        .eq('id', currentEmail.id)

      if (!error) {
        toast.success('Email marked as handled')
        await processEmail()
      } else {
        toast.error('Failed to mark as handled')
      }
    } catch (error) {
      console.error('Error marking as handled:', error)
      toast.error('Failed to mark as handled')
    } finally {
      setIsProcessing(false)
    }
  }

  const skipEmail = async () => {
    await processEmail()
  }

  const processEmail = async () => {
    setProcessedCount(prev => prev + 1)
    setSummary(null)
    setDraftReply(null)
    await loadNextEmail()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                🧠 Inbox Triage Assistant
              </h2>
              <p className="text-sm text-gray-600 font-medium">
                Processed {processedCount} of {totalUnhandled} unhandled emails
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading next email...</h3>
              </div>
            </div>
          ) : !currentEmail ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Inbox triaged! 🎉</h3>
                <p className="text-gray-600 mb-6">
                  All {processedCount} emails have been processed successfully.
                </p>
                <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                  Close Triage Assistant
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Email Header */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-medium">
                      {getSenderInitials(currentEmail.from_name, currentEmail.from_email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-2">
                        {currentEmail.subject || 'No Subject'}
                      </CardTitle>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">
                            {currentEmail.from_name || 'Unknown Sender'}
                          </span>
                          {currentEmail.from_email && (
                            <>
                              <span>•</span>
                              <span className="text-gray-500">{currentEmail.from_email}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(currentEmail.received_at)}</span>
                        </div>
                        {currentEmail.buildings?.name && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            <span>{currentEmail.buildings.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {currentEmail.tags && currentEmail.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {currentEmail.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* AI Summary */}
              {summary && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-green-600" />
                      <h3 className="text-sm font-medium text-gray-900">AI Summary</h3>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-line">
                      {summary}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Draft Reply */}
              {draftReply && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <PenTool className="h-4 w-4 text-purple-600" />
                      <h3 className="text-sm font-medium text-gray-900">Draft Reply</h3>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-line">
                      {draftReply}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Email Body */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Email Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    {currentEmail.body_full ? (
                      <div 
                        className="text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                          __html: currentEmail.body_full.replace(/\n/g, '<br>') 
                        }}
                      />
                    ) : (
                      <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {currentEmail.body_preview || 'No content available'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* AI Action Buttons */}
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-center">What would you like to do with this email?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Button
                      onClick={handleSummarise}
                      disabled={isProcessing}
                      size="lg"
                      className="h-16 flex flex-col items-center gap-2 bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Brain className="h-6 w-6 animate-pulse" />
                      )}
                      <span className="text-sm">🧠 Summarise</span>
                    </Button>

                    <Button
                      onClick={handleDraftReply}
                      disabled={isProcessing}
                      size="lg"
                      className="h-16 flex flex-col items-center gap-2 bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <PenTool className="h-6 w-6 animate-pulse" />
                      )}
                      <span className="text-sm">✍️ Draft Reply</span>
                    </Button>

                    <Button
                      onClick={handleCreateTodo}
                      disabled={isProcessing}
                      size="lg"
                      className="h-16 flex flex-col items-center gap-2 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <CheckSquare className="h-6 w-6 animate-pulse" />
                      )}
                      <span className="text-sm">📝 Add To-Do</span>
                    </Button>

                    <Button
                      onClick={handleMarkHandled}
                      disabled={isProcessing}
                      size="lg"
                      className="h-16 flex flex-col items-center gap-2 bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <CheckCircle className="h-6 w-6 animate-pulse" />
                      )}
                      <span className="text-sm">✅ Mark Handled</span>
                    </Button>

                    <Button
                      onClick={skipEmail}
                      disabled={isProcessing}
                      variant="outline"
                      size="lg"
                      className="h-16 flex flex-col items-center gap-2 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
                    >
                      <SkipForward className="h-6 w-6" />
                      <span className="text-sm">⏭ Skip</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 