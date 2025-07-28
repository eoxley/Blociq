'use client'

import { useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, Clock, FileText, Upload, Calendar } from 'lucide-react'

interface ComplianceAsset {
  id: string
  name: string
  category: string | null
  status: string | null
  next_due_date: string | null
  last_updated: string | null
  created_at: string
}

interface ComplianceDocument {
  id: string
  asset_id: string
  document_name: string
  file_url: string | null
  uploaded_at: string
  created_at: string
}

interface ComplianceTrackerProps {
  complianceAssets: ComplianceAsset[]
  complianceDocuments: ComplianceDocument[]
  buildingId: string
}

export default function ComplianceTracker({ complianceAssets, complianceDocuments, buildingId }: ComplianceTrackerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<ComplianceAsset | null>(null)

  // Group assets by category
  const assetsByCategory = complianceAssets.reduce((acc, asset) => {
    const category = asset.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(asset)
    return acc
  }, {} as Record<string, ComplianceAsset[]>)

  // Get categories for filter
  const categories = Object.keys(assetsByCategory)

  // Filter assets based on selected category
  const filteredAssets = selectedCategory === 'all' 
    ? complianceAssets 
    : assetsByCategory[selectedCategory] || []

  // Get documents for an asset
  const getDocumentsForAsset = (assetId: string) => {
    return complianceDocuments.filter(doc => doc.asset_id === assetId)
  }

  // Get status badge
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'compliant':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Compliant
          </span>
        )
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Overdue
          </span>
        )
      case 'missing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Missing
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        )
    }
  }

  // Calculate days until due
  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="p-6">
      {/* Header with Filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      {/* Compliance Assets List */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {selectedCategory === 'all' ? 'No compliance items' : `No ${selectedCategory} items`}
          </h3>
          <p className="text-gray-600">
            {selectedCategory === 'all' 
              ? 'No compliance assets have been added to this building yet.' 
              : `No ${selectedCategory} compliance items found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssets.map((asset) => {
            const documents = getDocumentsForAsset(asset.id)
            const daysUntilDue = getDaysUntilDue(asset.next_due_date)
            const isOverdue = daysUntilDue !== null && daysUntilDue < 0
            const isDueSoon = daysUntilDue !== null && daysUntilDue <= 30 && daysUntilDue >= 0

            return (
              <div 
                key={asset.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Asset Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Shield className="h-5 w-5 text-teal-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{asset.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                          {asset.category && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {asset.category}
                            </span>
                          )}
                          {getStatusBadge(asset.status)}
                        </div>
                      </div>
                    </div>

                    {/* Due Date Information */}
                    {asset.next_due_date && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Due:</span>
                          <span className={`font-medium ${
                            isOverdue ? 'text-red-600' : 
                            isDueSoon ? 'text-yellow-600' : 'text-gray-900'
                          }`}>
                            {new Date(asset.next_due_date).toLocaleDateString()}
                          </span>
                          {daysUntilDue !== null && (
                            <span className={`text-xs ${
                              isOverdue ? 'text-red-600' : 
                              isDueSoon ? 'text-yellow-600' : 'text-gray-500'
                            }`}>
                              ({isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : 
                                isDueSoon ? `${daysUntilDue} days remaining` : 
                                `${daysUntilDue} days remaining`})
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Documents */}
                    {documents.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Documents</h4>
                        <div className="space-y-2">
                          {documents.map(doc => (
                            <div key={doc.id} className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <a 
                                href={doc.file_url || '#'} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                {doc.document_name}
                              </a>
                              <span className="text-xs text-gray-500">
                                {new Date(doc.uploaded_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Last Updated */}
                    {asset.last_updated && (
                      <div className="text-xs text-gray-500">
                        Last updated: {new Date(asset.last_updated).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="ml-4 flex flex-col gap-2">
                    <button 
                      onClick={() => {
                        setSelectedAsset(asset)
                        setShowUploadModal(true)
                      }}
                      className="flex items-center gap-2 px-3 py-1 text-sm text-teal-600 hover:text-teal-700 border border-teal-200 rounded hover:bg-teal-50 transition-colors"
                    >
                      <Upload className="h-3 w-3" />
                      Upload
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
                      <FileText className="h-3 w-3" />
                      View
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Upload Compliance Document
                </h2>
                <button 
                  onClick={() => {
                    setShowUploadModal(false)
                    setSelectedAsset(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {selectedAsset && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-600">Asset</p>
                    <p className="text-gray-900">{selectedAsset.name}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter document name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File
                  </label>
                  <input
                    type="file"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={() => {
                      setShowUploadModal(false)
                      setSelectedAsset(null)
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 