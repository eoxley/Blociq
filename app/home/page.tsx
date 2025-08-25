'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Building2, 
  Shield, 
  Inbox, 
  MessageSquare, 
  Wrench, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Sparkles
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import DashboardSidebar from '@/components/DashboardSidebar'
import MobileNavigation from '@/components/MobileNavigation'
import AskBlocIQHomepage from '@/components/AskBlocIQHomepage'

interface DashboardStats {
  totalBuildings: number
  totalUnits: number
  complianceStatus: {
    compliant: number
    pending: number
    overdue: number
  }
  recentEmails: number
  upcomingTasks: number
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBuildings: 0,
    totalUnits: 0,
    complianceStatus: { compliant: 0, pending: 0, overdue: 0 },
    recentEmails: 0,
    upcomingTasks: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const [buildingsRes, complianceRes, emailsRes] = await Promise.all([
          fetch('/api/buildings').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/api/portfolio/compliance/summary').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/api/inbox/count').then(r => r.json()).catch(() => ({ count: 0 }))
        ])

        const buildings = buildingsRes.data || []
        const complianceData = complianceRes.data || []
        
        const totalBuildings = buildings.length
        const totalUnits = buildings.reduce((sum: number, b: any) => sum + (b.unit_count || 0), 0)
        
        const complianceStatus = complianceData.reduce((acc: any, building: any) => {
          acc.compliant += building.compliant || 0
          acc.pending += building.due_soon || 0
          acc.overdue += building.overdue || 0
          return acc
        }, { compliant: 0, pending: 0, overdue: 0 })

        setStats({
          totalBuildings,
          totalUnits,
          complianceStatus,
          recentEmails: emailsRes.count || 0,
          upcomingTasks: complianceStatus.pending + complianceStatus.overdue
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const quickActions = [
    {
      title: 'View Buildings',
      description: 'Manage your property portfolio',
      icon: Building2,
      href: '/buildings',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Compliance Overview',
      description: 'Portfolio compliance status',
      icon: Shield,
      href: '/compliance',
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Inbox',
      description: 'Email management',
      icon: Inbox,
      href: '/inbox',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Communications',
      description: 'Letters & templates',
      icon: MessageSquare,
      href: '/communications',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]

  const statCards = [
    {
      title: 'Total Buildings',
      value: stats.totalBuildings,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Units',
      value: stats.totalUnits,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Compliant Assets',
      value: stats.complianceStatus.compliant,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      title: 'Pending Actions',
      value: stats.upcomingTasks,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
        <div className="flex flex-1 overflow-hidden">
          <DashboardSidebar />
          <MobileNavigation />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-6">
              <div className="w-full max-w-[1800px] mx-auto px-4 lg:px-6 xl:px-8">
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <DashboardSidebar />
        </div>
        
        {/* Mobile Navigation */}
        <MobileNavigation />
        
        <main className="flex-1 overflow-y-auto">
          {/* Main Content */}
          <div className="p-4 lg:p-6">
            <div className="w-full max-w-[1800px] mx-auto px-4 lg:px-6 xl:px-8">
              <div className="space-y-8">
                {/* Hero Section */}
                <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 rounded-3xl">
                  <div className="relative z-10 text-center">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                      <Sparkles className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                      Welcome to BlocIQ
                    </h1>
                    <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed mb-8">
                      Your property management dashboard. Monitor compliance, manage buildings, and stay on top of everything.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link href="/buildings">
                        <BlocIQButton size="lg" className="bg-white text-[#4f46e5] hover:bg-gray-100">
                          <Building2 className="h-5 w-5 mr-2" />
                          View Buildings
                        </BlocIQButton>
                      </Link>
                      <Link href="/compliance">
                        <BlocIQButton size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                          <Shield className="h-5 w-5 mr-2" />
                          Compliance Overview
                        </BlocIQButton>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Decorative Elements */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                  </div>
                </section>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {statCards.map((stat, index) => (
                    <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                          <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        {stat.title === 'Pending Actions' && stats.complianceStatus.overdue > 0 && (
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                      <p className="text-sm text-gray-600">{stat.title}</p>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {quickActions.map((action, index) => (
                      <Link key={index} href={action.href}>
                        <div className={`${action.bgColor} rounded-2xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-gray-100`}>
                          <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                            <action.icon className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                          <p className="text-sm text-gray-600">{action.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Portfolio Overview</p>
                        <p className="text-sm text-gray-600">Managing {stats.totalBuildings} buildings with {stats.totalUnits} units</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Shield className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Compliance Status</p>
                        <p className="text-sm text-gray-600">
                          {stats.complianceStatus.compliant} compliant, {stats.complianceStatus.pending} pending, {stats.complianceStatus.overdue} overdue
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Inbox className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Email Management</p>
                        <p className="text-sm text-gray-600">{stats.recentEmails} emails in inbox</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ask BlocIQ AI Component */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">🧠 Ask BlocIQ AI</h2>
                  <AskBlocIQHomepage />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
