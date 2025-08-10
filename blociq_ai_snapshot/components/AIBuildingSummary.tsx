'use client'

import React, { useState, useEffect } from 'react'
import { Brain, Loader2, RefreshCw, Building, AlertTriangle, FileText, MessageSquare } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface AIBuildingSummaryProps {
  buildingId: string
  buildingName: string
  className?: string
}

interface BuildingSummary {
  unitCount: number
  openComplianceIssues: number
  keyDocuments: string[]
  commonQueries: string[]
  operationalStatus: string
  lastUpdated: string
}

interface AIResponse {
  success: boolean
  result: string
  ai_log_id: string
  context_type: string
  building_id?: string
}

export default function AIBuildingSummary({ 
  buildingId, 
  buildingName, 
  className = '' 
}: AIBuildingSummaryProps) {
  const [summary, setSummary] = useState<BuildingSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const generateSummary = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Summarise the current operational status of ${buildingName}. Include unit count, overdue compliance, key upcoming tasks, and document coverage. Provide a concise but comprehensive overview.`,
          contextType: 'building_summary',
          buildingId,
        }),
      })

      const data: AIResponse = await response.json()

      if (data.success) {
        // Parse the AI response to extract structured data
        const parsedSummary = parseSummaryResponse(data.result)
        setSummary(parsedSummary)
        setLastRefreshed(new Date())
        toast.success('Building summary updated!')
      } else {
        toast.error('Failed to generate summary')
      }
    } catch (error) {
      console.error('Error generating summary:', error)
      toast.error('Error generating summary')
    } finally {
      setIsLoading(false)
    }
  }

  const parseSummaryResponse = (response: string): BuildingSummary => {
    // This is a simplified parser - in a real implementation, you might want
    // to structure the AI response more predictably or use a different approach
    const lines = response.split('\n')
    
    // Extract unit count (look for patterns like "X units" or "unit count: X")
    const unitCountMatch = response.match(/(\d+)\s*units?/i)
    const unitCount = unitCountMatch ? parseInt(unitCountMatch[1]) : 0

    // Extract compliance issues (look for patterns like "X overdue" or "X issues")
    const complianceMatch = response.match(/(\d+)\s*(?:overdue|issues?|compliance)/i)
    const openComplianceIssues = complianceMatch ? parseInt(complianceMatch[1]) : 0

    // Extract key documents (look for document types mentioned)
    const documentTypes = ['fire safety', 'electrical', 'gas', 'asbestos', 'insurance', 'lift', 'legionella']
    const keyDocuments = documentTypes.filter(type => 
      response.toLowerCase().includes(type)
    )

    // Extract common queries (this would typically come from ai_logs)
    const commonQueries = [
      'Service charge explanation',
      'Maintenance updates',
      'Compliance status'
    ]

    return {
      unitCount,
      openComplianceIssues,
      keyDocuments,
      commonQueries,
      operationalStatus: response,
      lastUpdated: new Date().toISOString()
    }
  }

  useEffect(() => {
    generateSummary()
  }, [buildingId])

  if (!summary) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Building Summary</h3>
            <p className="text-sm text-gray-600">{buildingName}</p>
          </div>
        </div>
        <Button
          onClick={generateSummary}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <Building className="h-6 w-6 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600">{summary.unitCount}</div>
          <div className="text-xs text-gray-600">Units</div>
        </div>
        
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-600">{summary.openComplianceIssues}</div>
          <div className="text-xs text-gray-600">Compliance Issues</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <FileText className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600">{summary.keyDocuments.length}</div>
          <div className="text-xs text-gray-600">Key Documents</div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <MessageSquare className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-600">{summary.commonQueries.length}</div>
          <div className="text-xs text-gray-600">Common Queries</div>
        </div>
      </div>

      {/* Operational Status */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Operational Status</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {summary.operationalStatus}
          </p>
        </div>
      </div>

      {/* Key Documents */}
      {summary.keyDocuments.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Key Documents</h4>
          <div className="flex flex-wrap gap-2">
            {summary.keyDocuments.map((doc, index) => (
              <Badge key={index} variant="outline" className="capitalize">
                {doc}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Common Queries */}
      {summary.commonQueries.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-3">Common Queries</h4>
          <div className="space-y-2">
            {summary.commonQueries.map((query, index) => (
              <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                "{query}"
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t text-xs text-gray-500">
        <span>Powered by BlocIQ AI</span>
        {lastRefreshed && (
          <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
        )}
      </div>
    </Card>
  )
} 