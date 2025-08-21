'use client'

import React, { useState, useEffect } from 'react'
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
  ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import SmartUploader from '@/components/SmartUploader'
import { toast } from 'sonner'
import { groupBy } from 'lodash'

interface ComplianceAsset {
  id: string
  name: string
  description: string | null
  category: string | null
  required_if?: string
  default_frequency?: string
}

interface BuildingComplianceAsset {
  id: string
  building_id: number
  asset_id: string
  status: string
  notes: string | null
  next_due_date: string | null
  last_updated: string
}

interface ComplianceDocument {
  id: string
  file_name: string
  file_url: string
  type: string | null
  created_at: string | null
  classification?: string | null
  summary?: string | null
  extracted_text?: string | null
}

interface Building {
  id: string
  name: string
  address: string | null
  unit_count: number | null
  building_age?: string | null
  construction_type?: string | null
  total_floors: string | null
  lift_available: string | null
  fire_safety_status: string | null
  asbestos_status: string | null
  energy_rating: string | null
  building_insurance_provider: string | null
  building_insurance_expiry: string | null
}

interface ComplianceData {
  building: Building
  assets: ComplianceAsset[]
  buildingAssets: BuildingComplianceAsset[]
  complianceDocuments: ComplianceDocument[]
  statusMap: Record<string, string>
  statusDatesMap: Record<string, string>
  notesMap: Record<string, string>
  statistics: {
    total: number
    tracked: number
    compliant: number
    overdue: number
    dueSoon: number
  }
}

interface BuildingComplianceClientProps {
  complianceData: ComplianceData
}

