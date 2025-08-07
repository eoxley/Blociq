'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Save, 
  Building, 
  Settings,
  FileText,
  Download,
  Eye,
  Bell,
  Mail,
  Calendar,
  Shield,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Upload,
  Edit,
  Trash2,
  ExternalLink,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns'
import ComplianceDocumentUploader from '@/components/ComplianceDocumentUploader'
import { getBSAAssetsSummary } from '@/lib/bsaAssetAssignment'

interface BuildingComplianceViewProps {
  buildingId: string
  buildingName: string
}

interface ComplianceAsset {
  id: string
  name: string
  description: string
  category: string
  required_if: 'always' | 'if present' | 'if HRB'
  default_frequency: string
  applies: boolean
  last_checked: string | null
  next_due: string | null
  notes: string | null
  status: 'compliant' | 'overdue' | 'missing' | 'due_soon'
  documents?: ComplianceDocument[]
}

interface ComplianceDocument {
  id: string
  title: string
  document_type: string
  file_url: string
  file_size: number
  uploaded_at: string
  is_public: boolean
}

interface ComplianceSummary {
  total: number
  compliant: number
  overdue: number
  missing: number
  dueSoon: number
}

export default function BuildingComplianceView({ buildingId, buildingName }: BuildingComplianceViewProps) {
  const [assets, setAssets] = useState<ComplianceAsset[]>([])
  const [summary, setSummary] = useState<ComplianceSummary>({
    total: 0,
    compliant: 0,
    overdue: 0,
    missing: 0,
    dueSoon: 0
  })
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sendingReminders, setSendingReminders] = useState<Set<string>>(new Set())
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(new Set())
  const [bsaAssetsSummary, setBsaAssetsSummary] = useState<any>(null)

  useEffect(() => {
    loadComplianceData()
  }, [buildingId])

  const loadComplianceData = async () => {
    try {
      setLoading(true)
      
      // Fetch building compliance assets with documents
      const response = await fetch(`/api/compliance/building/${buildingId}?include_documents=true`)
      if (!response.ok) {
        throw new Error('Failed to fetch compliance data')
      }
      
      const data = await response.json()
      const complianceAssets = data.assets || []
      
      // Calculate status for each asset
      const assetsWithStatus = complianceAssets.map((asset: any) => ({
        ...asset,
        status: calculateAssetStatus(asset)
      }))
      
      setAssets(assetsWithStatus)
      
      // Calculate summary
      const summary = calculateSummary(assetsWithStatus)
      setSummary(summary)
      
      // Load BSA assets summary
      try {
        const bsaSummary = await getBSAAssetsSummary(buildingId)
        setBsaAssetsSummary(bsaSummary)
      } catch (bsaError) {
        console.warn('Could not load BSA assets summary:', bsaError)
      }
      
    } catch (error) {
      console.error('Error loading compliance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAssetStatus = (asset: any): 'compliant' | 'overdue' | 'missing' | 'due_soon' => {
    if (!asset.applies) return 'missing'
    if (!asset.next_due) return 'missing'
    
    const dueDate = new Date(asset.next_due)
    const today = new Date()
    
    if (isBefore(dueDate, today)) return 'overdue'
    if (isBefore(dueDate, addDays(today, 30))) return 'due_soon'
    return 'compliant'
  }

  const calculateSummary = (assets: ComplianceAsset[]): ComplianceSummary => {
    const total = assets.filter(asset => asset.applies).length
    const compliant = assets.filter(asset => asset.status === 'compliant').length
    const overdue = assets.filter(asset => asset.status === 'overdue').length
    const missing = assets.filter(asset => asset.status === 'missing').length
    const dueSoon = assets.filter(asset => asset.status === 'due_soon').length
    
    return { total, compliant, overdue, missing, dueSoon }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const sendReminder = async (assetId: string) => {
    try {
      setSendingReminders(prev => new Set(prev).add(assetId))
      
      const response = await fetch('/api/compliance/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building_id: buildingId,
          compliance_asset_id: assetId
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send reminder')
      }
      
      const result = await response.json()
      
      // Show success message with email details
      alert(`Reminder email sent successfully to ${result.email.to}!`)
      
    } catch (error) {
      console.error('Error sending reminder:', error)
      alert(`Failed to send reminder: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSendingReminders(prev => {
        const newSet = new Set(prev)
        newSet.delete(assetId)
        return newSet
      })
    }
  }

  const uploadDocument = async (assetId: string, file: File) => {
    try {
      setUploadingDocuments(prev => new Set(prev).add(assetId))
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('asset_id', assetId)
      formData.append('building_id', buildingId)
      formData.append('title', file.name)
      formData.append('document_type', 'Compliance Certificate')
      
      const response = await fetch('/api/compliance/documents/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload document')
      }
      
      // Reload data to show new document
      await loadComplianceData()
      
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Failed to upload document. Please try again.')
    } finally {
      setUploadingDocuments(prev => {
        const newSet = new Set(prev)
        newSet.delete(assetId)
        return newSet
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'overdue': return <XCircle className="h-5 w-5 text-red-600" />
      case 'missing': return <AlertTriangle className="h-5 w-5 text-gray-600" />
      case 'due_soon': return <Clock className="h-5 w-5 text-yellow-600" />
      default: return <AlertTriangle className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800 border-green-200'
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200'
      case 'missing': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'due_soon': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Safety': 'bg-red-50 border-red-200 text-red-700',
      'Fire': 'bg-orange-50 border-orange-200 text-orange-700',
      'Electrical': 'bg-yellow-50 border-yellow-200 text-yellow-700',
      'Gas': 'bg-blue-50 border-blue-200 text-blue-700',
      'Health': 'bg-green-50 border-green-200 text-green-700',
      'Structural': 'bg-gray-50 border-gray-200 text-gray-700',
      'Insurance': 'bg-purple-50 border-purple-200 text-purple-700',
      'Energy': 'bg-teal-50 border-teal-200 text-teal-700',
      'Equipment': 'bg-indigo-50 border-indigo-200 text-indigo-700'
    }
    return colors[category] || colors['Structural']
  }

  const filteredAssets = assets.filter(asset => {
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus
    const matchesSearch = (asset.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (asset.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    return matchesSearch && matchesStatus
  })

  const groupedAssets = filteredAssets.reduce((groups, asset) => {
    if (!groups[asset.category]) {
      groups[asset.category] = []
    }
    groups[asset.category].push(asset)
    return groups
  }, {} as Record<string, ComplianceAsset[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        <span className="ml-2 text-gray-600">Loading compliance data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link
            href="/buildings"
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{buildingName}</h1>
            <p className="mt-2 text-gray-600">Compliance Management</p>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Compliance Summary</h2>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" />
            <span className="text-sm text-gray-600">Last updated: {format(new Date(), 'MMM dd, yyyy HH:mm')}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-700">{summary.compliant}</div>
            <div className="text-sm text-green-600">Compliant</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-700">{summary.overdue}</div>
            <div className="text-sm text-red-600">Overdue</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">{summary.dueSoon}</div>
            <div className="text-sm text-yellow-600">Due Soon</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-700">{summary.missing}</div>
            <div className="text-sm text-gray-600">Missing</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{summary.total}</div>
            <div className="text-sm text-blue-600">Total</div>
          </div>
        </div>
        
        {/* Summary Text */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-medium">{summary.compliant} / {summary.total} Compliant</span>
            {summary.overdue > 0 && <span className="text-red-600"> | {summary.overdue} Overdue</span>}
            {summary.missing > 0 && <span className="text-gray-600"> | {summary.missing} Missing</span>}
          </p>
        </div>
      </div>

      {/* BSA Assets Section */}
      {bsaAssetsSummary && bsaAssetsSummary.total > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg shadow-sm border border-red-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-semibold text-red-900">Building Safety Act (BSA) Assets</h2>
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                HRB Required
              </span>
            </div>
            <div className="text-sm text-red-700">
              {bsaAssetsSummary.compliant} / {bsaAssetsSummary.total} Compliant
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-white rounded-lg border border-red-200">
              <div className="text-lg font-bold text-green-700">{bsaAssetsSummary.compliant}</div>
              <div className="text-xs text-green-600">Compliant</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-red-200">
              <div className="text-lg font-bold text-red-700">{bsaAssetsSummary.overdue}</div>
              <div className="text-xs text-red-600">Overdue</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-red-200">
              <div className="text-lg font-bold text-gray-700">{bsaAssetsSummary.missing}</div>
              <div className="text-xs text-gray-600">Missing</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-red-200">
              <div className="text-lg font-bold text-blue-700">{bsaAssetsSummary.total}</div>
              <div className="text-xs text-blue-600">Total BSA</div>
            </div>
          </div>
          
          <div className="text-sm text-red-700 bg-white p-3 rounded-lg border border-red-200">
            <p className="font-medium mb-1">BSA Compliance Assets:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {bsaAssetsSummary.assets?.map((asset: any) => (
                <li key={asset.id} className="flex items-center justify-between">
                  <span>{asset.compliance_items?.name || 'Unknown Asset'}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    asset.status === 'compliant' ? 'bg-green-100 text-green-800' :
                    asset.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {asset.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search compliance items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="compliant">Compliant</option>
            <option value="overdue">Overdue</option>
            <option value="due_soon">Due Soon</option>
            <option value="missing">Missing</option>
          </select>
        </div>
      </div>

      {/* Compliance Assets by Category */}
      <div className="space-y-4">
        {Object.entries(groupedAssets).map(([category, categoryAssets]) => (
          <div key={category} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(category)}`}>
                  {category}
                </div>
                <span className="text-sm text-gray-500">
                  {categoryAssets.length} item{categoryAssets.length !== 1 ? 's' : ''}
                </span>
              </div>
              {expandedCategories.has(category) ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            
            {expandedCategories.has(category) && (
              <div className="border-t border-gray-200">
                {categoryAssets.map((asset) => (
                  <div key={asset.id} className="p-6 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(asset.status)}
                          <h3 className="text-lg font-medium text-gray-900">{asset.name}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(asset.status)}`}>
                            {asset.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Frequency: {asset.default_frequency}</span>
                          {asset.last_checked && (
                            <span>Last checked: {format(new Date(asset.last_checked), 'MMM dd, yyyy')}</span>
                          )}
                          {asset.next_due && (
                            <span>Due: {format(new Date(asset.next_due), 'MMM dd, yyyy')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Documents Section */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Documents ({asset.documents?.length || 0})
                        </h4>
                        <ComplianceDocumentUploader
                          buildingId={buildingId}
                          assetId={asset.id}
                          onUploadComplete={loadComplianceData}
                          className="text-sm"
                        />
                      </div>
                      
                      {asset.documents && asset.documents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {asset.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{doc.title}</p>
                                <p className="text-xs text-gray-500">
                                  {doc.document_type} • {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <Eye className="h-3 w-3" />
                                </a>
                                <a
                                  href={doc.file_url}
                                  download
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <Download className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No documents uploaded</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {(asset.status === 'overdue' || asset.status === 'missing') && (
                        <button
                          onClick={() => sendReminder(asset.id)}
                          disabled={sendingReminders.has(asset.id)}
                          className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          {sendingReminders.has(asset.id) ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            <Bell className="h-3 w-3" />
                          )}
                          Send Reminder
                        </button>
                      )}
                      
                      <Link
                        href={`/compliance/buildings/${buildingId}/assets/${asset.id}/edit`}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                      >
                        <Edit className="h-3 w-3" />
                        Update
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance items found</h3>
          <p className="text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'No compliance items are currently configured for this building'
            }
          </p>
        </div>
      )}
    </div>
  )
} 