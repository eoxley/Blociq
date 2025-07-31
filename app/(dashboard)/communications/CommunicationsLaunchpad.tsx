'use client'

import React, { useState } from 'react'
import { 
  Phone, 
  Mail, 
  FileText, 
  Building, 
  Users, 
  History
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import LeaseholderSearchModal from './components/LeaseholderSearchModal'
import BuildingSearchModal from './components/BuildingSearchModal'
import EmailDraftModal from './components/EmailDraftModal'
import LetterDraftModal from './components/LetterDraftModal'
import CommunicationsLogModal from './components/CommunicationsLogModal'

interface Leaseholder {
  id: string
  full_name: string
  email: string
  phone_number: string
  correspondence_address: string
  unit_number: string
  building_name: string
}

interface Building {
  id: string
  name: string
  address: string
  leaseholderCount?: number
}

export default function CommunicationsLaunchpad() {
  // Modal states
  const [showLeaseholderSearch, setShowLeaseholderSearch] = useState(false)
  const [showBuildingSearch, setShowBuildingSearch] = useState(false)
  const [showEmailDraft, setShowEmailDraft] = useState(false)
  const [showLetterDraft, setShowLetterDraft] = useState(false)
  const [showCommunicationsLog, setShowCommunicationsLog] = useState(false)

  // Selected data
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [selectedLeaseholder, setSelectedLeaseholder] = useState<Leaseholder | null>(null)
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)

  const actionTiles = [
    {
      id: 'call',
      title: 'Call a Leaseholder',
      description: 'Search and call individual leaseholders',
      icon: Phone,
      color: 'bg-green-500'
    },
    {
      id: 'email',
      title: 'Send an Email',
      description: 'Send email to individual leaseholders',
      icon: Mail,
      color: 'bg-blue-500'
    },
    {
      id: 'letter',
      title: 'Send a Letter',
      description: 'Generate and send letters to leaseholders',
      icon: FileText,
      color: 'bg-purple-500'
    },
    {
      id: 'email-all',
      title: 'Email All Leaseholders',
      description: 'Send bulk emails to building leaseholders',
      icon: Building,
      color: 'bg-orange-500'
    },
    {
      id: 'letter-all',
      title: 'Send Letter to All',
      description: 'Generate bulk letters for building leaseholders',
      icon: Users,
      color: 'bg-red-500'
    },
    {
      id: 'log',
      title: 'View Communications Log',
      description: 'View all communication history',
      icon: History,
      color: 'bg-gray-500'
    }
  ]

  const handleTileClick = (tileId: string) => {
    setSelectedAction(tileId)
    
    switch (tileId) {
      case 'call':
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
    
    if (selectedAction === 'call') {
      handleCallLeaseholder(leaseholder)
    } else if (selectedAction === 'email') {
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

  const handleCallLeaseholder = (leaseholder: Leaseholder) => {
    if (!leaseholder.phone_number) {
      toast.error('No phone number available for this leaseholder')
      return
    }

    // Log the call
    logCommunication({
      type: 'call',
      leaseholder_id: leaseholder.id,
      leaseholder_name: leaseholder.full_name,
      building_name: leaseholder.building_name,
      unit_number: leaseholder.unit_number,
      subject: 'Phone Call',
      content: `Called ${leaseholder.full_name} at ${leaseholder.phone_number}`
    })

    // Open phone dialer
    window.open(`tel:${leaseholder.phone_number}`, '_blank')
    toast.success(`Calling ${leaseholder.full_name}`)
  }

  const logCommunication = async (communication: {
    type: 'call' | 'email' | 'letter'
    leaseholder_id: string
    leaseholder_name: string
    building_name: string
    unit_number: string
    subject: string
    content: string
  }) => {
    try {
      const { error } = await supabase
        .from('communications_sent')
        .insert({
          to_email: communication.leaseholder_name,
          subject: communication.subject,
          message: communication.content,
          sent_by: 'system',
          status: 'sent'
        })

      if (error) throw error
    } catch (error) {
      console.error('Error logging communication:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Communications</h1>
          <p className="text-gray-600 mt-2">Manage all leaseholder communications from one central hub</p>
        </div>
      </div>

      {/* Action Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actionTiles.map((tile) => (
          <Card 
            key={tile.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => handleTileClick(tile.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl ${tile.color} text-white`}>
                  <tile.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{tile.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{tile.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modals */}
      <LeaseholderSearchModal
        open={showLeaseholderSearch}
        onOpenChange={setShowLeaseholderSearch}
        action={selectedAction as 'call' | 'email' | 'letter'}
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
      />

      <LetterDraftModal
        open={showLetterDraft}
        onOpenChange={setShowLetterDraft}
        leaseholder={selectedLeaseholder || undefined}
        building={selectedBuilding || undefined}
        isBulk={selectedAction === 'letter-all'}
      />

      <CommunicationsLogModal
        open={showCommunicationsLog}
        onOpenChange={setShowCommunicationsLog}
      />
    </div>
  )
} 