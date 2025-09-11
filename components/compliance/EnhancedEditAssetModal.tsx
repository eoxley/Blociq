'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  X,
  Calendar,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  Save,
  RefreshCw,
  Sparkles,
  Building,
  Shield,
  Edit3
} from 'lucide-react'
import { toast } from 'sonner'
import ComplianceDocumentUpload from './ComplianceDocumentUpload'

interface EnhancedEditAssetModalProps {
  isOpen: boolean
  onClose: () => void
  buildingId: string
  assetId: string | null
  asset?: any
  onSave?: (updatedAsset: any) => void
}

interface AssetData {
  id?: string
  building_compliance_asset_id?: string
  compliance_asset_id: string
  building_id: string
  
  // Enhanced fields
  last_carried_out?: string
  next_due_date?: string
  inspector_provider?: string
  certificate_reference?: string
  status?: string
  notes?: string
  contractor?: string
  
  // Auto-calculated
  compliance_status?: string
  override_reason?: string
  document_count?: number
  latest_upload_date?: string
  
  // Asset details
  asset_name?: string
  category?: string
  frequency_months?: number
  description?: string
}

const EnhancedEditAssetModal: React.FC<EnhancedEditAssetModalProps> = ({
  isOpen,
  onClose,
  buildingId,
  assetId,
  asset,
  onSave
}) => {
  
  const [formData, setFormData] = useState<AssetData>({
    compliance_asset_id: '',
    building_id: buildingId
  })
  
  const [originalNextDue, setOriginalNextDue] = useState<string>('')
  const [showOverrideReason, setShowOverrideReason] = useState(false)
  const [loading, setLoading] = useState(false)
  const [availableAssets, setAvailableAssets] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchAvailableAssets()
      if (assetId) {
        fetchAssetData()
      } else {
        resetForm()
      }
    }
  }, [isOpen, assetId, buildingId])

  useEffect(() => {
    // Auto-calculate next due date when last_carried_out or frequency changes
    if (formData.last_carried_out && formData.frequency_months) {
      const lastDate = new Date(formData.last_carried_out)
      const nextDate = new Date(lastDate)
      nextDate.setMonth(nextDate.getMonth() + formData.frequency_months)
      
      const calculatedDue = nextDate.toISOString().split('T')[0]
      
      if (!showOverrideReason && calculatedDue !== formData.next_due_date) {
        setFormData(prev => ({ ...prev, next_due_date: calculatedDue }))
      }
    }
  }, [formData.last_carried_out, formData.frequency_months, showOverrideReason])

  useEffect(() => {
    // Auto-calculate compliance status based on due date
    if (formData.next_due_date) {
      const dueDate = new Date(formData.next_due_date)
      const today = new Date()
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      let status = 'compliant'
      if (daysDiff < 0) {
        status = 'overdue'
      } else if (daysDiff <= 30) {
        status = 'upcoming'
      }
      
      if (status !== formData.compliance_status) {
        setFormData(prev => ({ ...prev, compliance_status: status }))
      }
    }
  }, [formData.next_due_date])

  const resetForm = () => {
    setFormData({
      compliance_asset_id: '',
      building_id: buildingId
    })
    setOriginalNextDue('')
    setShowOverrideReason(false)
  }

  const fetchAvailableAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('compliance_assets')
        .select('id, name, category, description, frequency_months')
        .order('category')
        .order('name')

      if (error) throw error
      setAvailableAssets(data || [])
    } catch (error) {
      console.error('Error fetching available assets:', error)
      // Removed toast notification to avoid user confusion
    }
  }

  const fetchAssetData = async () => {
    if (!assetId) return

    try {
      setLoading(true)
      
      const response = await fetch(`/api/compliance/assets/${assetId}?buildingId=${buildingId}`)
      
      console.log('🔍 [Modal] Asset fetch response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 [Modal] Asset fetch error:', errorText);
        throw new Error(`Failed to fetch asset data: ${response.status} ${errorText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch asset data')
      }

      const { asset, documents } = result
      
      const assetData = {
        id: asset.bca_id,
        building_compliance_asset_id: asset.bca_id,
        compliance_asset_id: asset.asset_id,
        building_id: asset.building_id,
        last_carried_out: asset.last_carried_out,
        next_due_date: asset.next_due_date,
        inspector_provider: asset.inspector_provider,
        certificate_reference: asset.certificate_reference,
        status: asset.status,
        notes: asset.notes,
        contractor: asset.contractor,
        override_reason: asset.override_reason,
        document_count: asset.document_count || 0,
        latest_upload_date: asset.latest_upload_date,
        
        // Asset details
        asset_name: asset.asset_name,
        category: asset.category,
        frequency_months: asset.frequency_months,
        description: asset.description
      }

      setFormData(assetData)
      setOriginalNextDue(asset.next_due_date || '')
      setDocuments(documents || [])
      
    } catch (error) {
      console.error('Error fetching asset data:', error)
      // Removed toast notification - handled gracefully in UI
    } finally {
      setLoading(false)
    }
  }

  // fetchDocuments is now handled in fetchAssetData

  const handleAssetChange = (assetId: string) => {
    const selectedAsset = availableAssets.find(a => a.id === assetId)
    if (selectedAsset) {
      setFormData(prev => ({
        ...prev,
        compliance_asset_id: assetId,
        asset_name: selectedAsset.name,
        category: selectedAsset.category,
        frequency_months: selectedAsset.frequency_months,
        description: selectedAsset.description
      }))
    }
  }

  const handleNextDueDateChange = (newDate: string) => {
    const isOverride = newDate !== originalNextDue && originalNextDue
    setShowOverrideReason(isOverride && !formData.id) // Only show for existing assets
    setFormData(prev => ({ ...prev, next_due_date: newDate }))
  }

  const handleSave = async () => {
    // Enhanced validation
    if (!formData.compliance_asset_id) {
      toast.error('Please select a compliance asset')
      return
    }

    if (!formData.last_carried_out) {
      toast.error('Last Carried Out date is required')
      return
    }

    if (!formData.next_due_date) {
      toast.error('Next Due Date is required')
      return
    }

    // Validate date logic
    if (formData.last_carried_out && formData.next_due_date) {
      const lastDate = new Date(formData.last_carried_out)
      const nextDate = new Date(formData.next_due_date)
      
      if (nextDate <= lastDate) {
        toast.error('Next Due Date must be after Last Carried Out date')
        return
      }
    }

    try {
      setLoading(true)

      const saveData = {
        buildingId,
        status: formData.compliance_status || formData.status || 'not_applied',
        lastRenewedDate: formData.last_renewed_date || null,
        lastCarriedOut: formData.last_carried_out || null,
        nextDueDate: formData.next_due_date || null,
        notes: formData.notes || null,
        contractor: formData.contractor || null,
        inspectorProvider: formData.inspector_provider || null,
        certificateReference: formData.certificate_reference || null,
        overrideReason: showOverrideReason ? formData.override_reason || null : null,
        frequencyMonths: formData.frequency_months
      }

      let response
      if (assetId) {
        // Update existing asset - use the building-specific endpoint
        response = await fetch(`/api/compliance/building/${buildingId}/assets/${assetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: saveData.status,
            notes: saveData.notes,
            next_due_date: saveData.nextDueDate,
            last_renewed_date: saveData.lastRenewedDate,
            last_carried_out: saveData.lastCarriedOut,
            inspector_provider: saveData.inspectorProvider,
            certificate_reference: saveData.certificateReference,
            contractor: saveData.contractor,
            override_reason: saveData.overrideReason,
            frequency_months: saveData.frequencyMonths
          })
        })
      } else {
        // Create new asset - would need separate endpoint
        response = await fetch('/api/compliance/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...saveData,
            complianceAssetId: formData.compliance_asset_id
          })
        })
      }

      console.log('🔍 [Modal] Asset save response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 [Modal] Asset save error:', errorText);
        throw new Error(`Failed to save asset: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      
      console.log('🔍 [Modal] Asset save result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save asset')
      }

      toast.success(assetId ? 'Asset updated successfully' : 'Asset created successfully')
      onSave?.(result.asset)
      onClose()
    } catch (error) {
      console.error('Error saving asset:', error)
      toast.error('Failed to save asset')
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentUploadComplete = (document: any) => {
    // Refresh the asset data to get updated document count
    if (assetId) {
      fetchAssetData()
    }
    
    // Auto-populate fields from AI extraction if available
    if (document.extractedData) {
      const extracted = document.extractedData
      
      setFormData(prev => ({
        ...prev,
        last_carried_out: prev.last_carried_out || extracted.inspectionDate,
        next_due_date: prev.next_due_date || extracted.nextDueDate,
        inspector_provider: prev.inspector_provider || 
          (extracted.inspectorCompany 
            ? `${extracted.inspectorName || ''} (${extracted.inspectorCompany})`
            : extracted.inspectorName
          ),
        certificate_reference: prev.certificate_reference || extracted.certificateNumber
      }))
      
      toast.success('Asset fields updated from document AI analysis', {
        description: 'Review and confirm the extracted information'
      })
    }
  }

  if (!isOpen) return null

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-50 border-green-200'
      case 'overdue': return 'text-red-600 bg-red-50 border-red-200'
      case 'upcoming': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-white/20 min-h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {assetId ? 'Edit Compliance Asset' : 'Add Compliance Asset'}
              </h2>
              <p className="text-sm text-gray-600">
                {formData.asset_name && `${formData.asset_name} • `}
                Enhanced document management with AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
            {/* Left Column - Asset Details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-blue-500" />
                  Asset Information
                </h3>

                {/* Asset Selection */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Compliance Asset *
                    </label>
                    <select
                      value={formData.compliance_asset_id}
                      onChange={(e) => handleAssetChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loading}
                    >
                      <option value="">Select asset type...</option>
                      {availableAssets.map(asset => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name} ({asset.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.description && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">{formData.description}</p>
                    </div>
                  )}

                  {/* Enhanced Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Carried Out
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          value={formData.last_carried_out || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, last_carried_out: e.target.value }))}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Next Due Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          value={formData.next_due_date || ''}
                          onChange={(e) => handleNextDueDateChange(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      {formData.frequency_months && (
                        <p className="text-xs text-gray-500 mt-1">
                          Auto-calculated every {formData.frequency_months} months
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inspector/Provider
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.inspector_provider || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, inspector_provider: e.target.value }))}
                        placeholder="Inspector name and company"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certificate Reference
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.certificate_reference || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, certificate_reference: e.target.value }))}
                        placeholder="Certificate or reference number"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Compliance Status Display */}
                  {formData.compliance_status && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Compliance Status (Auto-calculated)
                      </label>
                      <div className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border ${getStatusColor(formData.compliance_status)}`}>
                        {formData.compliance_status === 'compliant' && <CheckCircle className="h-4 w-4 mr-2" />}
                        {formData.compliance_status === 'overdue' && <AlertCircle className="h-4 w-4 mr-2" />}
                        {formData.compliance_status === 'upcoming' && <Clock className="h-4 w-4 mr-2" />}
                        {formData.compliance_status.charAt(0).toUpperCase() + formData.compliance_status.slice(1)}
                      </div>
                    </div>
                  )}

                  {/* Override Reason */}
                  {showOverrideReason && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Override Reason *
                      </label>
                      <textarea
                        value={formData.override_reason || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, override_reason: e.target.value }))}
                        placeholder="Explain why the due date was manually changed..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes or comments..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Document Management */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-500" />
                    Documents ({documents.length})
                  </h3>
                  <button
                    onClick={() => setShowDocumentUpload(!showDocumentUpload)}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </button>
                </div>

                {/* Document Upload */}
                {showDocumentUpload && assetId && (
                  <div className="mb-6">
                    <ComplianceDocumentUpload
                      buildingId={buildingId}
                      assetId={assetId}
                      assetName={formData.asset_name}
                      onUploadComplete={handleDocumentUploadComplete}
                      maxFiles={5}
                    />
                  </div>
                )}

                {/* Document List */}
                <div className="space-y-3">
                  {documents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-2">No documents uploaded yet</p>
                      <p className="text-sm text-gray-500">
                        Upload compliance certificates and supporting documents
                      </p>
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.original_filename}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-gray-500">
                              {new Date(doc.upload_date).toLocaleDateString()}
                            </p>
                            {doc.document_type && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                                🤖 {doc.document_type}
                              </span>
                            )}
                          </div>
                        </div>
                        {doc.is_current_version && (
                          <span className="text-xs text-green-600 font-medium">Current</span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Document Stats */}
                {formData.document_count !== undefined && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm font-medium">Document Summary</span>
                    </div>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>{formData.document_count} document{formData.document_count !== 1 ? 's' : ''} uploaded</p>
                      {formData.latest_upload_date && (
                        <p>Latest: {new Date(formData.latest_upload_date).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100 flex-shrink-0 shadow-lg">
          <div className="text-sm text-gray-600">
            <div>* Fields marked with asterisk are required</div>
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500 mt-1">
                Debug: Asset ID: {formData.compliance_asset_id ? '✓' : '✗'}, 
                Last Carried Out: {formData.last_carried_out ? '✓' : '✗'}, 
                Next Due: {formData.next_due_date ? '✓' : '✗'}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !formData.compliance_asset_id || !formData.last_carried_out || !formData.next_due_date}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl"
              title={!formData.compliance_asset_id ? 'Please select a compliance asset' : 
                     !formData.last_carried_out ? 'Please enter last carried out date' :
                     !formData.next_due_date ? 'Please enter next due date' : 'Save changes'}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {assetId ? 'Update Asset' : 'Create Asset'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedEditAssetModal