'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, RefreshCw, Loader2, Sparkles, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react'

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
    <Card className={`border-0 shadow-2xl bg-gradient-to-br from-white via-blue-50 to-indigo-50 overflow-hidden ${className}`}>
      {/* Enhanced Header with Gradient Background */}
      <div className="relative bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 p-6 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
        <div className="absolute top-4 right-4">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Daily Summary</h2>
                <p className="text-teal-100 text-sm">Your personalized property management insights</p>
              </div>
            </div>
            <Button 
              onClick={handleRefresh}
              disabled={refreshing || loading}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm shadow-lg"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-4 left-1/4 w-20 h-20 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-4 right-1/4 w-16 h-16 bg-white/5 rounded-full"></div>
      </div>

      <CardContent className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Generating Your Summary</h3>
            <p className="text-gray-600 mb-1">Analyzing your property portfolio...</p>
            <p className="text-sm text-gray-500">Checking tasks, emails, and compliance alerts</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Summary Unavailable</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={handleRefresh} className="bg-teal-600 hover:bg-teal-700 text-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Content */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="text-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Today's Overview</h3>
                <div 
                  className="text-gray-700 leading-relaxed prose prose-sm max-w-none text-center"
                  dangerouslySetInnerHTML={{ 
                    __html: summary.replace(/\n/g, '<br>') 
                  }}
                />
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-700">Ready</div>
                    <div className="text-xs text-green-600">All systems operational</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-700">Updated</div>
                    <div className="text-xs text-blue-600">Just now</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-700">AI Powered</div>
                    <div className="text-xs text-purple-600">Smart insights</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer Note */}
            {summary && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Sparkles className="h-3 w-3 text-teal-500" />
                  <span>This summary is generated using AI based on your current tasks, unread emails, and compliance alerts.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 