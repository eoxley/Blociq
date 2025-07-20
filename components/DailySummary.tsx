'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, RefreshCw, Loader2 } from 'lucide-react'

interface DailySummaryProps {
  className?: string;
}

export default function DailySummary({ className = "" }: DailySummaryProps) {
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const response = await fetch('/api/daily-summary')
      
      if (!response.ok) {
        throw new Error('Failed to fetch summary')
      }

      const data = await response.json()
      setSummary(data.summary || 'No summary available at the moment.')
    } catch (err) {
      console.error('Error fetching daily summary:', err)
      setError('Unable to load summary. Please try again.')
      setSummary('Good morning! I\'m having trouble generating your summary right now, but you can check your tasks and emails manually. Have a productive day! 🌅')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  const handleRefresh = () => {
    fetchSummary(true)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-teal-600" />
            🧠 Daily Summary
          </CardTitle>
          <Button 
            onClick={handleRefresh}
            disabled={refreshing || loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            🔁 Refresh Summary
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-600" />
            <p className="text-gray-600">Generating your daily summary...</p>
            <p className="text-sm text-gray-500 mt-1">Analyzing tasks, emails, and compliance alerts</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">
              <Brain className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">{error}</p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <div 
                className="text-gray-700 leading-relaxed whitespace-pre-line"
                dangerouslySetInnerHTML={{ 
                  __html: summary.replace(/\n/g, '<br>') 
                }}
              />
            </div>
            
            {summary && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  💡 This summary is generated using AI based on your current tasks, unread emails, and compliance alerts.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 