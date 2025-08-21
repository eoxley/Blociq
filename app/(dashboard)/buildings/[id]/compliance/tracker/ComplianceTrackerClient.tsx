'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, Clock, Calendar, Plus, Edit, FileText, Upload, Search, Filter, Download, Eye, Trash2, Brain, RefreshCw, PlusCircle } from 'lucide-react'
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
  
  // Joined data from compliance_assets table
  compliance_assets: {
    id: string
    name: string
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

interface ComplianceTrackerClientProps {
  building: Building
  complianceAssets: ComplianceAsset[]
}

export default function ComplianceTrackerClient({ building, complianceAssets }: ComplianceTrackerClientProps) {
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
    last_renewed_date: ''
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

  // Calculate statistics
  const stats = {
    total: complianceAssets.length,
    compliant: complianceAssets.filter(a => a.status === 'compliant').length,
    overdue: complianceAssets.filter(a => a.status === 'overdue').length,
    dueSoon: complianceAssets.filter(a => a.status === 'due_soon').length,
    pending: complianceAssets.filter(a => a.status === 'pending').length,
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

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800 border-green-200'
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200'
      case 'due_soon': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Get priority color based on days until due
  const getPriorityColor = (dueDate: string | undefined): string => {
    if (!dueDate) return 'bg-gray-100 text-gray-800'
    const daysUntilDue = getDaysUntilDue(dueDate)
    if (daysUntilDue < 0) return 'bg-red-100 text-red-800'
    if (daysUntilDue <= 30) return 'bg-yellow-100 text-yellow-800'
    if (daysUntilDue <= 90) return 'bg-orange-100 text-orange-800'
    return 'bg-green-100 text-green-800'
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
      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleDocumentUpload = async (assetId: string, file: File) => {
    if (!file) return

    setUploadingDocuments(prev => new Set(prev).add(assetId))

    try {
      // Upload file to Supabase storage
      const fileName = `${assetId}_${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('compliance-documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('compliance-documents')
        .getPublicUrl(fileName)

      // Create compliance document record
      const { error: docError } = await supabase
        .from('compliance_documents')
        .insert({
          building_id: building.id,
          compliance_asset_id: assetId,
          document_url: publicUrl,
          title: file.name,
          doc_type: file.type,
          created_at: new Date().toISOString()
        })

      if (docError) throw docError

      // Use AI to summarize the document
      await summarizeDocumentWithAI(assetId, publicUrl, file.name)

      toast.success('Document uploaded successfully')
      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Error uploading document:', error)
      toast.error('Failed to upload document')
    } finally {
      setUploadingDocuments(prev => {
        const newSet = new Set(prev)
        newSet.delete(assetId)
        return newSet
      })
    }
  }

  const summarizeDocumentWithAI = async (assetId: string, documentUrl: string, fileName: string) => {
    try {
      // Call Ask AI to summarize the document
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Please analyze and summarize this compliance document: ${fileName}. Extract key information including expiry dates, compliance status, and any action items required.`,
          building_id: building.id,
          context_type: 'document_analysis',
          document_ids: [assetId]
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update the document with AI summary
        await supabase
          .from('compliance_documents')
          .update({
            summary: result.response,
            extracted_date: new Date().toISOString()
          })
          .eq('building_id', building.id)
          .eq('compliance_asset_id', assetId)
          .eq('document_url', documentUrl)

        toast.success('Document analyzed with AI')
      }
    } catch (error) {
      console.error('Error summarizing document with AI:', error)
      // Don't show error to user as this is optional
    }
  }

  const toggleAssetExpansion = (assetId: string) => {
    const newExpanded = new Set(expandedAssets)
    if (newExpanded.has(assetId)) {
      newExpanded.delete(assetId)
    } else {
      newExpanded.add(assetId)
    }
    setExpandedAssets(newExpanded)
  }

  const startEditing = (asset: ComplianceAsset) => {
    setEditingAsset(asset.id)
    setEditForm({
      status: asset.status,
      notes: asset.notes || '',
      next_due_date: asset.next_due_date || '',
      last_renewed_date: asset.last_renewed_date || ''
    })
  }

  const saveEdit = async (assetId: string) => {
    try {
      const { error } = await supabase
        .from('building_compliance_assets')
        .update({
          status: editForm.status,
          notes: editForm.notes,
          next_due_date: editForm.next_due_date || null,
          last_renewed_date: editForm.last_renewed_date || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)

      if (error) throw error
      
      toast.success('Asset updated successfully')
      setEditingAsset(null)
      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Error updating asset:', error)
      toast.error('Failed to update asset')
    }
  }

  const cancelEdit = () => {
    setEditingAsset(null)
    setEditForm({
      status: '',
      notes: '',
      next_due_date: '',
      last_renewed_date: ''
    })
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href={`/buildings/${building.id}`}
            className="flex items-center gap-2 text-[#0F5D5D] hover:text-teal-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Building
          </Link>
        </div>
        
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">
            Compliance Tracker - {building.name}
          </h1>
          <p className="text-lg text-gray-600">
            Monitor and manage compliance requirements for this building
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search compliance assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="compliant">Compliant</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="due_soon">Due Soon</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Shield className="h-5 w-5 text-teal-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Compliant</p>
                <p className="text-2xl font-bold text-gray-900">{stats.compliant}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Due Soon</p>
                <p className="text-2xl font-bold text-gray-900">{stats.dueSoon}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.complianceRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Assets List */}
      <div className="space-y-4">
        {filteredAssets.map(asset => {
          const daysUntilDue = getDaysUntilDue(asset.next_due_date)
          const isExpanded = expandedAssets.has(asset.id)
          const isEditing = editingAsset === asset.id
          const hasDocuments = asset.compliance_documents && asset.compliance_documents.length > 0

          return (
            <BlocIQCard key={asset.id} className="overflow-hidden">
              <BlocIQCardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleAssetExpansion(asset.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {asset.compliance_assets.title}
                      </h3>
                      <BlocIQBadge className={getStatusColor(asset.status)}>
                        {asset.status.replace('_', ' ')}
                      </BlocIQBadge>
                      {asset.compliance_assets.is_required && (
                        <BlocIQBadge variant="destructive" className="text-xs">
                          Required
                        </BlocIQBadge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Category</div>
                      <div className="font-medium">{asset.compliance_assets.category}</div>
                    </div>
                    
                    {asset.next_due_date && (
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Next Due</div>
                        <div className={`font-medium ${getPriorityColor(asset.next_due_date)} px-2 py-1 rounded text-xs`}>
                          {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` :
                           daysUntilDue === 0 ? 'Due today' :
                           daysUntilDue === 1 ? 'Due tomorrow' :
                           `Due in ${daysUntilDue} days`}
                        </div>
                      </div>
                    )}
                    
                    {hasDocuments && (
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Documents</div>
                        <div className="font-medium text-blue-600">{asset.compliance_documents!.length}</div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <BlocIQButton
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          startEditing(asset)
                        }}
                        className="px-3 py-1"
                      >
                        <Edit className="h-4 w-4" />
                      </BlocIQButton>
                      
                      <BlocIQButton
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleAssetExpansion(asset.id)
                        }}
                        className="px-3 py-1"
                      >
                        {isExpanded ? <Eye className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </BlocIQButton>
                    </div>
                  </div>
                </div>
              </BlocIQCardHeader>

              {isExpanded && (
                <BlocIQCardContent className="p-0">
                  <div className="p-6 space-y-6">
                    {/* Asset Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Asset Information</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Description:</span>
                            <p className="text-gray-900">{asset.compliance_assets.description || 'No description available'}</p>
                          </div>
                          {asset.compliance_assets.frequency_months && (
                            <div>
                              <span className="font-medium text-gray-600">Frequency:</span>
                              <span className="text-gray-900"> Every {asset.compliance_assets.frequency_months} months</span>
                            </div>
                          )}
                          {asset.notes && (
                            <div>
                              <span className="font-medium text-gray-600">Notes:</span>
                              <p className="text-gray-900">{asset.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Compliance Status</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Status:</span>
                            <select
                              value={asset.status}
                              onChange={(e) => handleStatusUpdate(asset.id, e.target.value)}
                              className="px-3 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="pending">Pending</option>
                              <option value="compliant">Compliant</option>
                              <option value="overdue">Overdue</option>
                              <option value="due_soon">Due Soon</option>
                            </select>
                          </div>
                          
                          {asset.next_due_date && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Next Due:</span>
                              <span className="text-sm font-medium">{new Date(asset.next_due_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          
                          {asset.last_renewed_date && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Last Renewed:</span>
                              <span className="text-sm font-medium">{new Date(asset.last_renewed_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Document Upload */}
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Documents & Certificates</h4>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload New Document
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleDocumentUpload(asset.id, file)
                              }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#0F5D5D] file:text-white hover:file:bg-[#0A4A4A]"
                            disabled={uploadingDocuments.has(asset.id)}
                          />
                          {uploadingDocuments.has(asset.id) && (
                            <RefreshCw className="h-5 w-5 animate-spin text-[#0F5D5D]" />
                          )}
                        </div>
                      </div>

                      {/* Existing Documents */}
                      {hasDocuments && (
                        <div className="space-y-3">
                          <h5 className="font-medium text-gray-900">Uploaded Documents</h5>
                          {asset.compliance_documents!.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-gray-400" />
                                <div>
                                  <div className="font-medium text-sm">{doc.title}</div>
                                  <div className="text-xs text-gray-500">
                                    Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                                  </div>
                                  {doc.summary && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      <strong>AI Summary:</strong> {doc.summary.substring(0, 100)}...
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <a
                                  href={doc.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-gray-600 hover:text-[#0F5D5D] transition-colors"
                                >
                                  <Eye className="h-4 w-4" />
                                </a>
                                <a
                                  href={doc.document_url}
                                  download
                                  className="p-2 text-gray-600 hover:text-[#0F5D5D] transition-colors"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </BlocIQCardContent>
              )}
            </BlocIQCard>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance assets found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || selectedCategory !== 'all' || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'No compliance assets have been set up for this building yet'
            }
          </p>
          {!searchTerm && selectedCategory === 'all' && statusFilter === 'all' && (
            <Link
              href={`/buildings/${building.id}/compliance/setup`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F5D5D] text-white rounded-lg hover:bg-[#0A4A4A] transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Set Up Compliance Assets
            </Link>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Compliance Asset</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="compliant">Compliant</option>
                  <option value="overdue">Overdue</option>
                  <option value="due_soon">Due Soon</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
                  placeholder="Add notes about this compliance asset..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
                <input
                  type="date"
                  value={editForm.next_due_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, next_due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Renewed Date</label>
                <input
                  type="date"
                  value={editForm.last_renewed_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, last_renewed_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <BlocIQButton
                variant="outline"
                onClick={cancelEdit}
                className="flex-1"
              >
                Cancel
              </BlocIQButton>
              <BlocIQButton
                onClick={() => saveEdit(editingAsset)}
                className="flex-1"
              >
                Save Changes
              </BlocIQButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 