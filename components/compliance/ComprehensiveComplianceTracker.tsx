'use client'

import React, { useState, useEffect } from 'react'
import { 
  Calendar, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Bell, 
  RefreshCw,
  Download,
  Eye,
  Edit3,
  Upload,
  Plus,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  HardHat,
  Building2,
  Zap,
  Flame,
  Wrench,
  Car,
  TreePine,
  Users,
  FileCheck,
  CalendarCheck,
  AlertCircle,
  Info,
  TrendingUp,
  BarChart3
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { toast } from 'sonner'

interface ComplianceAsset {
  id: string
  building_id: string
  compliance_asset_id: string
  status: 'pending' | 'compliant' | 'overdue' | 'due_soon'
  notes?: string
  next_due_date?: string
  last_renewed_date?: string
  latest_document_id?: string
  created_at: string
  updated_at: string
  contractor?: string
  frequency_months?: number
  
  // Joined data from compliance_assets table
  compliance_assets: {
    id: string
    title: string
    category: string
    description?: string
    frequency_months?: number
    is_required?: boolean
  }
  
  // Joined data from compliance_documents table
  compliance_documents?: Array<{
    id: string
    title: string
    document_url: string
    summary?: string
    extracted_date?: string
    doc_type?: string
    created_at: string
  }>
}

interface Building {
  id: string
  name: string
  address?: string
}

interface ComprehensiveComplianceTrackerProps {
  building: Building
  complianceAssets: ComplianceAsset[]
  onRefresh: () => void
}

const categoryIcons: Record<string, any> = {
  "Fire Safety": Flame,
  "Gas Safety": Zap,
  "Electrical": Zap,
  "Structural": Building2,
  "Construction": HardHat,
  "HRB": Shield,
  "Environmental": TreePine,
  "Accessibility": Users,
  "Security": Shield,
  "Maintenance": Wrench,
  "Transport": Car,
  "Other": FileText
}

export default function ComprehensiveComplianceTracker({ 
  building, 
  complianceAssets, 
  onRefresh 
}: ComprehensiveComplianceTrackerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set())
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(new Set())
  const [editingAsset, setEditingAsset] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    status: '',
    notes: '',
    next_due_date: '',
    last_renewed_date: '',
    contractor: ''
  })

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(complianceAssets.map(asset => asset.compliance_assets.category)))]

  // Filter assets by category, search, and status
  const filteredAssets = complianceAssets.filter(asset => {
    const matchesCategory = selectedCategory === 'all' || asset.compliance_assets.category === selectedCategory
    const matchesSearch = !searchTerm || 
      asset.compliance_assets.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.compliance_assets.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter
    
    return matchesCategory && matchesSearch && matchesStatus
  })

  // Calculate comprehensive statistics
  const stats = {
    total: complianceAssets.length,
    compliant: complianceAssets.filter(a => a.status === 'compliant').length,
    overdue: complianceAssets.filter(a => a.status === 'overdue').length,
    dueSoon: complianceAssets.filter(a => a.status === 'due_soon').length,
    pending: complianceAssets.filter(a => a.status === 'pending').length,
    missing: complianceAssets.filter(a => !a.next_due_date && !a.last_renewed_date).length,
    complianceRate: complianceAssets.length > 0 
      ? Math.round((complianceAssets.filter(a => a.status === 'compliant').length / complianceAssets.length) * 100)
      : 0
  }

  // Calculate days until due
  const getDaysUntilDue = (dueDate: string | undefined): number => {
    if (!dueDate) return 999
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Get status color and priority
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800 border-green-200'
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200'
      case 'due_soon': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (dueDate: string | undefined): string => {
    if (!dueDate) return 'bg-gray-100 text-gray-800'
    const daysUntilDue = getDaysUntilDue(dueDate)
    if (daysUntilDue < 0) return 'bg-red-100 text-red-800'
    if (daysUntilDue <= 30) return 'bg-yellow-100 text-yellow-800'
    if (daysUntilDue <= 90) return 'bg-orange-100 text-orange-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusLabel = (status: string, dueDate?: string): string => {
    if (status === 'overdue') return 'Overdue'
    if (status === 'due_soon') return 'Due Soon'
    if (status === 'compliant') return 'Compliant'
    if (status === 'pending') return 'Pending'
    
    // Auto-calculate status based on due date
    if (dueDate) {
      const daysUntilDue = getDaysUntilDue(dueDate)
      if (daysUntilDue < 0) return 'Overdue'
      if (daysUntilDue <= 30) return 'Due Soon'
      if (daysUntilDue <= 90) return 'Due Later'
      return 'Compliant'
    }
    
    return 'Pending'
  }

  const handleStatusUpdate = async (assetId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('building_compliance_assets')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)

      if (error) throw error
      
      toast.success('Status updated successfully')
      onRefresh()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleAssetUpdate = async (assetId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('building_compliance_assets')
        .update({ 
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)

      if (error) throw error
      
      toast.success('Asset updated successfully')
      onRefresh()
    } catch (error) {
      console.error('Error updating asset:', error)
      toast.error('Failed to update asset')
    }
  }

  const toggleExpanded = (assetId: string) => {
    setExpandedAssets(prev => {
      const newSet = new Set(prev)
      if (newSet.has(assetId)) {
        newSet.delete(assetId)
      } else {
        newSet.add(assetId)
      }
      return newSet
    })
  }

  const startEditing = (asset: ComplianceAsset) => {
    setEditingAsset(asset.id)
    setEditForm({
      status: asset.status,
      notes: asset.notes || '',
      next_due_date: asset.next_due_date || '',
      last_renewed_date: asset.last_renewed_date || '',
      contractor: asset.contractor || ''
    })
  }

  const saveEdit = async (assetId: string) => {
    try {
      await handleAssetUpdate(assetId, editForm)
      setEditingAsset(null)
      setEditForm({
        status: '',
        notes: '',
        next_due_date: '',
        last_renewed_date: '',
        contractor: ''
      })
    } catch (error) {
      console.error('Error saving edit:', error)
    }
  }

  const cancelEdit = () => {
    setEditingAsset(null)
    setEditForm({
      status: '',
      notes: '',
      next_due_date: '',
      contractor: ''
    })
  }

  // Group assets by category for better organization
  const groupedAssets = filteredAssets.reduce((acc, asset) => {
    const category = asset.compliance_assets.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(asset)
    return acc
  }, {} as Record<string, ComplianceAsset[]>)

  return (
    <div className="space-y-6">
      {/* Comprehensive Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Compliant</p>
              <p className="text-2xl font-bold text-green-600">{stats.compliant}</p>
              <p className="text-xs text-gray-500">{stats.complianceRate}% rate</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Due Soon</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.dueSoon}</p>
              <p className="text-xs text-gray-500">Next 30 days</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              <p className="text-xs text-gray-500">Action required</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="compliant">Compliant</option>
                <option value="pending">Pending</option>
                <option value="due_soon">Due Soon</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Compliance Assets by Category */}
      <div className="space-y-6">
        {Object.entries(groupedAssets).map(([category, assets]) => {
          const IconComponent = categoryIcons[category] || FileText
          const categoryStats = {
            total: assets.length,
            compliant: assets.filter(a => a.status === 'compliant').length,
            overdue: assets.filter(a => a.status === 'overdue').length,
            dueSoon: assets.filter(a => a.status === 'due_soon').length
          }

          return (
            <BlocIQCard key={category} className="overflow-hidden">
              <BlocIQCardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{category}</h3>
                      <p className="text-sm text-gray-600">
                        {categoryStats.total} assets • {categoryStats.compliant} compliant • {categoryStats.overdue} overdue
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BlocIQBadge variant={categoryStats.overdue > 0 ? 'destructive' : 'default'}>
                      {categoryStats.overdue > 0 ? `${categoryStats.overdue} overdue` : 'All good'}
                    </BlocIQBadge>
                  </div>
                </div>
              </BlocIQCardHeader>

              <BlocIQCardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {assets.map((asset) => {
                    const daysUntilDue = getDaysUntilDue(asset.next_due_date)
                    const isOverdue = daysUntilDue < 0
                    const isDueSoon = daysUntilDue <= 30 && daysUntilDue >= 0
                    const isExpanded = expandedAssets.has(asset.id)
                    const isEditing = editingAsset === asset.id

                    return (
                      <div key={asset.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {asset.compliance_assets.title}
                              </h4>
                              <BlocIQBadge 
                                variant={
                                  asset.status === 'overdue' || isOverdue ? 'destructive' :
                                  asset.status === 'due_soon' || isDueSoon ? 'secondary' :
                                  asset.status === 'compliant' ? 'default' : 'outline'
                                }
                              >
                                {getStatusLabel(asset.status, asset.next_due_date)}
                              </BlocIQBadge>
                              {asset.compliance_assets.is_required && (
                                <BlocIQBadge variant="destructive">Required</BlocIQBadge>
                              )}
                            </div>
                            
                            {asset.compliance_assets.description && (
                              <p className="text-gray-600 mb-3">
                                {asset.compliance_assets.description}
                              </p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">Last Renewed:</span>
                                <span className="font-medium">
                                  {asset.last_renewed_date 
                                    ? new Date(asset.last_renewed_date).toLocaleDateString('en-GB')
                                    : 'Not set'
                                  }
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <CalendarCheck className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">Next Due:</span>
                                <span className={`font-medium ${
                                  isOverdue ? 'text-red-600' : 
                                  isDueSoon ? 'text-yellow-600' : 'text-gray-900'
                                }`}>
                                  {asset.next_due_date 
                                    ? new Date(asset.next_due_date).toLocaleDateString('en-GB')
                                    : 'Not set'
                                  }
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">Days Left:</span>
                                <span className={`font-medium ${
                                  isOverdue ? 'text-red-600' : 
                                  isDueSoon ? 'text-yellow-600' : 'text-gray-900'
                                }`}>
                                  {isOverdue ? `${Math.abs(daysUntilDue)} overdue` :
                                   daysUntilDue === 999 ? 'Not set' :
                                   `${daysUntilDue} days`}
                                </span>
                              </div>
                            </div>

                            {asset.notes && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700">
                                  <strong>Notes:</strong> {asset.notes}
                                </p>
                              </div>
                            )}

                            {asset.contractor && (
                              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                                <Users className="h-4 w-4" />
                                <span>Contractor: {asset.contractor}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <BlocIQButton
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExpanded(asset.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              {isExpanded ? 'Less' : 'More'}
                            </BlocIQButton>
                            
                            <BlocIQButton
                              variant="outline"
                              size="sm"
                              onClick={() => startEditing(asset)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </BlocIQButton>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Status Management */}
                              <div>
                                <h5 className="font-medium text-gray-900 mb-3">Status Management</h5>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Status
                                    </label>
                                    <select
                                      value={asset.status}
                                      onChange={(e) => handleStatusUpdate(asset.id, e.target.value)}
                                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="compliant">Compliant</option>
                                      <option value="due_soon">Due Soon</option>
                                      <option value="overdue">Overdue</option>
                                    </select>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Next Due Date
                                    </label>
                                    <input
                                      type="date"
                                      value={asset.next_due_date || ''}
                                      onChange={(e) => handleAssetUpdate(asset.id, { next_due_date: e.target.value })}
                                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Documents */}
                              <div>
                                <h5 className="font-medium text-gray-900 mb-3">Documents</h5>
                                <div className="space-y-3">
                                  {asset.compliance_documents && asset.compliance_documents.length > 0 ? (
                                    asset.compliance_documents.map((doc) => (
                                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-gray-500" />
                                          <span className="text-sm font-medium">{doc.title}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <BlocIQButton
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(doc.document_url, '_blank')}
                                          >
                                            <Eye className="h-4 w-4" />
                                          </BlocIQButton>
                                          <BlocIQButton
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(doc.document_url, '_blank')}
                                          >
                                            <Download className="h-4 w-4" />
                                          </BlocIQButton>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-6 text-gray-500">
                                      <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                      <p className="text-sm">No documents uploaded</p>
                                      <BlocIQButton
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                        onClick={() => {/* TODO: Implement document upload */}}
                                      >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload Document
                                      </BlocIQButton>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Edit Form Overlay */}
                        {isEditing && (
                          <div className="mt-4 pt-4 border-t border-gray-100 bg-blue-50 p-4 rounded-lg">
                            <h5 className="font-medium text-gray-900 mb-3">Edit Asset Details</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Notes
                                </label>
                                <textarea
                                  value={editForm.notes}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  rows={3}
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Contractor
                                </label>
                                <input
                                  type="text"
                                  value={editForm.contractor}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, contractor: e.target.value }))}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Last Renewed Date
                                </label>
                                <input
                                  type="date"
                                  value={editForm.last_renewed_date}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, last_renewed_date: e.target.value }))}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Next Due Date
                                </label>
                                <input
                                  type="date"
                                  value={editForm.next_due_date}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, next_due_date: e.target.value }))}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-4">
                              <BlocIQButton
                                size="sm"
                                onClick={() => saveEdit(asset.id)}
                              >
                                Save Changes
                              </BlocIQButton>
                              <BlocIQButton
                                variant="outline"
                                size="sm"
                                onClick={cancelEdit}
                              >
                                Cancel
                              </BlocIQButton>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </BlocIQCardContent>
            </BlocIQCard>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredAssets.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No compliance assets found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || selectedCategory !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters or search terms.'
              : 'No compliance assets have been set up for this building yet.'
            }
          </p>
          {!searchTerm && selectedCategory === 'all' && statusFilter === 'all' && (
            <BlocIQButton
              onClick={() => {/* TODO: Open setup modal */}}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Setup Compliance Assets
            </BlocIQButton>
          )}
        </div>
      )}
    </div>
  )
}
