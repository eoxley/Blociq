'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Upload, 
  FileText, 
  Eye, 
  Download, 
  Plus, 
  Filter, 
  Search, 
  Settings, 
  Brain, 
  MessageSquare, 
  Building, 
  TrendingUp, 
  Bell,
  X,
  Edit,
  Save,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Paperclip,
  CalendarDays,
  AlertCircle,
  ChevronUp
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import UploadComplianceModal from '@/components/UploadComplianceModal'
import { toast } from 'sonner'

interface Building {
  id: string
  name: string
  address: string | null
  unit_count: number | null
}

interface ComplianceAsset {
  id: string
  name: string
  description: string | null
  category: string | null
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
  documents: ComplianceDocument[]
}

interface ComplianceDocument {
  id: string
  doc_type: string | null
  doc_url: string | null
  uploaded_at: string | null
  expiry_date: string | null
  building_id: number | null
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
    missingDocuments: number
  }
}

interface ComplianceTrackerClientProps {
  complianceData: ComplianceData
}

// Category configurations with icons and colors
const categoryConfigs = {
  'Legal & Safety': {
    description: 'Fire, electrical and health legislation',
    color: 'bg-red-50 border-red-200 text-red-700',
    icon: Shield,
    bgColor: 'bg-red-500'
  },
  'Structural & Condition': {
    description: 'Building structure and condition assessments',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    icon: Building,
    bgColor: 'bg-orange-500'
  },
  'Operational & Contracts': {
    description: 'Service contracts and operational requirements',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    icon: Clock,
    bgColor: 'bg-blue-500'
  },
  'Insurance': {
    description: 'Building and liability insurance requirements',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    icon: Shield,
    bgColor: 'bg-purple-500'
  },
  'Lease & Documentation': {
    description: 'Lease compliance and documentation requirements',
    color: 'bg-green-50 border-green-200 text-green-700',
    icon: FileText,
    bgColor: 'bg-green-500'
  },
  'Admin': {
    description: 'Administrative and reporting requirements',
    color: 'bg-gray-50 border-gray-200 text-gray-700',
    icon: Settings,
    bgColor: 'bg-gray-500'
  },
  'Smart Records': {
    description: 'Digital record keeping and smart building systems',
    color: 'bg-teal-50 border-teal-200 text-teal-700',
    icon: Brain,
    bgColor: 'bg-teal-500'
  },
  'Safety': {
    description: 'BSA-specific safety requirements',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    icon: AlertTriangle,
    bgColor: 'bg-yellow-500'
  }
}

