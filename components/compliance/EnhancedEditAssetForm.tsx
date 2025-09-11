'use client'

import React, { useState, useEffect } from 'react'
import { 
  Calendar,
  User,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Upload,
  Eye,
  Download,
  Trash2,
  Save,
  X,
  Loader2,
  Building,
  Shield,
  Edit3,
  Bot,
  ImageIcon,
  FilePlus,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import ComplianceDocumentUpload from './ComplianceDocumentUpload'

interface EnhancedEditAssetFormProps {
  buildingId: string
  assetId: string
  onClose: () => void
  onSaved: () => void
}

interface AssetData {
  id: string
  building_id: string
  compliance_asset_id: string
  status: string
  next_due_date: string | null
  last_carried_out: string | null
  inspector_provider: string | null
  certificate_reference: string | null
  override_reason: string | null
  document_count: number
  latest_upload_date: string | null
  notes: string | null
  contractor: string | null
  compliance_assets: {
    name: string
    category: string
    description: string
    frequency_months: number
  }
}

interface DocumentData {
  id: string
  original_filename: string
  file_type: string
  file_size: number
  upload_date: string
  document_type: string | null
  document_category: string | null
  ai_confidence_score: number | null
  processing_status: string
  file_path: string
  is_current_version: boolean
}

export default function EnhancedEditAssetForm({ 
  buildingId, 
  assetId, 
  onClose, 
  onSaved 
}: EnhancedEditAssetFormProps) {
  const [asset, setAsset] = useState<AssetData | null>(null)
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'upload'>('details')
  
  // Form state
  const [formData, setFormData] = useState({
    last_carried_out: '',
    next_due_date: '',
    inspector_provider: '',
    certificate_reference: '',
    override_reason: '',
    notes: '',
    contractor: ''
  })

  useEffect(() => {
    fetchAssetData()
  }, [assetId, buildingId])

  const fetchAssetData = async () => {
    try {
      setLoading(true)
      
      // Fetch asset data
      const assetResponse = await fetch(`/api/buildings/${buildingId}/compliance/assets/${assetId}`)
      if (!assetResponse.ok) throw new Error('Failed to fetch asset data')
      
      const assetData = await assetResponse.json()
      setAsset(assetData.asset)
      
      // Set form data
      setFormData({
        last_carried_out: assetData.asset.last_carried_out || '',
        next_due_date: assetData.asset.next_due_date || '',
        inspector_provider: assetData.asset.inspector_provider || '',
        certificate_reference: assetData.asset.certificate_reference || '',
        override_reason: assetData.asset.override_reason || '',
        notes: assetData.asset.notes || '',
        contractor: assetData.asset.contractor || ''
      })

      // Fetch documents for this asset
      const docsResponse = await fetch(`/api/compliance/documents?buildingId=${buildingId}&assetId=${assetId}`)
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData.documents || [])
      }

    } catch (error) {
      console.error('Error fetching asset data:', error)
      toast.error('Failed to load asset data')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!asset) return
    
    try {
      setSaving(true)
      
      // Validate required fields based on form changes
      let requiresOverrideReason = false
      if (formData.next_due_date && asset.next_due_date !== formData.next_due_date) {
        // Check if the date was manually changed (not auto-calculated)
        const autoCalculated = calculateNextDueDate(formData.last_carried_out, asset.compliance_assets.frequency_months)
        if (autoCalculated !== formData.next_due_date) {
          requiresOverrideReason = true
        }
      }

      if (requiresOverrideReason && !formData.override_reason.trim()) {
        toast.error('Override reason is required when manually changing the next due date')
        return
      }

      const response = await fetch(`/api/buildings/${buildingId}/compliance/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to update asset')

      toast.success('Asset updated successfully')
      onSaved()
      onClose()
    } catch (error) {
      console.error('Error saving asset:', error)
      toast.error('Failed to save asset changes')
    } finally {
      setSaving(false)
    }
  }

  const calculateNextDueDate = (lastCarriedOut: string, frequencyMonths: number): string => {
    if (!lastCarriedOut) return ''
    
    const lastDate = new Date(lastCarriedOut)
    const nextDate = new Date(lastDate)
    nextDate.setMonth(nextDate.getMonth() + frequencyMonths)
    
    return nextDate.toISOString().split('T')[0]
  }

  const handleLastCarriedOutChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      last_carried_out: value,
      next_due_date: value ? calculateNextDueDate(value, asset?.compliance_assets.frequency_months || 12) : prev.next_due_date
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-50 border-green-200'
      case 'overdue': return 'text-red-600 bg-red-50 border-red-200'
      case 'upcoming': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDocumentUploadComplete = (document: any) => {
    console.log('Document uploaded:', document)
    fetchAssetData() // Refresh data
    setActiveTab('documents') // Switch to documents tab
    toast.success('Document uploaded and processed successfully!')
  }

  const handleDownloadDocument = async (document: DocumentData) => {
    try {
      const response = await fetch(`/api/compliance/documents/${document.id}/download`)
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = document.original_filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download document')
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-lg font-medium text-gray-900">Loading asset data...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Asset Not Found</h3>
            <p className="text-gray-600 mb-4">Unable to load asset data. Please try again.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#004AAD] to-[#7209B7] text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold">{asset.compliance_assets.name}</h2>
                <p className="text-blue-100">{asset.compliance_assets.category} • {asset.compliance_assets.description}</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Status Badge */}
          <div className="mt-4 flex items-center gap-4">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white bg-opacity-20 backdrop-blur-sm`}>
              {asset.status === 'compliant' && <CheckCircle className="h-5 w-5" />}
              {asset.status === 'overdue' && <AlertTriangle className="h-5 w-5" />}
              {asset.status === 'upcoming' && <Clock className="h-5 w-5" />}
              <span className="capitalize font-medium">{asset.status}</span>
            </div>

            <div className="text-blue-100 text-sm">
              {asset.document_count} document{asset.document_count !== 1 ? 's' : ''}
              {asset.latest_upload_date && (
                <span> • Last upload: {format(new Date(asset.latest_upload_date), 'MMM d, yyyy')}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'details', label: 'Asset Details', icon: Edit3 },
              { id: 'documents', label: `Documents (${documents.length})`, icon: FileText },
              { id: 'upload', label: 'Upload Documents', icon: Upload }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Last Carried Out */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Last Carried Out
                  </label>
                  <input
                    type="date"
                    value={formData.last_carried_out}
                    onChange={(e) => handleLastCarriedOutChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Date when the inspection was completed</p>
                </div>

                {/* Next Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.next_due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, next_due_date: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-calculated: every {asset.compliance_assets.frequency_months} months
                  </p>
                </div>

                {/* Inspector/Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    Inspector/Provider
                  </label>
                  <input
                    type="text"
                    value={formData.inspector_provider}
                    onChange={(e) => setFormData(prev => ({ ...prev, inspector_provider: e.target.value }))}
                    placeholder="Inspector name or company"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-extracted from certificates</p>
                </div>

                {/* Certificate Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="inline h-4 w-4 mr-1" />
                    Certificate Reference
                  </label>
                  <input
                    type="text"
                    value={formData.certificate_reference}
                    onChange={(e) => setFormData(prev => ({ ...prev, certificate_reference: e.target.value }))}
                    placeholder="Certificate number or reference"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-extracted from documents</p>
                </div>
              </div>

              {/* Override Reason */}
              {formData.next_due_date && asset.next_due_date !== formData.next_due_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <AlertCircle className="inline h-4 w-4 mr-1 text-orange-500" />
                    Override Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.override_reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, override_reason: e.target.value }))}
                    placeholder="Explain why the next due date is different from the auto-calculated date..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-orange-600 mt-1">
                    Required when manually changing the next due date
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this compliance asset..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Contractor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="inline h-4 w-4 mr-1" />
                  Preferred Contractor
                </label>
                <input
                  type="text"
                  value={formData.contractor}
                  onChange={(e) => setFormData(prev => ({ ...prev, contractor: e.target.value }))}
                  placeholder="Preferred contractor or company for this asset"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
                  <p className="text-gray-600 mb-4">Upload compliance certificates, reports, or photos for this asset.</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Documents
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {documents.map(doc => (
                    <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {/* File Icon */}
                          <div className="flex-shrink-0 mt-1">
                            {doc.file_type.startsWith('image/') ? (
                              <ImageIcon className="h-8 w-8 text-blue-500" />
                            ) : (
                              <FileText className="h-8 w-8 text-red-500" />
                            )}
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900 truncate">{doc.original_filename}</h4>
                              {doc.is_current_version && (
                                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>{format(new Date(doc.upload_date), 'MMM d, yyyy')}</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                                doc.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                                doc.processing_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                doc.processing_status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {doc.processing_status === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
                                {doc.processing_status}
                              </span>
                            </div>

                            {/* AI Classification */}
                            {(doc.document_type || doc.document_category) && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                  <Bot className="h-3 w-3" />
                                  {doc.document_type || 'Classified'}
                                </span>
                                {doc.document_category && (
                                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {doc.document_category}
                                  </span>
                                )}
                                {doc.ai_confidence_score && (
                                  <span className="text-xs text-gray-500">
                                    {Math.round(doc.ai_confidence_score)}% confidence
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div>
              <ComplianceDocumentUpload
                buildingId={buildingId}
                assetId={assetId}
                assetName={asset.compliance_assets.name}
                onUploadComplete={handleDocumentUploadComplete}
                maxFiles={5}
                acceptedFileTypes={['.pdf', '.jpg', '.jpeg', '.png', '.webp']}
              />
            </div>
          )}
        </div>

        {/* Footer - Always visible to allow saving from any tab */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {activeTab === 'details' && '* Fields marked with asterisk are required'}
              {activeTab === 'documents' && `${documents.length} document${documents.length !== 1 ? 's' : ''} uploaded`}
              {activeTab === 'upload' && 'Upload compliance certificates, reports, or photos'}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Asset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}