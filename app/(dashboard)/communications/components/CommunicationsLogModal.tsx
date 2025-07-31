'use client'

import React, { useState, useEffect } from 'react'
import { History, Eye, Mail, FileText, Phone, Calendar } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface CommunicationLog {
  id: string
  to_email: string
  subject: string
  message: string
  sent_at: string
  status: string
  building_name?: string
}

interface CommunicationsLogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CommunicationsLogModal({
  open,
  onOpenChange
}: CommunicationsLogModalProps) {
  const [communications, setCommunications] = useState<CommunicationLog[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')

  useEffect(() => {
    if (open) {
      fetchCommunications()
    }
  }, [open])

  const fetchCommunications = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('communications_sent')
        .select(`
          id,
          to_email,
          subject,
          message,
          sent_at,
          status,
          buildings (name)
        `)
        .order('sent_at', { ascending: false })

      if (error) throw error

      const formattedCommunications = data?.map(item => ({
        id: item.id,
        to_email: item.to_email,
        subject: item.subject,
        message: item.message || '',
        sent_at: item.sent_at,
        status: item.status,
        building_name: item.buildings?.name || ''
      })) || []

      setCommunications(formattedCommunications)
    } catch (error) {
      console.error('Error fetching communications:', error)
      toast.error('Failed to fetch communications log')
    } finally {
      setLoading(false)
    }
  }

  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = 
      comm.to_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.building_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || comm.status === statusFilter
    
    const matchesDate = dateFilter === 'all' || 
      (dateFilter === 'today' && new Date(comm.sent_at).toDateString() === new Date().toDateString()) ||
      (dateFilter === 'week' && new Date(comm.sent_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === 'month' && new Date(comm.sent_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (subject: string) => {
    const lowerSubject = subject.toLowerCase()
    if (lowerSubject.includes('call') || lowerSubject.includes('phone')) {
      return Phone
    } else if (lowerSubject.includes('letter') || lowerSubject.includes('document')) {
      return FileText
    } else {
      return Mail
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Communications Log
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by recipient, subject, or building..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <Label htmlFor="date-filter">Date Range</Label>
              <select
                id="date-filter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>

          {/* Communications List */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading communications...</p>
              </div>
            ) : filteredCommunications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No communications found</p>
              </div>
            ) : (
              filteredCommunications.map((comm) => {
                const TypeIcon = getTypeIcon(comm.subject)
                return (
                  <Card key={comm.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <TypeIcon className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{comm.to_email}</span>
                            <Badge className={getStatusColor(comm.status)}>
                              {comm.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{comm.subject}</p>
                          {comm.building_name && (
                            <p className="text-sm text-gray-500 mt-1">{comm.building_name}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {new Date(comm.sent_at).toLocaleDateString()} at {new Date(comm.sent_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Summary */}
          {filteredCommunications.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Showing {filteredCommunications.length} of {communications.length} communications
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 