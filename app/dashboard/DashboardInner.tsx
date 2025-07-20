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
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
      const response = await fetch('/api/outlook/connect', {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Outlook disconnected successfully')
        fetchOutlookStatus()
      } else {
        throw new Error('Failed to disconnect Outlook')
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
    toast.success('Outlook status refreshed')
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Buildings</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBuildings || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEmails || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDocuments || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Outlook Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Outlook Integration
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshOutlookStatus}
              disabled={connecting || disconnecting}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {outlookConnection?.connected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium text-green-600">Connected</div>
                    <div className="text-sm text-gray-500">
                      {outlookConnection.email}
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-600">Not Connected</div>
                    <div className="text-sm text-gray-500">
                      Connect your Outlook account to sync emails
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                    Inactive
                  </Badge>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              {outlookConnection?.connected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/dashboard/inbox')}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    View Inbox
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={disconnectOutlook}
                    disabled={disconnecting}
                    className="flex items-center gap-2"
                  >
                    {disconnecting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  onClick={connectOutlook}
                  disabled={connecting}
                  className="flex items-center gap-2"
                >
                  {connecting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Connect Outlook
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Buildings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => router.push('/buildings')}
              className="w-full"
            >
              View All Buildings
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push('/buildings/add')}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Building
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Communications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => router.push('/dashboard/inbox')}
              className="w-full"
              disabled={!outlookConnection?.connected}
            >
              View Inbox
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push('/communications')}
              className="w-full"
            >
              Communication Log
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => router.push('/documents')}
              className="w-full"
            >
              View Documents
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push('/compliance')}
              className="w-full"
            >
              Compliance
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 