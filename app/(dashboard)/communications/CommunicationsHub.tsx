'use client'

import React, { useState, useEffect } from 'react'
import { 
  Phone, 
  Mail, 
  FileText, 
  Building, 
  Users, 
  History,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  MessageSquare,
  Send
} from 'lucide-react'
import { BlocIQCard, BlocIQCardContent } from '@/components/ui/blociq-card'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import LeaseholderSearchModal from './components/LeaseholderSearchModal'
import BuildingSearchModal from './components/BuildingSearchModal'
import EmailDraftModal from './components/EmailDraftModal'
import LetterDraftModal from './components/LetterDraftModal'
import CommunicationsLogModal from './components/CommunicationsLogModal'
import CallLeaseholderModal from './components/CallLeaseholderModal'

interface Leaseholder {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  unit_id: number | null
  unit?: {
    unit_number: string
    building?: {
      name: string
      address: string
    }
  }
}

interface Building {
  id: string
  name: string
  address: string
  leaseholderCount?: number
}

interface CommunicationLog {
  id: string
  type: 'call' | 'email' | 'letter'
  leaseholder_id: string
  leaseholder_name: string
  building_name: string
  unit_number: string
  subject: string
  content: string
  created_at: string
  status: 'sent' | 'failed' | 'pending'
}

