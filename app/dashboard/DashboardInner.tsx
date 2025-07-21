'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Mail, 
  FileText, 
  Users, 
  Settings, 
  Plus,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Calendar,
  MessageCircle,
  TrendingUp
} from 'lucide-react'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { toast } from 'sonner'

interface DashboardStats {
  totalBuildings: number
  totalEmails: number
  totalDocuments: number
  totalUsers: number
}

interface OutlookConnection {
  connected: boolean
  email: string | null
}

export default function DashboardInner() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [outlookConnection, setOutlookConnection] = useState<OutlookConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetchDashboardData()
    fetchOutlookStatus()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOutlookStatus = async () => {
    try {
      const response = await fetch('/api/outlook/connect')
      if (response.ok) {
        const data = await response.json()
        setOutlookConnection(data)
      }
    } catch (error) {
      console.error('Error fetching Outlook status:', error)
    }
  }

  const connectOutlook = async () => {
    setConnecting(true)
    try {
      const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID
      const redirectUri = process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI
      
      if (!clientId || !redirectUri) {
        throw new Error('Microsoft OAuth configuration missing')
      }

      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read')}&` +
        `response_mode=query`

      window.location.href = authUrl
    } catch (error) {
      console.error('Error connecting Outlook:', error)
      toast.error('Failed to connect Outlook')
    } finally {
      setConnecting(false)
    }
  }

  const disconnectOutlook = async () => {
    setDisconnecting(true)
    try {
      const response = await fetch('/api/outlook/disconnect', {
        method: 'POST'
      })
      
      if (response.ok) {
        setOutlookConnection({ connected: false, email: null })
        toast.success('Outlook disconnected successfully')
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Error disconnecting Outlook:', error)
      toast.error('Failed to disconnect Outlook')
    } finally {
      setDisconnecting(false)
    }
  }

  const refreshOutlookStatus = () => {
    fetchOutlookStatus()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2BBEB4]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#2BBEB4] to-[#0F5D5D] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Welcome to BlocIQ</h1>
            <p className="text-xl text-white/90">Your property management dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <BlocIQButton 
              variant="secondary"
              onClick={() => router.push('/inbox')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Mail className="h-4 w-4 mr-2" />
              View Inbox
            </BlocIQButton>
            <BlocIQButton 
              variant="secondary"
              onClick={() => router.push('/buildings')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Manage Buildings
            </BlocIQButton>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BlocIQCard variant="elevated" className="hover:scale-105 transition-transform duration-300">
          <BlocIQCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-[#64748B]">Total Buildings</h3>
            <div className="w-8 h-8 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
          </BlocIQCardHeader>
          <BlocIQCardContent>
            <div className="text-3xl font-bold text-[#333333]">{stats?.totalBuildings || 0}</div>
            <p className="text-xs text-[#64748B] mt-1">Active properties</p>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard variant="elevated" className="hover:scale-105 transition-transform duration-300">
          <BlocIQCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-[#64748B]">Total Emails</h3>
            <div className="w-8 h-8 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-lg flex items-center justify-center">
              <Mail className="h-4 w-4 text-white" />
            </div>
          </BlocIQCardHeader>
          <BlocIQCardContent>
            <div className="text-3xl font-bold text-[#333333]">{stats?.totalEmails || 0}</div>
            <p className="text-xs text-[#64748B] mt-1">Messages processed</p>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard variant="elevated" className="hover:scale-105 transition-transform duration-300">
          <BlocIQCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-[#64748B]">Total Documents</h3>
            <div className="w-8 h-8 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-lg flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
          </BlocIQCardHeader>
          <BlocIQCardContent>
            <div className="text-3xl font-bold text-[#333333]">{stats?.totalDocuments || 0}</div>
            <p className="text-xs text-[#64748B] mt-1">Files uploaded</p>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard variant="elevated" className="hover:scale-105 transition-transform duration-300">
          <BlocIQCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-[#64748B]">Total Users</h3>
            <div className="w-8 h-8 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
          </BlocIQCardHeader>
          <BlocIQCardContent>
            <div className="text-3xl font-bold text-[#333333]">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-[#64748B] mt-1">Active users</p>
          </BlocIQCardContent>
        </BlocIQCard>
      </div>

      {/* Outlook Connection Status */}
      <BlocIQCard variant="elevated">
        <BlocIQCardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#333333] flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#2BBEB4]" />
              Outlook Integration
            </h2>
            <BlocIQButton
              variant="ghost"
              size="sm"
              onClick={refreshOutlookStatus}
              disabled={connecting || disconnecting}
            >
              <RefreshCw className="h-4 w-4" />
            </BlocIQButton>
          </div>
        </BlocIQCardHeader>
        <BlocIQCardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {outlookConnection?.connected ? (
                <>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#333333]">Connected</div>
                    <div className="text-sm text-[#64748B]">
                      {outlookConnection.email}
                    </div>
                  </div>
                  <BlocIQBadge variant="success">Active</BlocIQBadge>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-[#F3F4F6] rounded-xl flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-[#64748B]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#333333]">Not Connected</div>
                    <div className="text-sm text-[#64748B]">
                      Connect your Outlook account to sync emails
                    </div>
                  </div>
                  <BlocIQBadge variant="default">Inactive</BlocIQBadge>
                </>
              )}
            </div>
            
            <div className="flex gap-3">
              {outlookConnection?.connected ? (
                <>
                  <BlocIQButton
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/inbox')}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    View Inbox
                  </BlocIQButton>
                  <BlocIQButton
                    variant="destructive"
                    size="sm"
                    onClick={disconnectOutlook}
                    disabled={disconnecting}
                  >
                    {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </BlocIQButton>
                </>
              ) : (
                <BlocIQButton
                  onClick={connectOutlook}
                  disabled={connecting}
                  className="flex items-center gap-2"
                >
                  {connecting ? 'Connecting...' : (
                    <>
                      <ExternalLink className="h-4 w-4" />
                      Connect Outlook
                    </>
                  )}
                </BlocIQButton>
              )}
            </div>
          </div>
        </BlocIQCardContent>
      </BlocIQCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BlocIQCard variant="outlined" className="hover:shadow-lg transition-shadow duration-300 cursor-pointer" onClick={() => router.push('/communications')}>
          <BlocIQCardContent className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[#333333] mb-2">Communications</h3>
            <p className="text-sm text-[#64748B]">Send letters and emails to residents</p>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard variant="outlined" className="hover:shadow-lg transition-shadow duration-300 cursor-pointer" onClick={() => router.push('/compliance')}>
          <BlocIQCardContent className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[#333333] mb-2">Compliance</h3>
            <p className="text-sm text-[#64748B]">Track building compliance and safety</p>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard variant="outlined" className="hover:shadow-lg transition-shadow duration-300 cursor-pointer" onClick={() => router.push('/major-works')}>
          <BlocIQCardContent className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[#333333] mb-2">Major Works</h3>
            <p className="text-sm text-[#64748B]">Manage major works projects</p>
          </BlocIQCardContent>
        </BlocIQCard>
      </div>
    </div>
  )
} 