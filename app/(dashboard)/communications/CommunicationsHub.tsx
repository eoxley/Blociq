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
  Clock
} from 'lucide-react'
import { BlocIQCard, BlocIQCardContent } from '@/components/ui/blociq-card'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import PageHero from '@/components/PageHero'
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
      title: 'Email Leaseholder',
      description: 'Send an email to a specific leaseholder',
      icon: Mail,
      color: 'from-blue-600 to-purple-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'call-leaseholder',
      title: 'Call Leaseholder',
      description: 'Make a phone call to a leaseholder',
      icon: Phone,
      color: 'from-blue-600 to-indigo-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'letter-leaseholder',
      title: 'Send Letter',
      description: 'Draft and send a letter to a leaseholder',
      icon: FileText,
      color: 'from-purple-600 to-indigo-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      id: 'email-all',
      title: 'Email All',
      description: 'Send an email to all leaseholders in a building',
      icon: Building,
      color: 'from-blue-600 to-purple-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'letter-all',
      title: 'Letter All',
      description: 'Send a letter to all leaseholders in a building',
      icon: Users,
      color: 'from-indigo-600 to-purple-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      id: 'communications-log',
      title: 'View Log',
      description: 'View all past communications',
      icon: History,
      color: 'from-gray-600 to-gray-700',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
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
    <div className="space-y-8">
      <PageHero
        title="Communications Hub"
        subtitle="Manage all leaseholder contact from one place"
        icon={<Phone className="h-8 w-8 text-white" />}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Recent Communications</p>
                <p className="text-3xl font-bold">{recentCommunications.length}</p>
              </div>
              <Phone className="h-8 w-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Successful</p>
                <p className="text-3xl font-bold">{recentCommunications.filter(comm => comm.status === 'sent').length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold">{recentCommunications.filter(comm => comm.status === 'pending').length}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Action Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actionTiles.map((tile) => (
            <div 
              key={tile.id}
              className={`cursor-pointer group hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 ${tile.borderColor} ${tile.bgColor} rounded-xl p-6 hover:shadow-lg`}
              onClick={() => handleTileClick(tile.id)}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-2xl bg-gradient-to-r ${tile.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <tile.icon className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">{tile.title}</h3>
                  <p className="text-sm text-gray-600">{tile.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Communications */}
        {recentCommunications.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Recent Communications</h2>
                  <p className="text-gray-600">Latest leaseholder interactions</p>
                </div>
                <button 
                  onClick={() => setShowCommunicationsLog(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <History className="h-4 w-4" />
                  View All
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {recentCommunications.slice(0, 5).map((comm) => (
                  <div key={comm.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${
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
          onLeaseholderSelect={handleCallLeaseholder}
          isLoading={isLoading}
        />

        <LeaseholderSearchModal
          open={showLeaseholderSearch}
          onOpenChange={setShowLeaseholderSearch}
          action={selectedAction as 'email' | 'letter'}
          onLeaseholderSelect={handleLeaseholderSelect}
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
          leaseholder={selectedLeaseholder || undefined}
          building={selectedBuilding || undefined}
          isBulk={selectedAction === 'email-all'}
          onSuccess={loadRecentCommunications}
        />

        <LetterDraftModal
          open={showLetterDraft}
          onOpenChange={setShowLetterDraft}
          leaseholder={selectedLeaseholder || undefined}
          building={selectedBuilding || undefined}
          isBulk={selectedAction === 'letter-all'}
          onSuccess={loadRecentCommunications}
        />

        <CommunicationsLogModal
          open={showCommunicationsLog}
          onOpenChange={setShowCommunicationsLog}
        />
      </div>
    </div>
  )
}