export default function ComplianceTrackerClient({ complianceData }: ComplianceTrackerClientProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedAssetForUpload, setSelectedAssetForUpload] = useState<{id: string, name: string} | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'overdue' | 'due-soon' | 'compliant' | 'missing'>('all')
  
  const router = useRouter()

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

  const getAssetStatus = (asset: BuildingComplianceAsset) => {
    if (!asset.next_due_date) {
      return { status: 'missing', label: '📄 Missing', color: 'bg-gray-100 text-gray-800 border-gray-200' }
    }

    const dueDate = new Date(asset.next_due_date)
    const today = new Date()
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDue < 0) {
      return { status: 'overdue', label: '❌ Overdue', color: 'bg-red-100 text-red-800 border-red-200' }
    } else if (daysUntilDue <= 30) {
      return { status: 'due-soon', label: '⚠️ Due Soon', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    } else {
      return { status: 'compliant', label: '✅ Compliant', color: 'bg-green-100 text-green-800 border-green-200' }
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getFrequencyColor = (frequency: string) => {
    const colors = {
      '6 months': 'bg-orange-100 text-orange-800 border-orange-200',
      '1 year': 'bg-blue-100 text-blue-800 border-blue-200',
      '2 years': 'bg-green-100 text-green-800 border-green-200',
      '3 years': 'bg-purple-100 text-purple-800 border-purple-200',
      '5 years': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      '10 years': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[frequency as keyof typeof colors] || colors['1 year']
  }

  const handleUploadComplete = async () => {
    toast.success('Document uploaded successfully!')
    setSelectedAssetForUpload(null)
    // Refresh the page to show new document
    window.location.reload()
  }

  const handleStatusUpdate = async (assetId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('building_compliance_assets')
        .update({ status: newStatus })
        .eq('id', assetId)

      if (error) {
        toast.error('Failed to update status')
      } else {
        toast.success('Status updated successfully')
        // Refresh the page
        window.location.reload()
      }
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  // Filter assets based on search and filter
  const filteredGroupedAssets = Object.entries(complianceData.groupedAssets).reduce((acc, [category, assets]) => {
    const filteredAssets = assets.filter(asset => {
      const matchesSearch = asset.compliance_assets.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           asset.compliance_assets.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const assetStatus = getAssetStatus(asset)
      const matchesFilter = filter === 'all' || assetStatus.status === filter
      
      return matchesSearch && matchesFilter
    })

    if (filteredAssets.length > 0) {
      acc[category] = filteredAssets
    }

    return acc
  }, {} as Record<string, BuildingComplianceAsset[]>)

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#FAFAFA]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push(`/buildings/${complianceData.building.id}`)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-serif text-[#333333] font-bold">
                    Compliance Tracker
                  </h1>
                  <p className="text-lg text-gray-600 mt-1">
                    {complianceData.building.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                                 <Button
                   onClick={() => setSelectedAssetForUpload({
                     id: 'general',
                     name: 'General Compliance Document'
                   })}
                   className="bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-2"
                 >
                   <Upload className="h-4 w-4" />
                   Upload Document
                 </Button>
                <Button
                  onClick={() => router.push(`/buildings/${complianceData.building.id}/compliance/setup`)}
                  variant="outline"
                  className="border-[#2BBEB4] text-[#2BBEB4] hover:bg-[#2BBEB4] hover:text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Setup
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Removed statistics cards section */}

        {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search compliance assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2BBEB4] focus:border-transparent bg-white shadow-sm"
              />
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-[#64748B]" />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-[#64748B]" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2BBEB4] focus:border-transparent bg-white shadow-sm"
              >
                <option value="all">All Items</option>
                <option value="overdue">Overdue</option>
                <option value="due-soon">Due Soon</option>
                <option value="compliant">Compliant</option>
                <option value="missing">Missing Documents</option>
              </select>
            </div>
          </div>

          {/* Compliance Assets by Category */}
          <div className="space-y-6">
            {Object.entries(filteredGroupedAssets).map(([category, assets]) => {
              const config = categoryConfigs[category as keyof typeof categoryConfigs] || categoryConfigs['Admin']
              const IconComponent = config.icon
              const isExpanded = expandedCategories.has(category)
              
              return (
                <Card key={category} className="overflow-hidden">
                  <CardHeader 
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${config.color.split(' ')[0]}`}
                    onClick={() => toggleCategory(category)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-serif font-semibold text-[#333333]">
                            {category}
                          </h2>
                          <p className="text-sm text-gray-600">{assets.length} assets</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="p-0">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
                        {assets.map((asset) => {
                          const status = getAssetStatus(asset)
                          const latestDocument = asset.documents[0]
                          
                          return (
                            <Card 
                              key={asset.id} 
                              className={`transition-all duration-200 hover:shadow-lg ${
                                status.status === 'overdue' ? 'ring-2 ring-red-200 bg-red-50' :
                                status.status === 'due-soon' ? 'ring-2 ring-yellow-200 bg-yellow-50' :
                                'hover:bg-gray-50'
                              }`}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  {/* Header */}
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h3 className="font-semibold text-[#333333] leading-tight">
                                        {asset.compliance_assets.name}
                                      </h3>
                                      {asset.compliance_assets.description && (
                                        <p className="text-sm text-gray-600 mt-1">
                                          {asset.compliance_assets.description}
                                        </p>
                                      )}
                                    </div>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${status.color}`}
                                    >
                                      {status.label}
                                    </Badge>
                                  </div>

                                  {/* Status and Dates */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {asset.next_due_date && (
                                      <div className="flex items-center gap-1 text-sm text-gray-600">
                                        <CalendarDays className="h-4 w-4" />
                                        <span>
                                          {status.status === 'overdue' ? 'Overdue by ' : 'Due in '}
                                          {Math.abs(getDaysUntilDue(asset.next_due_date))} days
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* Frequency badge - using a default since it's not in the schema */}
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${getFrequencyColor('1 year')}`}
                                    >
                                      📆 1 year
                                    </Badge>
                                  </div>

                                  {/* Documents */}
                                  <div className="flex items-center gap-2">
                                    {latestDocument ? (
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => window.open(latestDocument.doc_url || '#', '_blank')}
                                          className="text-xs"
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          View Document
                                        </Button>
                                        <span className="text-xs text-gray-500">
                                          {new Date(latestDocument.uploaded_at || '').toLocaleDateString()}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                                                                 <Button
                                           variant="outline"
                                           size="sm"
                                           onClick={() => setSelectedAssetForUpload({
                                             id: asset.asset_id,
                                             name: asset.compliance_assets.name
                                           })}
                                           className="text-xs"
                                         >
                                           <Upload className="h-3 w-3 mr-1" />
                                           Upload Document
                                         </Button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Notes */}
                                  {asset.notes && (
                                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                      <strong>Notes:</strong> {asset.notes}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Empty State */}
          {Object.keys(filteredGroupedAssets).length === 0 && (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filter !== 'all' ? 'No matching compliance assets' : 'No compliance assets configured'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your search terms or filters.'
                  : 'Configure compliance requirements for this building to start tracking.'
                }
              </p>
              <div className="flex items-center justify-center gap-4">
                {(searchTerm || filter !== 'all') && (
                  <Button
                    onClick={() => {
                      setSearchTerm('')
                      setFilter('all')
                    }}
                    className="bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white"
                  >
                    Clear Filters
                  </Button>
                )}
                {!searchTerm && filter === 'all' && (
                  <Button
                    onClick={() => router.push(`/buildings/${complianceData.building.id}/compliance/setup`)}
                    className="bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white"
                  >
                    Setup Compliance
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

                 {/* Upload Compliance Modal */}
         {selectedAssetForUpload && (
           <UploadComplianceModal
             isOpen={!!selectedAssetForUpload}
             onClose={() => setSelectedAssetForUpload(null)}
             buildingId={complianceData.building.id}
             complianceAssetId={selectedAssetForUpload.id}
             assetName={selectedAssetForUpload.name}
           />
         )}
      </div>
    </TooltipProvider>
  )
} 