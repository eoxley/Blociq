'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Mail, FileText, AlertTriangle, Calendar, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { BlocIQCard, BlocIQCardContent } from '@/components/ui/blociq-card'

interface DailyOverviewProps {
  className?: string
}

interface OverviewTile {
  id: string
  title: string
  count: number
  icon: React.ReactNode
  link?: string
  loading: boolean
  error?: string
}

export default function DailyOverview({ className = "" }: DailyOverviewProps) {
  const [tiles, setTiles] = useState<OverviewTile[]>([
    {
      id: 'new-messages',
      title: 'New Messages',
      count: 0,
      icon: <Mail className="h-6 w-6" />,
      link: '/inbox',
      loading: true
    },
    {
      id: 'recent-documents',
      title: 'Recent Documents',
      count: 0,
      icon: <FileText className="h-6 w-6" />,
      link: '/documents',
      loading: true
    },
    {
      id: 'overdue-compliance',
      title: 'Overdue Compliance',
      count: 0,
      icon: <AlertTriangle className="h-6 w-6" />,
      link: '/compliance',
      loading: true
    },
    {
      id: 'tasks-due-today',
      title: 'Tasks Due Today',
      count: 0,
      icon: <Calendar className="h-6 w-6" />,
      link: '/buildings',
      loading: true
    }
  ])

  const fetchNewMessages = async () => {
    try {
      const { count, error } = await supabase
        .from('incoming_emails')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)

      if (error) throw error

      setTiles(prev => prev.map(tile => 
        tile.id === 'new-messages' 
          ? { ...tile, count: count || 0, loading: false }
          : tile
      ))
    } catch (error) {
      console.error('Error fetching new messages:', error)
      setTiles(prev => prev.map(tile => 
        tile.id === 'new-messages' 
          ? { ...tile, error: 'Failed to load', loading: false }
          : tile
      ))
    }
  }

  const fetchRecentDocuments = async () => {
    try {
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      const { count, error } = await supabase
        .from('building_documents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoDaysAgo.toISOString())

      if (error) throw error

      setTiles(prev => prev.map(tile => 
        tile.id === 'recent-documents' 
          ? { ...tile, count: count || 0, loading: false }
          : tile
      ))
    } catch (error) {
      console.error('Error fetching recent documents:', error)
      setTiles(prev => prev.map(tile => 
        tile.id === 'recent-documents' 
          ? { ...tile, error: 'Failed to load', loading: false }
          : tile
      ))
    }
  }

  const fetchOverdueCompliance = async () => {
    try {
      const { count, error } = await supabase
        .from('building_compliance_assets')
        .select('*', { count: 'exact', head: true })
        .or('status.eq.overdue,next_due_date.lt.now()')

      if (error) throw error

      setTiles(prev => prev.map(tile => 
        tile.id === 'overdue-compliance' 
          ? { ...tile, count: count || 0, loading: false }
          : tile
      ))
    } catch (error) {
      console.error('Error fetching overdue compliance:', error)
      setTiles(prev => prev.map(tile => 
        tile.id === 'overdue-compliance' 
          ? { ...tile, error: 'Failed to load', loading: false }
          : tile
      ))
    }
  }

  const fetchTasksDueToday = async () => {
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      const { count, error } = await supabase
        .from('building_todos')
        .select('*', { count: 'exact', head: true })
        .gte('due_date', startOfDay.toISOString())
        .lt('due_date', endOfDay.toISOString())
        .eq('is_complete', false)

      if (error) throw error

      setTiles(prev => prev.map(tile => 
        tile.id === 'tasks-due-today' 
          ? { ...tile, count: count || 0, loading: false }
          : tile
      ))
    } catch (error) {
      console.error('Error fetching tasks due today:', error)
      setTiles(prev => prev.map(tile => 
        tile.id === 'tasks-due-today' 
          ? { ...tile, error: 'Failed to load', loading: false }
          : tile
      ))
    }
  }

  useEffect(() => {
    // Fetch all data in parallel
    fetchNewMessages()
    fetchRecentDocuments()
    fetchOverdueCompliance()
    fetchTasksDueToday()
  }, [])

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Daily Overview</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiles.map((tile) => (
          <BlocIQCard key={tile.id} className="hover:shadow-lg transition-shadow">
            <BlocIQCardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center text-white">
                    {tile.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{tile.title}</h3>
                    {tile.loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        <span className="text-sm text-gray-500">Loading...</span>
                      </div>
                    ) : tile.error ? (
                      <span className="text-sm text-red-500">{tile.error}</span>
                    ) : (
                      <span className="text-2xl font-bold text-gray-900">{tile.count}</span>
                    )}
                  </div>
                </div>
                {tile.link && !tile.loading && !tile.error && (
                  <Link 
                    href={tile.link}
                    className="text-[#008C8F] hover:text-[#7645ED] transition-colors"
                  >
                    View →
                  </Link>
                )}
              </div>
            </BlocIQCardContent>
          </BlocIQCard>
        ))}
      </div>
    </div>
  )
} 