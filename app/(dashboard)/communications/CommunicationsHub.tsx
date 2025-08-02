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
  // Modal states
  const [showLeaseholderSearch, setShowLeaseholderSearch] = useState(false)
  const [showBuildingSearch, setShowBuildingSearch] = useState(false)
  const [showEmailDraft, setShowEmailDraft] = useState(false)
  const [showLetterDraft, setShowLetterDraft] = useState(false)
  const [showCommunicationsLog, setShowCommunicationsLog] = useState(false)
  const [showCallLeaseholder, setShowCallLeaseholder] = useState(false)

  // Selected data
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [selectedLeaseholder, setSelectedLeaseholder] = useState<Leaseholder | null>(null)
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [recentCommunications, setRecentCommunications] = useState<CommunicationLog[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load recent communications
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
        // Don't throw error, just set empty array
        setRecentCommunications([])
        return
      }
      
      setRecentCommunications(data || [])
    } catch (error) {
      console.error('Error loading recent communications:', error)
      setRecentCommunications([])
    }
  }

  const actionTiles = [
    {
      id: 'call',
      title: 'Call a Leaseholder',
      description: 'Search and call individual leaseholders',
      icon: Phone,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700'
    },
    {
      id: 'email',
      title: 'Send an Email',
      description: 'Send email to individual leaseholders',
      icon: Mail,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700'
    },
    {
      id: 'letter',
      title: 'Send a Letter',
      description: 'Generate and send letters to leaseholders',
      icon: FileText,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700'
    },
    {
      id: 'email-all',
      title: 'Email All Leaseholders',
      description: 'Send bulk emails to building leaseholders',
      icon: Building,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-700'
    },
    {
      id: 'letter-all',
      title: 'Send Letter to All',
      description: 'Generate bulk letters for building leaseholders',
      icon: Users,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700'
    },
    {
      id: 'log',
      title: 'View Communications Log',
      description: 'View all communication history',
      icon: History,
      color: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-700'
    }
  ]

  const handleTileClick = (tileId: string) => {
    setSelectedAction(tileId)
    
    switch (tileId) {
      case 'call':
        setShowCallLeaseholder(true)
        break
      case 'email':
      case 'letter':
        setShowLeaseholderSearch(true)
        break
      case 'email-all':
      case 'letter-all':
        setShowBuildingSearch(true)
        break
      case 'log':
        setShowCommunicationsLog(true)
        break
      default:
        toast.info(`${tileId} functionality coming soon!`)
    }
  }

  const handleLeaseholderSelect = (leaseholder: Leaseholder) => {
    setSelectedLeaseholder(leaseholder)
    
    if (selectedAction === 'email') {
      setShowEmailDraft(true)
    } else if (selectedAction === 'letter') {
      setShowLetterDraft(true)
    }
  }

  const handleBuildingSelect = (building: Building) => {
    setSelectedBuilding(building)
    
    if (selectedAction === 'email-all') {
      setShowEmailDraft(true)
    } else if (selectedAction === 'letter-all') {
      setShowLetterDraft(true)
    }
  }

  const handleCallLeaseholder = async (leaseholder: Leaseholder) => {
    if (!leaseholder.phone) {
      toast.error('No phone number available for this leaseholder')
      return
    }

    try {
      setIsLoading(true)
      
      // Log the call
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
        console.error('Error logging call:', error)
        // Don't fail the call if logging fails
        toast.warning('Call logged with warning - logging failed')
      } else {
        toast.success('Call logged successfully')
      }

      // Open phone dialer
      window.open(`tel:${leaseholder.phone}`, '_blank')
      toast.success(`Calling ${leaseholder.name}`)
      
      // Refresh recent communications
      await loadRecentCommunications()
      
    } catch (error) {
      console.error('Error in call process:', error)
      toast.error('Failed to process call')
    } finally {
      setIsLoading(false)
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
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <PageHero
        title="Communications Hub"
        subtitle="Manage all leaseholder contact from one place"
        icon={<Phone className="h-8 w-8 text-white" />}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Communications Hub</h1>
              <p className="text-xl text-gray-600 mt-2">Manage all leaseholder contact from one place</p>
            </div>
            
            <div className="flex items-center gap-3">
              <BlocIQBadge variant="secondary" size="sm">
                {recentCommunications.length} recent communications
              </BlocIQBadge>
            </div>
          </div>
        </div>

      {/* Action Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {actionTiles.map((tile) => (
          <BlocIQCard 
            key={tile.id}
            variant="elevated"
            className={`cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 ${tile.borderColor} ${tile.bgColor} hover:shadow-lg`}
            onClick={() => handleTileClick(tile.id)}
          >
            <BlocIQCardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-2xl bg-gradient-to-r ${tile.color} text-white shadow-lg`}>
                  <tile.icon className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">{tile.title}</h3>
                  <p className="text-sm text-gray-600">{tile.description}</p>
                </div>
              </div>
            </BlocIQCardContent>
          </BlocIQCard>
        ))}
      </div>

      {/* Recent Communications */}
      {recentCommunications.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Recent Communications</h2>
            <BlocIQButton 
              variant="outline" 
              onClick={() => setShowCommunicationsLog(true)}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              View All
            </BlocIQButton>
          </div>
          
          <div className="grid gap-4">
            {recentCommunications.slice(0, 5).map((comm) => (
              <BlocIQCard key={comm.id} variant="elevated" className="hover:shadow-md transition-shadow">
                <BlocIQCardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        comm.type === 'call' ? 'bg-green-100 text-green-700' :
                        comm.type === 'email' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {comm.type === 'call' ? <Phone className="h-4 w-4" /> :
                         comm.type === 'email' ? <Mail className="h-4 w-4" /> :
                         <FileText className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{comm.leaseholder_name}</span>
                          <BlocIQBadge variant="outline" size="sm">
                            {comm.unit_number}
                          </BlocIQBadge>
                        </div>
                        <p className="text-sm text-gray-600">{comm.subject}</p>
                        <p className="text-xs text-gray-500">{comm.building_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(comm.status)}
                      <span className="text-xs text-gray-500">{formatDate(comm.created_at)}</span>
                    </div>
                  </div>
                </BlocIQCardContent>
              </BlocIQCard>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
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
  )
} 