'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
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
      {/* Major Works Dashboard */}
      <MajorWorksDashboard 
        showAllBuildings={true}
        limit={selectedBuildingId ? undefined : 20} // Show more projects on dedicated page
        showAddButton={true}
      />
    </div>
  )
} 