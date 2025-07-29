'use client'

import React, { useState } from 'react'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar, 
  FileText, 
  Eye, 
  Download, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Building2,
  Brain,
  MessageSquare
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'

interface ComplianceAsset {
  id: string
  name: string
  description: string | null
  category: string | null
  recommended_frequency?: string
}

interface BuildingComplianceAsset {
  id: string
  building_id: number
  asset_id: string
  status: string
  notes: string | null
  next_due_date: string | null
  last_updated: string
  compliance_assets: ComplianceAsset
  documents: any[]
}

interface ComplianceDocument {
  id: string
  doc_type: string
  doc_url: string
  uploaded_at: string
  expiry_date: string | null
  building_id: string
}

interface Building {
  id: string
  name: string
  address: string | null
  unit_count: number | null
}

interface ComplianceData {
  building: Building
  groupedAssets: Record<string, BuildingComplianceAsset[]>
  complianceDocuments: ComplianceDocument[]
  statistics: {
    total: number
    compliant: number
    overdue: number
    dueSoon: number
  }
}

interface BuildingComplianceTrackerProps {
  complianceData: ComplianceData
}

// Category configurations with BlocIQ styling
const categoryConfigs = {
  'Legal & Safety': {
    description: 'Fire, electrical and health legislation',
    color: 'bg-red-50 border-red-200 text-red-700',
    icon: Shield
  },
  'Structural & Condition': {
    description: 'Building structure and condition assessments',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    icon: Building2
  },
  'Operational & Contracts': {
    description: 'Service contracts and operational requirements',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    icon: Clock
  },
  'Insurance': {
    description: 'Building and liability insurance requirements',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    icon: Shield
  },
  'Lease & Documentation': {
    description: 'Lease compliance and documentation requirements',
    color: 'bg-green-50 border-green-200 text-green-700',
    icon: CheckCircle
  },
  'Admin': {
    description: 'Administrative and reporting requirements',
    color: 'bg-gray-50 border-gray-200 text-gray-700',
    icon: CheckCircle
  },
  'Smart Records': {
    description: 'Digital record keeping and smart building systems',
    color: 'bg-teal-50 border-teal-200 text-teal-700',
    icon: Brain
  },
  'Safety': {
    description: 'BSA-specific safety requirements',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    icon: AlertTriangle
  }
}

