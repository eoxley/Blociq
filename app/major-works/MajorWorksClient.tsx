'use client'
import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Plus, 
  Building, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Edit3, 
  MessageSquare, 
  FileText, 
  Users, 
  Target,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Brain
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import BlocIQLogo from '@/components/BlocIQLogo'
import MajorWorksDashboard from '@/components/MajorWorksDashboard'
import { toast } from 'sonner'

interface UserData {
  name: string
  email: string
}

interface MajorWorksClientProps {
  userData: UserData
  selectedBuildingId?: string
}

export default function MajorWorksClient({ userData, selectedBuildingId }: MajorWorksClientProps) {
  const supabase = createClientComponentClient()
  const [buildings, setBuildings] = useState<any[]>([])

  useEffect(() => {
    fetchBuildings()
  }, [])

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings')
      if (response.ok) {
        const data = await response.json()
        setBuildings(data.buildings || [])
      }
    } catch (error) {
      console.error('Error fetching buildings:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#008C8F] to-[#2BBEB4] rounded-xl flex items-center justify-center">
            <BlocIQLogo className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">
              Major Works Management
            </h1>
            <p className="text-lg text-gray-600">
              Track and manage major works projects across all buildings
            </p>
          </div>
        </div>
      </div>

      {/* Major Works Dashboard */}
      <MajorWorksDashboard 
        showAllBuildings={true}
        limit={selectedBuildingId ? undefined : 20} // Show more projects on dedicated page
        showAddButton={true}
      />
    </div>
  )
} 