export default function CommunicationsHub() {
  const [showLeaseholderSearch, setShowLeaseholderSearch] = useState(false)
  const [showBuildingSearch, setShowBuildingSearch] = useState(false)
  const [showEmailDraft, setShowEmailDraft] = useState(false)
  const [showLetterDraft, setShowLetterDraft] = useState(false)
  const [showCommunicationsLog, setShowCommunicationsLog] = useState(false)
  const [showCallLeaseholder, setShowCallLeaseholder] = useState(false)

  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [selectedLeaseholder, setSelectedLeaseholder] = useState<Leaseholder | null>(null)
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [recentCommunications, setRecentCommunications] = useState<CommunicationLog[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadRecentCommunications()
  }, [])

  const loadRecentCommunications = async () => {
    try {
      const { data, error } = await supabase
        .from('communications_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error loading communications log:', error)
        setRecentCommunications([])
        return
      }

      setRecentCommunications(data || [])
    } catch (error) {
      console.error('Error loading communications log:', error)
      setRecentCommunications([])
    }
  }

  const actionTiles = [
    {
      id: 'email-leaseholder',
      title: 'Send Email',
      description: 'Send an email to a specific leaseholder',
      icon: Mail,
      gradient: 'from-[#4f46e5] to-[#a855f7]',
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      iconColor: 'text-[#4f46e5]'
    },
    {
      id: 'call-leaseholder',
      title: 'Call Leaseholder',
      description: 'Make a phone call to a leaseholder',
      icon: Phone,
      gradient: 'from-teal-600 to-blue-600',
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      iconColor: 'text-teal-600'
    },
    {
      id: 'letter-leaseholder',
      title: 'Send Letter',
      description: 'Draft and send a letter to a leaseholder',
      icon: FileText,
      gradient: 'from-purple-600 to-pink-600',
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      iconColor: 'text-purple-600'
    },
    {
      id: 'email-all',
      title: 'Email All',
      description: 'Send an email to all leaseholders in a building',
      icon: Building,
      gradient: 'from-[#4f46e5] to-[#a855f7]',
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      iconColor: 'text-[#4f46e5]'
    },
    {
      id: 'letter-all',
      title: 'Letter All',
      description: 'Send a letter to all leaseholders in a building',
      icon: Users,
      gradient: 'from-orange-500 to-red-500',
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      iconColor: 'text-orange-600'
    },
    {
      id: 'communications-log',
      title: 'View Communications Log',
      description: 'View all past communications and history',
      icon: History,
      gradient: 'from-gray-800 to-gray-900',
      bgColor: 'bg-gray-900',
      borderColor: 'border-gray-700',
      iconColor: 'text-white'
    }
  ]

  const handleTileClick = (tileId: string) => {
    setSelectedAction(tileId)
    
    switch (tileId) {
      case 'email-leaseholder':
      case 'letter-leaseholder':
        setShowLeaseholderSearch(true)
        break
      case 'email-all':
      case 'letter-all':
        setShowBuildingSearch(true)
        break
      case 'call-leaseholder':
        setShowCallLeaseholder(true)
        break
      case 'communications-log':
        setShowCommunicationsLog(true)
        break
      default:
        toast.error('Feature coming soon!')
    }
  }

  const handleLeaseholderSelect = (leaseholder: Leaseholder) => {
    setSelectedLeaseholder(leaseholder)
    setShowLeaseholderSearch(false)
    
    if (selectedAction === 'email-leaseholder') {
      setShowEmailDraft(true)
    } else if (selectedAction === 'letter-leaseholder') {
      setShowLetterDraft(true)
    }
  }

  const handleBuildingSelect = (building: Building) => {
    setSelectedBuilding(building)
    setShowBuildingSearch(false)
    
    if (selectedAction === 'email-all') {
      setShowEmailDraft(true)
    } else if (selectedAction === 'letter-all') {
      setShowLetterDraft(true)
    }
  }

  const handleCallLeaseholder = async (leaseholder: Leaseholder) => {
    setIsLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Log the communication
      const { error } = await supabase
        .from('communications_log')
        .insert({
          type: 'call',
          leaseholder_id: leaseholder.id,
          leaseholder_name: leaseholder.name || 'Unknown',
          building_name: leaseholder.unit?.building?.name || 'Unknown',
          unit_number: leaseholder.unit?.unit_number || 'Unknown',
          subject: 'Phone Call',
          content: `Called ${leaseholder.name} at ${leaseholder.phone}`,
          status: 'sent'
        })

      if (error) {
        console.error('Error logging communication:', error)
      }

      toast.success(`Call logged for ${leaseholder.name}`)
      loadRecentCommunications()
    } catch (error) {
      console.error('Error making call:', error)
      toast.error('Failed to log call')
    } finally {
      setIsLoading(false)
      setShowCallLeaseholder(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      {/* Enhanced Hero Banner - BlocIQ Landing Page Style */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <MessageSquare className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Communications Hub
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Manage all leaseholder contact from one place
            </p>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Enhanced Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-5 w-5 text-[#4f46e5]" />
                  <p className="text-gray-600 text-sm font-medium">Recent Communications</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{recentCommunications.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-gray-600 text-sm font-medium">Successful</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{recentCommunications.filter(comm => comm.status === 'sent').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <p className="text-gray-600 text-sm font-medium">Pending</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{recentCommunications.filter(comm => comm.status === 'pending').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Action Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {actionTiles.map((tile) => (
            <div 
              key={tile.id}
              className={`cursor-pointer group hover:shadow-xl transition-all duration-300 hover:scale-105 border ${tile.borderColor} ${tile.bgColor} rounded-xl p-6 min-h-[140px] w-full`}
              onClick={() => handleTileClick(tile.id)}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${tile.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <tile.icon className="h-6 w-6" />
                  </div>
                  {tile.id === 'communications-log' && (
                    <ArrowRight className="h-5 w-5 text-white group-hover:translate-x-1 transition-transform duration-200" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{tile.title}</h3>
                  <p className="text-sm text-gray-600">{tile.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Recent Communications */}
        {recentCommunications.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Recent Communications</h2>
                  <p className="text-gray-600">Latest leaseholder interactions</p>
                </div>
                <button 
                  onClick={() => setShowCommunicationsLog(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-xl hover:brightness-110 transition-all duration-200 font-medium shadow-sm"
                >
                  <History className="h-4 w-4" />
                  View All
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {recentCommunications.slice(0, 5).map((comm) => (
                  <div key={comm.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        comm.type === 'call' ? 'bg-green-100 text-green-700' :
                        comm.type === 'email' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {comm.type === 'call' ? <Phone className="h-5 w-5" /> :
                         comm.type === 'email' ? <Mail className="h-5 w-5" /> :
                         <FileText className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{comm.leaseholder_name}</span>
                          <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                            {comm.unit_number}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{comm.subject}</p>
                        <p className="text-xs text-gray-500">{comm.building_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(comm.status)}
                      <span className="text-xs text-gray-500">{formatDate(comm.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <CallLeaseholderModal
          open={showCallLeaseholder}
          onOpenChange={setShowCallLeaseholder}
          onLeaseholderSelect={(leaseholder: any) => handleCallLeaseholder(leaseholder)}
          isLoading={isLoading}
        />

        <LeaseholderSearchModal
          open={showLeaseholderSearch}
          onOpenChange={setShowLeaseholderSearch}
          action={selectedAction as 'email' | 'letter'}
          onLeaseholderSelect={(leaseholder: any) => handleLeaseholderSelect(leaseholder)}
        />

        <BuildingSearchModal
          open={showBuildingSearch}
          onOpenChange={setShowBuildingSearch}
          action={selectedAction as 'email-all' | 'letter-all'}
          onBuildingSelect={handleBuildingSelect}
        />

        <EmailDraftModal
          open={showEmailDraft}
          onOpenChange={setShowEmailDraft}
          leaseholder={selectedLeaseholder as any || undefined}
          building={selectedBuilding || undefined}
          isBulk={selectedAction === 'email-all'}
          onSuccess={loadRecentCommunications}
        />

        <LetterDraftModal
          open={showLetterDraft}
          onOpenChange={setShowLetterDraft}
          leaseholder={selectedLeaseholder as any || undefined}
          building={selectedBuilding || undefined}
          isBulk={selectedAction === 'letter-all'}
        />

        <CommunicationsLogModal
          open={showCommunicationsLog}
          onOpenChange={setShowCommunicationsLog}
        />
      </div>
    </>
  )
}