export default function BuildingComplianceTracker({ complianceData }: BuildingComplianceTrackerProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const { building, groupedAssets, statistics } = complianceData

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const getStatusBadge = (asset: BuildingComplianceAsset) => {
    if (!asset.next_due_date) {
      return (
        <BlocIQBadge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">
          <Clock className="w-3 h-3 mr-1" />
          No Due Date
        </BlocIQBadge>
      )
    }

    const dueDate = new Date(asset.next_due_date)
    const today = new Date()
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDue < 0) {
      return (
        <BlocIQBadge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Overdue
        </BlocIQBadge>
      )
    } else if (daysUntilDue <= 30) {
      return (
        <BlocIQBadge variant="warning" className="bg-orange-100 text-orange-700 border-orange-300">
          <Clock className="w-3 h-3 mr-1" />
          Due Soon
        </BlocIQBadge>
      )
    } else {
      return (
        <BlocIQBadge variant="success" className="bg-green-100 text-green-700 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Compliant
        </BlocIQBadge>
      )
    }
  }

  const getFrequencyColor = (frequency: string) => {
    const colors = {
      '6 months': 'bg-orange-100 text-orange-800 border-orange-200',
      '1 year': 'bg-blue-100 text-blue-800 border-blue-200',
      '2 years': 'bg-purple-100 text-purple-800 border-purple-200',
      '5 years': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      '10 years': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[frequency as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#333333] mb-2">
              Compliance Tracker
            </h1>
            <p className="text-gray-600 font-serif">
              {building.name} • {building.address}
            </p>
          </div>
          <BlocIQButton
            onClick={() => window.location.href = `/buildings/${building.id}/compliance/setup`}
            className="bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white"
          >
            <Shield className="w-4 h-4 mr-2" />
            Manage Compliance
          </BlocIQButton>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <BlocIQCard className="bg-white border-2 border-gray-100 rounded-xl">
            <BlocIQCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-serif">Total Assets</p>
                  <p className="text-2xl font-serif font-bold text-[#333333]">{statistics.total}</p>
                </div>
                <Shield className="w-8 h-8 text-[#2BBEB4]" />
              </div>
            </BlocIQCardContent>
          </BlocIQCard>

          <BlocIQCard className="bg-white border-2 border-green-100 rounded-xl">
            <BlocIQCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-serif">Compliant</p>
                  <p className="text-2xl font-serif font-bold text-green-700">{statistics.compliant}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </BlocIQCardContent>
          </BlocIQCard>

          <BlocIQCard className="bg-white border-2 border-orange-100 rounded-xl">
            <BlocIQCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-serif">Due Soon</p>
                  <p className="text-2xl font-serif font-bold text-orange-700">{statistics.dueSoon}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </BlocIQCardContent>
          </BlocIQCard>

          <BlocIQCard className="bg-white border-2 border-red-100 rounded-xl">
            <BlocIQCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-serif">Overdue</p>
                  <p className="text-2xl font-serif font-bold text-red-700">{statistics.overdue}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </BlocIQCardContent>
          </BlocIQCard>
        </div>
      </div>

      {/* Compliance Assets by Category */}
      <div className="space-y-6">
        {Object.entries(groupedAssets).map(([category, assets]) => {
          const config = categoryConfigs[category as keyof typeof categoryConfigs] || {
            description: 'Other compliance requirements',
            color: 'bg-gray-50 border-gray-200 text-gray-700',
            icon: Shield
          }
          const IconComponent = config.icon
          const isExpanded = expandedCategories.has(category)

          return (
            <BlocIQCard key={category} className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden">
              <BlocIQCardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-serif font-semibold text-[#333333]">{category}</h3>
                      <p className="text-sm text-gray-600 font-serif">{config.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <BlocIQBadge variant="secondary" className="bg-gray-100 text-gray-700">
                      {assets.length} assets
                    </BlocIQBadge>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </BlocIQCardHeader>

              {isExpanded && (
                <BlocIQCardContent className="p-0">
                  <div className="divide-y divide-gray-100">
                    {assets.map((asset) => (
                      <div key={asset.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-serif font-semibold text-[#333333]">
                                {asset.compliance_assets.name}
                              </h4>
                              {getStatusBadge(asset)}
                            </div>
                            
                            {asset.compliance_assets.description && (
                              <p className="text-gray-600 font-serif mb-3">
                                {asset.compliance_assets.description}
                              </p>
                            )}

                            <div className="flex items-center space-x-4 text-sm text-gray-500 font-serif">
                              {asset.next_due_date && (
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>Due: {formatDate(asset.next_due_date)}</span>
                                  <span className="text-xs">
                                    ({getDaysUntilDue(asset.next_due_date)} days)
                                  </span>
                                </div>
                              )}
                              
                              {asset.compliance_assets.recommended_frequency && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>Frequency: {asset.compliance_assets.recommended_frequency}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {asset.documents && asset.documents.length > 0 && (
                              <BlocIQButton
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(asset.documents[0].doc_url, '_blank')}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                View Document
                              </BlocIQButton>
                            )}
                            
                            <BlocIQButton
                              variant="outline"
                              size="sm"
                              onClick={() => window.location.href = `/buildings/${building.id}/compliance/setup`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Manage
                            </BlocIQButton>
                          </div>
                        </div>

                        {asset.notes && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800 font-serif">
                              <strong>Notes:</strong> {asset.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </BlocIQCardContent>
              )}
            </BlocIQCard>
          )
        })}
      </div>
    </div>
  )
} 