'use client'

import React, { useState, useEffect } from 'react'
import { Brain, Loader2, Calendar, User, MessageSquare, FileText, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface AIHistoryPanelProps {
  buildingId: string
  buildingName: string
  className?: string
}

interface AILog {
  id: string
  user_id: string
  question: string
  response: string
  context_type: string
  building_id: string
  document_ids: string[]
  leaseholder_id?: string
  email_thread_id?: string
  created_at: string
  user_name?: string
}

export default function AIHistoryPanel({ 
  buildingId, 
  buildingName, 
  className = '' 
}: AIHistoryPanelProps) {
  const [aiLogs, setAiLogs] = useState<AILog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AILog | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const fetchAIHistory = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/ai-history?building_id=${buildingId}`)
      if (response.ok) {
        const data = await response.json()
        setAiLogs(data.logs || [])
      } else {
        toast.error('Failed to fetch AI history')
      }
    } catch (error) {
      console.error('Error fetching AI history:', error)
      toast.error('Error fetching AI history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAIHistory()
  }, [buildingId])

  const getContextTypeIcon = (contextType: string) => {
    switch (contextType) {
      case 'document':
        return <FileText className="h-4 w-4" />
      case 'compliance':
        return <AlertTriangle className="h-4 w-4" />
      case 'todo':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  const getContextTypeColor = (contextType: string) => {
    switch (contextType) {
      case 'document':
        return 'bg-blue-100 text-blue-800'
      case 'compliance':
        return 'bg-red-100 text-red-800'
      case 'todo':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleViewDetail = (log: AILog) => {
    setSelectedLog(log)
    setShowDetailModal(true)
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className={`p-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">BlocIQ AI History</h3>
              <p className="text-sm text-gray-600">{buildingName}</p>
            </div>
          </div>
          <Button
            onClick={fetchAIHistory}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {/* AI Logs List */}
        {aiLogs.length > 0 ? (
          <div className="space-y-4">
            {aiLogs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleViewDetail(log)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getContextTypeIcon(log.context_type)}
                    <Badge className={getContextTypeColor(log.context_type)}>
                      {log.context_type}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    {log.user_name || 'Unknown user'}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Question:</h4>
                    <p className="text-sm text-gray-700">
                      {truncateText(log.question)}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Response:</h4>
                    <p className="text-sm text-gray-700">
                      {truncateText(log.response)}
                    </p>
                  </div>
                </div>

                {/* Context indicators */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  {log.document_ids && log.document_ids.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      📄 {log.document_ids.length} docs
                    </Badge>
                  )}
                  {log.leaseholder_id && (
                    <Badge variant="outline" className="text-xs">
                      👤 Leaseholder
                    </Badge>
                  )}
                  {log.email_thread_id && (
                    <Badge variant="outline" className="text-xs">
                      📧 Email thread
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No AI history yet</h3>
            <p className="text-gray-500">
              AI interactions for this building will appear here
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t text-xs text-gray-500 mt-6">
          <span>Powered by BlocIQ AI</span>
          <span>{aiLogs.length} interactions</span>
        </div>
      </Card>

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">AI Interaction Details</h3>
                <Badge className={getContextTypeColor(selectedLog.context_type)}>
                  {selectedLog.context_type}
                </Badge>
              </div>
              <Button
                onClick={() => setShowDetailModal(false)}
                variant="ghost"
                size="sm"
                className="p-1"
              >
                ×
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Date:</span> {formatDate(selectedLog.created_at)}
                  </div>
                  <div>
                    <span className="font-medium">User:</span> {selectedLog.user_name || 'Unknown'}
                  </div>
                  <div>
                    <span className="font-medium">Building ID:</span> {selectedLog.building_id}
                  </div>
                  <div>
                    <span className="font-medium">Log ID:</span> {selectedLog.id}
                  </div>
                </div>

                {/* Question */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Question:</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-800">{selectedLog.question}</p>
                  </div>
                </div>

                {/* Response */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">AI Response:</h4>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {selectedLog.response}
                    </p>
                  </div>
                </div>

                {/* Context */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Context Used:</h4>
                  <div className="space-y-2">
                    {selectedLog.document_ids && selectedLog.document_ids.length > 0 && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Documents: {selectedLog.document_ids.join(', ')}</span>
                      </div>
                    )}
                    {selectedLog.leaseholder_id && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Leaseholder ID: {selectedLog.leaseholder_id}</span>
                      </div>
                    )}
                    {selectedLog.email_thread_id && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-purple-600" />
                        <span className="text-sm">Email Thread ID: {selectedLog.email_thread_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="text-xs text-gray-500">
                AI Log ID: {selectedLog.id}
              </div>
              <Button
                onClick={() => setShowDetailModal(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
} 