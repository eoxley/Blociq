'use client'

import React, { useState, useEffect } from 'react'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQButton } from '@/components/ui/blociq-button'
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
    <BlocIQCard variant="elevated" className={`overflow-hidden ${className}`}>
      {/* Enhanced Header with BlocIQ Gradient Background */}
      <BlocIQCardHeader className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">AI Daily Summary</h2>
              <p className="text-white/80 text-sm">Your personalized property management insights</p>
            </div>
          </div>
          <BlocIQButton 
            onClick={handleRefresh}
            disabled={refreshing || loading}
            variant="outline"
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </BlocIQButton>
        </div>
      </BlocIQCardHeader>

      <BlocIQCardContent className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[#7645ED] to-[#2BBEB4] rounded-full flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-[#333333] mb-2">Generating Your Summary</h3>
            <p className="text-[#64748B] mb-1">Gathering your property portfolio data...</p>
            <p className="text-sm text-[#64748B]">Checking events, emails, and compliance alerts</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-[#EF4444] to-red-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-[#333333] mb-2">Summary Unavailable</h3>
            <p className="text-[#64748B] mb-6">{error}</p>
            <BlocIQButton onClick={handleRefresh} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </BlocIQButton>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Content */}
            <div className="bg-[#FAFAFA] rounded-xl p-6 shadow-sm border border-[#E2E8F0]">
              <div className="text-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-[#333333] mb-2">Today's Overview</h3>
                <div 
                  className="text-[#333333] leading-relaxed prose prose-sm max-w-none text-center"
                  dangerouslySetInnerHTML={{ 
                    __html: summary.replace(/\n/g, '<br>') 
                  }}
                />
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-[#F0FDFA] to-green-100 rounded-xl p-4 border border-[#2BBEB4]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[#0F5D5D]">Ready</div>
                    <div className="text-xs text-[#0F5D5D]">All systems operational</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-[#2078F4]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#2078F4] to-blue-600 rounded-lg flex items-center justify-center">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[#2078F4]">Updated</div>
                    <div className="text-xs text-[#2078F4]">Just now</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-[#7645ED]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#7645ED] to-purple-600 rounded-lg flex items-center justify-center">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[#7645ED]">AI Powered</div>
                    <div className="text-xs text-[#7645ED]">Smart insights</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer Note */}
            {summary && (
              <div className="pt-4 border-t border-[#E2E8F0]">
                <div className="flex items-center gap-2 text-xs text-[#64748B]">
                  <Sparkles className="h-3 w-3 text-[#008C8F]" />
                  <span>This summary is generated using AI based on your current tasks, unread emails, and compliance alerts.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </BlocIQCardContent>
    </BlocIQCard>
  )
} 