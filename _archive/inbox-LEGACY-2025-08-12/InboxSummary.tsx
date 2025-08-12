'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/lib/database.types'
import { Mail, Flag, Eye, Tag } from 'lucide-react'

type IncomingEmail = Database['public']['Tables']['incoming_emails']['Row']

interface InboxSummaryStats {
  total: number
  unread: number
  flagged: number
  categories: Record<string, number>
}

export default function InboxSummary() {
  const [summary, setSummary] = useState<InboxSummaryStats>({
    total: 0,
    unread: 0,
    flagged: 0,
    categories: {}
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('incoming_emails')
        .select('unread, flag_status, categories')

      if (error) {
        console.error('Error fetching inbox summary:', error)
        setError('Failed to load inbox summary')
        return
      }

      const emails = data || []
      const stats: InboxSummaryStats = {
        total: emails.length,
        unread: emails.filter(e => e.unread).length,
        flagged: emails.filter(e => e.flag_status === 'flagged').length,
        categories: {}
      }

      // Count categories
      for (const email of emails) {
        if (email.categories && Array.isArray(email.categories)) {
          for (const category of email.categories) {
            stats.categories[category] = (stats.categories[category] || 0) + 1
          }
        }
      }

      setSummary(stats)
    } catch (err) {
      console.error('Error in loadSummary:', err)
      setError('Failed to load inbox summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()

    // Set up real-time subscription for inbox updates
    const channel = supabase
      .channel('inbox_summary_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incoming_emails'
        },
        () => {
          // Reload summary when emails change
          loadSummary()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Urgent': 'bg-red-100 text-red-800',
      'Compliance': 'bg-blue-100 text-blue-800',
      'Leaseholder': 'bg-green-100 text-green-800',
      'Maintenance': 'bg-orange-100 text-orange-800',
      'Service Charge': 'bg-purple-100 text-purple-800',
      'Emergency': 'bg-red-100 text-red-800',
      'Reminder': 'bg-yellow-100 text-yellow-800',
      'Update': 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-4 w-full">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow p-4 w-full">
        <div className="text-red-600 text-sm">
          <p>❌ {error}</p>
          <button 
            onClick={loadSummary}
            className="mt-2 text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 w-full">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">📥 Inbox Summary</h2>
      </div>
      
      {/* Main Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{summary.unread}</div>
          <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
            <Eye className="h-3 w-3" />
            Unread
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{summary.flagged}</div>
          <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
            <Flag className="h-3 w-3" />
            Flagged
          </div>
        </div>
      </div>

      {/* Categories */}
      {Object.keys(summary.categories).length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-gray-600" />
            <strong className="text-sm text-gray-700">Categories:</strong>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.categories)
              .sort(([,a], [,b]) => b - a) // Sort by count descending
              .map(([category, count]) => (
                <div
                  key={category}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}
                  title={`${count} email${count !== 1 ? 's' : ''}`}
                >
                  {category}: {count}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {summary.total === 0 && (
        <div className="text-center py-4 text-gray-500">
          <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No emails in inbox</p>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={loadSummary}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Refresh summary
        </button>
      </div>
    </div>
  )
} 