export default function BuildingComplianceClient({ complianceData }: BuildingComplianceClientProps) {
  const [filter, setFilter] = useState<'all' | 'overdue' | 'due-soon' | 'compliant' | 'missing'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [showUploader, setShowUploader] = useState(false)
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [editingAsset, setEditingAsset] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    status: string
    next_due_date: string
    notes: string
  }>({
    status: '',
    next_due_date: '',
    notes: ''
  })

  // Group assets by category
  const groupedAssets = groupBy(complianceData.assets, 'category')

  // Filter assets based on search and filter
  const filteredAssets = complianceData.assets.filter(asset => {
            const matchesSearch = asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (asset.description && asset.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const status = complianceData.statusMap[asset.id] || 'Missing'
    const matchesFilter = filter === 'all' || 
                         (filter === 'overdue' && status === 'Overdue') ||
                         (filter === 'due-soon' && status === 'Due Soon') ||
                         (filter === 'compliant' && status === 'Compliant') ||
                         (filter === 'missing' && status === 'Missing')
    
    return matchesSearch && matchesFilter
  })

  // Get status for an asset
  const getAssetStatus = (assetId: string) => {
    const status = complianceData.statusMap[assetId] || 'Missing'
    const nextDue = complianceData.statusDatesMap[assetId]
    
    if (status === 'Compliant') return 'Compliant'
    if (status === 'Overdue') return 'Overdue'
    if (nextDue) {
      const dueDate = new Date(nextDue)
      const today = new Date()
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysUntilDue < 0) return 'Overdue'
      if (daysUntilDue <= 30) return 'Due Soon'
      return 'Compliant'
    }
    
    return 'Missing'
  }

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const config = {
      'Compliant': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      'Due Soon': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      'Overdue': { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
      'Missing': { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: X }
    }
    
    const configItem = config[status as keyof typeof config] || config['Missing']
    const Icon = configItem.icon
    
    return (
      <BlocIQBadge variant="outline" className={`${configItem.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </BlocIQBadge>
    )
  }

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      'Safety': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
      'Fire': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
      'Electrical': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
      'Gas': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
      'Health': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
      'Structural': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
      'Insurance': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
      'Energy': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
      'Equipment': { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' }
    }
    
    return colors[category] || colors['Structural']
  }

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Handle document upload
  const handleUploadComplete = async (document: any) => {
    toast.success(`Document uploaded successfully for ${selectedAsset ? 'compliance item' : 'building'}`)
    setShowUploader(false)
    setSelectedAsset(null)
    setUploadingAsset(null)
    
    // Refresh the page to show new documents
    window.location.reload()
  }

  // Handle asset status update
  const handleStatusUpdate = async (assetId: string) => {
    try {
      const { error } = await supabase
        .from('building_compliance_assets')
        .upsert({
          building_id: parseInt(complianceData.building.id),
          asset_id: assetId,
          status: editForm.status,
          next_due_date: editForm.next_due_date || null,
          notes: editForm.notes || null,
          last_updated: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Compliance status updated successfully')
      setEditingAsset(null)
      setEditForm({ status: '', next_due_date: '', notes: '' })
      
      // Refresh the page
      window.location.reload()
    } catch (error) {
      console.error('Error updating compliance status:', error)
      toast.error('Failed to update compliance status')
    }
  }

  // Get documents for an asset
  const getAssetDocuments = (assetId: string) => {
    return complianceData.complianceDocuments.filter(doc => 
      doc.classification?.toLowerCase().includes(assetId.toLowerCase()) ||
      doc.file_name.toLowerCase().includes(assetId.toLowerCase())
    )
  }

  // Calculate days until due
  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with BlocIQ Gradient Background */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Compliance Tracker</h1>
                <p className="text-white/90 text-lg">{complianceData.building.name}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BlocIQButton
              onClick={() => setShowUploader(true)}
              variant="outline"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </BlocIQButton>
            <BlocIQButton
              onClick={() => window.location.href = `/buildings/${complianceData.building.id}/compliance/setup`}
              variant="outline"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Setup
            </BlocIQButton>
          </div>
        </div>
      </div>

      {/* Removed statistics cards section */}

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search compliance items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent bg-white shadow-sm"
          />
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-[#64748B]" />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-[#64748B]" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent bg-white shadow-sm"
          >
            <option value="all">All Items</option>
            <option value="overdue">Overdue</option>
            <option value="due-soon">Due Soon</option>
            <option value="compliant">Compliant</option>
            <option value="missing">Missing</option>
          </select>
        </div>
      </div>

      {/* Compliance Categories */}
      <div className="space-y-6">
        {Object.entries(groupedAssets).map(([category, assets]) => {
          const categoryAssets = assets.filter(asset => 
            filteredAssets.some(filtered => filtered.id === asset.id)
          )
          
          if (categoryAssets.length === 0) return null
          
          const isExpanded = expandedCategories.has(category)
          const categoryColors = getCategoryColor(category)
          
          return (
            <BlocIQCard key={category} variant="elevated">
              <BlocIQCardHeader 
                className={`${categoryColors.bg} border-b ${categoryColors.border} cursor-pointer`}
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className={`text-xl font-bold ${categoryColors.text}`}>{category}</h2>
                    <BlocIQBadge variant="outline" className={`${categoryColors.border} ${categoryColors.text}`}>
                      {categoryAssets.length} items
                    </BlocIQBadge>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-[#64748B]" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-[#64748B]" />
                  )}
                </div>
              </BlocIQCardHeader>
              
              {isExpanded && (
                <BlocIQCardContent className="p-6">
                  <div className="space-y-4">
                    {categoryAssets.map((asset) => {
                      const status = getAssetStatus(asset.id)
                      const nextDue = complianceData.statusDatesMap[asset.id]
                      const notes = complianceData.notesMap[asset.id]
                      const documents = getAssetDocuments(asset.id)
                      const isEditing = editingAsset === asset.id
                      
                      return (
                        <div key={asset.id} className="bg-[#FAFAFA] rounded-xl p-4 border border-[#E2E8F0]">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-[#333333]">{asset.title}</h3>
                                {getStatusBadge(status)}
                              </div>
                              
                              {asset.description && (
                                <p className="text-sm text-[#64748B] mb-3">{asset.description}</p>
                              )}
                              
                              {/* Status and Due Date */}
                              <div className="flex items-center gap-4 text-sm text-[#64748B] mb-3">
                                {nextDue && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>Due: {new Date(nextDue).toLocaleDateString()}</span>
                                    {status === 'Due Soon' && (
                                      <BlocIQBadge variant="warning" size="sm">
                                        {getDaysUntilDue(nextDue)} days
                                      </BlocIQBadge>
                                    )}
                                    {status === 'Overdue' && (
                                      <BlocIQBadge variant="destructive" size="sm">
                                        {Math.abs(getDaysUntilDue(nextDue))} days overdue
                                      </BlocIQBadge>
                                    )}
                                  </div>
                                )}
                                
                                {asset.default_frequency && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>Frequency: {asset.default_frequency}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Notes */}
                              {notes && (
                                <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] mb-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <MessageSquare className="h-3 w-3 text-[#008C8F]" />
                                    <span className="text-xs font-medium text-[#333333]">Notes:</span>
                                  </div>
                                  <p className="text-sm text-[#64748B]">{notes}</p>
                                </div>
                              )}
                              
                              {/* Documents */}
                              {documents.length > 0 && (
                                <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] mb-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-3 w-3 text-[#008C8F]" />
                                    <span className="text-xs font-medium text-[#333333]">Documents:</span>
                                  </div>
                                  <div className="space-y-2">
                                    {documents.slice(0, 3).map((doc) => (
                                      <div key={doc.id} className="flex items-center justify-between text-xs bg-[#F3F4F6] p-2 rounded border">
                                        <span className="truncate flex-1">{doc.file_name}</span>
                                        <div className="flex items-center gap-1">
                                          <BlocIQButton
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(doc.file_url, '_blank')}
                                          >
                                            <Eye className="h-3 w-3" />
                                          </BlocIQButton>
                                          <BlocIQButton
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              const link = document.createElement('a')
                                              link.href = doc.file_url
                                              link.download = doc.file_name
                                              link.click()
                                            }}
                                          >
                                            <Download className="h-3 w-3" />
                                          </BlocIQButton>
                                        </div>
                                      </div>
                                    ))}
                                    {documents.length > 3 && (
                                      <p className="text-xs text-[#64748B]">+{documents.length - 3} more documents</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <BlocIQButton
                                    size="sm"
                                    onClick={() => handleStatusUpdate(asset.id)}
                                  >
                                    <Save className="h-4 w-4" />
                                  </BlocIQButton>
                                  <BlocIQButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingAsset(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </BlocIQButton>
                                </>
                              ) : (
                                <>
                                  <BlocIQButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingAsset(asset.id)
                                      setEditForm({
                                        status: complianceData.statusMap[asset.id] || '',
                                        next_due_date: complianceData.statusDatesMap[asset.id] || '',
                                        notes: complianceData.notesMap[asset.id] || ''
                                      })
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </BlocIQButton>
                                  <BlocIQButton
                                    size="sm"
                                    onClick={() => {
                                      setSelectedAsset(asset.id)
                                      setShowUploader(true)
                                    }}
                                  >
                                    <Upload className="h-4 w-4" />
                                  </BlocIQButton>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Edit Form */}
                          {isEditing && (
                            <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] mt-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-[#333333] mb-1">Status</label>
                                  <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F]"
                                  >
                                    <option value="">Select Status</option>
                                    <option value="Compliant">Compliant</option>
                                    <option value="Due Soon">Due Soon</option>
                                    <option value="Overdue">Overdue</option>
                                    <option value="Missing">Missing</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-[#333333] mb-1">Next Due Date</label>
                                  <input
                                    type="date"
                                    value={editForm.next_due_date}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, next_due_date: e.target.value }))}
                                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F]"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-[#333333] mb-1">Notes</label>
                                  <input
                                    type="text"
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Optional notes..."
                                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F]"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </BlocIQCardContent>
              )}
            </BlocIQCard>
          )
        })}
      </div>

      {/* SmartUploader Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#333333]">
                Upload Compliance Document
              </h2>
              <BlocIQButton
                variant="outline"
                size="sm"
                onClick={() => setShowUploader(false)}
              >
                <X className="h-4 w-4" />
              </BlocIQButton>
            </div>
            
            <SmartUploader
              buildingId={complianceData.building.id}
              documentType="compliance"
              onUploadComplete={handleUploadComplete}
              onUploadError={(error) => toast.error(error)}
              multiple={true}
              acceptedFileTypes={['.pdf', '.doc', '.docx', '.txt']}
              maxFileSize={25}
              showPreview={true}
              autoClassify={true}
              allowUnlinked={false}
              customStoragePath={`compliance/${complianceData.building.id}`}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-[#F3F4F6] to-gray-200 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Shield className="h-8 w-8 text-[#64748B]" />
          </div>
          <h3 className="text-lg font-medium text-[#333333] mb-2">No compliance items found</h3>
          <p className="text-[#64748B] mb-4">
            {searchTerm 
              ? `No items match "${searchTerm}" with the current filter.`
              : 'No compliance items match the current filter.'
            }
          </p>
          <div className="flex gap-3 justify-center">
            <BlocIQButton
              onClick={() => {
                setSearchTerm('')
                setFilter('all')
              }}
              size="sm"
            >
              Clear Filters
            </BlocIQButton>
            <BlocIQButton
              variant="outline"
              size="sm"
              onClick={() => setShowUploader(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </BlocIQButton>
          </div>
        </div>
      )}
    </div>
  )
} 