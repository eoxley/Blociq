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
  AlertTriangle,
  FileText,
  Zap,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Info,
  Sparkles,
  BarChart3,
  Target,
  Timer,
  Send,
  Archive,
  Flag,
  Star,
  Eye,
  MessageSquare,
  Filter,
  SortAsc,
  Download,
  Share2,
  Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
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

interface TriageResult {
  emailId: string
  urgency: 'critical' | 'high' | 'medium' | 'low' | 'none'
  actionRequired: 'immediate' | 'today' | 'this_week' | 'no_action' | 'file'
  category: string
  summary: string
  draftReply: string
  suggestedActions: string[]
  tags: string[]
  buildingMatch?: string
  estimatedResponseTime: string
}

interface TriageSummary {
  totalEmails: number
  critical: number
  high: number
  medium: number
  low: number
  noAction: number
  immediate: number
  today: number
  thisWeek: number
  filed: number
  totalDraftsGenerated: number
  averageResponseTime: string
  topCategories: { category: string; count: number }[]
  topBuildings: { building: string; count: number }[]
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
  const [isTriageRunning, setIsTriageRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [triageResults, setTriageResults] = useState<TriageResult[]>([])
  const [summary, setSummary] = useState<TriageSummary | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low' | 'no_action'>('all')
  const [sortBy, setSortBy] = useState<'urgency' | 'date' | 'category'>('urgency')

  // Start the triage process
  const startTriage = async () => {
    setIsTriageRunning(true)
    setProgress(0)
    setCurrentStep('Loading emails...')
    
    try {
      // Step 1: Load all unhandled emails
      setProgress(10)
      setCurrentStep('Loading unhandled emails...')
      
      const { data: emails, error } = await supabase
        .from('incoming_emails')
        .select(`
          id, subject, from_name, from_email, received_at, body_preview, body_full, building_id, unread, handled, tag, message_id, buildings(name)
        `)
        .eq('handled', false)
        .order('received_at', { ascending: true })

      if (error) throw error

      const totalEmails = emails?.length || 0
      if (totalEmails === 0) {
        toast.success('No unhandled emails found!')
        setIsTriageRunning(false)
        return
      }

      setProgress(20)
      setCurrentStep(`Analyzing ${totalEmails} emails...`)

      // Step 2: Bulk analyze emails using the new API
      const emailsForAnalysis = emails.map(email => ({
        id: email.id,
        subject: email.subject,
        body: email.body_preview || email.body_full,
        from: email.from_email,
        receivedAt: email.received_at,
        buildingId: email.building_id
      }))

      const bulkTriageResponse = await fetch('/api/bulk-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emailsForAnalysis })
      })

      if (!bulkTriageResponse.ok) {
        throw new Error('Bulk triage failed')
      }

      const bulkTriageData = await bulkTriageResponse.json()
      const triageResults = bulkTriageData.results

      setProgress(60)
      setCurrentStep('Generating draft replies...')

      // Step 3: Generate draft replies for each email
      const resultsWithDrafts: TriageResult[] = []
      
      for (let i = 0; i < triageResults.length; i++) {
        const result = triageResults[i]
        const email = emails.find(e => e.id === result.emailId)
        
        setProgress(60 + (i / triageResults.length) * 30)
        setCurrentStep(`Generating draft ${i + 1} of ${triageResults.length}...`)

        try {
          // Generate draft reply
          const draftResponse = await fetch('/api/generate-email-reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emailContent: {
                subject: email?.subject || '',
                body: email?.body_preview || email?.body_full || '',
                from: email?.from_email || '',
                fromName: email?.from_name || ''
              },
              buildingId: email?.building_id || null,
              context: result.summary
            })
          })

          const draftData = await draftResponse.json()
          const draftReply = draftResponse.ok ? (draftData.reply || draftData.draft) : 'Unable to generate draft'

          // Create enhanced triage result
          const enhancedResult: TriageResult = {
            emailId: result.emailId,
            urgency: result.urgency,
            actionRequired: result.actionRequired,
            category: result.category,
            summary: result.summary,
            draftReply,
            suggestedActions: result.suggestedActions,
            tags: result.tags,
            buildingMatch: email?.buildings?.name || null,
            estimatedResponseTime: result.estimatedResponseTime
          }

          resultsWithDrafts.push(enhancedResult)

