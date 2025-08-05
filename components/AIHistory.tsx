'use client'

import React, { useState, useEffect } from 'react'
import { Search, Calendar, User, Building, FileText, Brain, Filter, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface AIHistoryEntry {
  id: string
  user_id: string
  question: string
  response: string
  timestamp: string
  building_id?: string
  building_name?: string
  document_search: boolean
  documents_found: number
  context_type?: string
  files_uploaded?: number
}

interface AIHistoryProps {
  buildingId?: string
  className?: string
}

export default function AIHistory({ buildingId, className = '' }: AIHistoryProps) {
  const [history, setHistory] = useState<AIHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)

  const itemsPerPage = 10

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUserId(session?.user?.id ?? null)
    }
    getSession()
  }, [])

  useEffect(() => {
    if (userId) {
      fetchHistory()
    }
  }, [userId, buildingId, searchTerm, filterType, filterDate, currentPage])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('ai_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })

      // Apply building filter
      if (buildingId) {
        query = query.eq('building_id', buildingId)
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`question.ilike.%${searchTerm}%,response.ilike.%${searchTerm}%`)
      }

      // Apply type filter
      if (filterType !== 'all') {
        switch (filterType) {
          case 'document_search':
            query = query.eq('document_search', true)
            break
          case 'file_upload':
            query = query.gt('files_uploaded', 0)
            break
          case 'building_context':
            query = query.not('building_id', 'is', null)
            break
        }
      }

      // Apply date filter
      if (filterDate !== 'all') {
        const now = new Date()
        let startDate: Date
        
        switch (filterDate) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
          default:
            startDate = new Date(0)
        }
        
        query = query.gte('timestamp', startDate.toISOString())
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching AI history:', error)
        toast.error('Failed to load AI history')
        return
      }

      setHistory(data || [])
      
      if (count) {
        setTotalPages(Math.ceil(count / itemsPerPage))
      }
    } catch (error) {
      console.error('Error in fetchHistory:', error)
      toast.error('Failed to load AI history')
    } finally {
      setLoading(false)
    }
  }

  const exportHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })

      if (error) throw error

      const csvContent = [
        ['Date', 'Question', 'Response', 'Building', 'Document Search', 'Files Uploaded'],
        ...(data || []).map(entry => [
          new Date(entry.timestamp).toLocaleString(),
          entry.question,
          entry.response.substring(0, 100) + '...',
          entry.building_name || 'N/A',
          entry.document_search ? 'Yes' : 'No',
          entry.files_uploaded || 0
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-history-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('AI history exported successfully')
    } catch (error) {
      console.error('Error exporting history:', error)
      toast.error('Failed to export history')
    }
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getContextBadges = (entry: AIHistoryEntry) => {
    const badges = []
    
    if (entry.building_name) {
      badges.push(
        <Badge key="building" variant="outline" className="text-blue-600">
          <Building className="h-3 w-3 mr-1" />
          {entry.building_name}
        </Badge>
      )
    }
    
    if (entry.document_search) {
      badges.push(
        <Badge key="documents" variant="outline" className="text-green-600">
          <FileText className="h-3 w-3 mr-1" />
          {entry.documents_found} docs
        </Badge>
      )
    }
    
    if (entry.files_uploaded && entry.files_uploaded > 0) {
      badges.push(
        <Badge key="files" variant="outline" className="text-purple-600">
          📎 {entry.files_uploaded} files
        </Badge>
      )
    }
    
    return badges
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Interaction History</h2>
          <p className="text-gray-600">Search and review your past conversations with BlocIQ</p>
        </div>
        <Button onClick={exportHistory} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search questions or responses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All interactions</SelectItem>
                <SelectItem value="document_search">Document searches</SelectItem>
                <SelectItem value="file_upload">File uploads</SelectItem>
                <SelectItem value="building_context">Building context</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={filterDate} onValueChange={setFilterDate}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button
              onClick={() => {
                setSearchTerm('')
                setFilterType('all')
                setFilterDate('all')
                setCurrentPage(1)
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading AI history...</p>
          </div>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No AI interactions found</h3>
              <p className="text-gray-600">
                {searchTerm || filterType !== 'all' || filterDate !== 'all'
                  ? 'Try adjusting your search criteria'
                  : 'Start asking BlocIQ questions to see your history here'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {history.length} interaction{history.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </p>
            </div>

            {/* History Items */}
            <div className="space-y-4">
              {history.map((entry) => (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-600" />
                        <span className="text-sm text-gray-500">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getContextBadges(entry)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Question */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Question:</h4>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                          {entry.question}
                        </p>
                      </div>

                      {/* Response */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Response:</h4>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-gray-800 whitespace-pre-wrap">
                            {entry.response.length > 300
                              ? `${entry.response.substring(0, 300)}...`
                              : entry.response
                            }
                          </p>
                          {entry.response.length > 300 && (
                            <button className="text-blue-600 text-sm mt-2 hover:underline">
                              Show full response
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 