          // Mark email as read
          await supabase
            .from('incoming_emails')
            .update({ unread: false })
            .eq('id', email?.id)

        } catch (error) {
          console.error(`Error generating draft for email ${result.emailId}:`, error)
          // Add result without draft
          resultsWithDrafts.push({
            ...result,
            draftReply: 'Unable to generate draft',
            buildingMatch: email?.buildings?.name || null
          })
        }
      }

      setProgress(90)
      setCurrentStep('Generating summary...')

      // Step 4: Generate summary
      const summary = generateTriageSummary(resultsWithDrafts, totalEmails)
      
      setProgress(100)
      setCurrentStep('Triage complete!')

      setTriageResults(resultsWithDrafts)
      setSummary(summary)
      setShowResults(true)

      toast.success(`Triage complete! Processed ${totalEmails} emails`)

    } catch (error) {
      console.error('Triage error:', error)
      toast.error('Triage failed. Please try again.')
    } finally {
      setIsTriageRunning(false)
    }
  }

  const generateTriageSummary = (results: TriageResult[], totalEmails: number): TriageSummary => {
    const urgencyCounts = { critical: 0, high: 0, medium: 0, low: 0, noAction: 0 }
    const actionCounts = { immediate: 0, today: 0, thisWeek: 0, noAction: 0, filed: 0 }
    const categories: { [key: string]: number } = {}
    const buildings: { [key: string]: number } = {}

    results.forEach(result => {
      urgencyCounts[result.urgency]++
      actionCounts[result.actionRequired]++
      
      categories[result.category] = (categories[result.category] || 0) + 1
      if (result.buildingMatch) {
        buildings[result.buildingMatch] = (buildings[result.buildingMatch] || 0) + 1
      }
    })

    const topCategories = Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }))

    const topBuildings = Object.entries(buildings)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([building, count]) => ({ building, count }))

    return {
      totalEmails,
      critical: urgencyCounts.critical,
      high: urgencyCounts.high,
      medium: urgencyCounts.medium,
      low: urgencyCounts.low,
      noAction: urgencyCounts.noAction,
      immediate: actionCounts.immediate,
      today: actionCounts.today,
      thisWeek: actionCounts.thisWeek,
      filed: actionCounts.filed,
      totalDraftsGenerated: results.length,
      averageResponseTime: '4 hours',
      topCategories,
      topBuildings
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'none': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'immediate': return 'bg-red-100 text-red-800 border-red-200'
      case 'today': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'this_week': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'no_action': return 'bg-green-100 text-green-800 border-green-200'
      case 'file': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />
      case 'high': return <Flag className="h-4 w-4" />
      case 'medium': return <Clock className="h-4 w-4" />
      case 'low': return <Info className="h-4 w-4" />
      case 'none': return <CheckCircle2 className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const filteredResults = triageResults.filter(result => {
    if (filter === 'all') return true
    return result.urgency === filter
  })

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'urgency':
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 }
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      case 'date':
        return 0 // Would need email date for proper sorting
      case 'category':
        return a.category.localeCompare(b.category)
      default:
        return 0
    }
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
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
                ⚕️ AI Inbox Triage Assistant
              </h2>
              <p className="text-sm text-gray-600 font-medium">
                Quick assessment of entire inbox with auto-generated drafts
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
        <div className="flex-1 overflow-y-auto p-6">
          {!showResults ? (
            /* Triage Setup */
            <div className="max-w-2xl mx-auto text-center">
              <div className="mb-8">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Brain className="h-12 w-12 text-white animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Ready to Triage Your Inbox?
                </h3>
                <p className="text-gray-600 mb-8">
                  The AI will quickly assess all unhandled emails, flag urgent items, 
                  generate draft replies, and provide a comprehensive summary.
                </p>
              </div>

              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-500" />
                    What the AI will do:
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Target className="h-4 w-4 text-green-500" />
                    <span>Analyze urgency and action requirements</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <PenTool className="h-4 w-4 text-blue-500" />
                    <span>Generate draft replies for all emails</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Flag className="h-4 w-4 text-orange-500" />
                    <span>Flag critical and high-priority items</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Archive className="h-4 w-4 text-gray-500" />
                    <span>Identify emails that can be filed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    <span>Provide comprehensive summary report</span>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={startTriage}
                disabled={isTriageRunning}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold px-8 py-4 text-lg"
              >
                {isTriageRunning ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Triage in Progress...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    🚑 Start AI Triage
                  </>
                )}
              </Button>

              {isTriageRunning && (
                <div className="mt-8">
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>{currentStep}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Triage Results */
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-600 font-medium">🚨 Critical</p>
                        <p className="text-2xl font-bold text-red-700">{summary?.critical || 0}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">🏥 High Priority</p>
                        <p className="text-2xl font-bold text-orange-700">{summary?.high || 0}</p>
                      </div>
                      <Flag className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">💉 Drafts Generated</p>
                        <p className="text-2xl font-bold text-blue-700">{summary?.totalDraftsGenerated || 0}</p>
                      </div>
                      <PenTool className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">🩺 No Action Needed</p>
                        <p className="text-2xl font-bold text-green-700">{summary?.noAction || 0}</p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as any)}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1"
                    >
                      <option value="all">All Results</option>
                      <option value="critical">Critical</option>
                      <option value="high">High Priority</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="no_action">No Action</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4 text-gray-500" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1"
                    >
                      <option value="urgency">By Urgency</option>
                      <option value="date">By Date</option>
                      <option value="category">By Category</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Summary
                  </Button>
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-4">
                {sortedResults.map((result) => (
                  <Card key={result.emailId} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getUrgencyIcon(result.urgency)}
                            <h4 className="font-medium text-gray-900 truncate">
                              {result.summary}
                            </h4>
                            <Badge className={getUrgencyColor(result.urgency)}>
                              {result.urgency}
                            </Badge>
                            <Badge className={getActionColor(result.actionRequired)}>
                              {result.actionRequired.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {result.buildingMatch || 'No building'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {result.estimatedResponseTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {result.category}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-3">
                            {result.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" size="sm">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {result.suggestedActions.length > 0 && (
                            <div className="text-sm text-gray-600">
                              <strong>Suggested:</strong> {result.suggestedActions.join(', ')}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(`/inbox?email=${result.emailId}`, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              // Copy draft to clipboard
                              navigator.clipboard.writeText(result.draftReply)
                              toast.success('Draft copied to clipboard')
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={async () => {
                              try {
                                // Mark as handled
                                await supabase
                                  .from('incoming_emails')
                                  .update({ is_handled: true })
                                  .eq('id', result.emailId)
                                
                                // Remove from results
                                setTriageResults(prev => prev.filter(r => r.emailId !== result.emailId))
                                toast.success('Email marked as handled')
                              } catch (error) {
                                toast.error('Failed to mark as handled')
                              }
                            }}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {sortedResults.length === 0 && (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-900 mb-2">No results match the filter</h4>
                  <p className="text-gray-600 text-sm">
                    Try adjusting the filter criteria
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {showResults && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Triage completed • {summary?.totalEmails || 0} emails processed • {summary?.totalDraftsGenerated || 0} drafts generated
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowResults(false)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  New Triage
                </Button>
                <Button onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 