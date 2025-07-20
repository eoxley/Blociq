'use client'

import React, { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, Clock, Upload, Bell, ArrowLeft, FileText, Calendar } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { getActiveComplianceAssets, ActiveComplianceAsset } from '../../lib/complianceUtils'
import SmartUploader from '../../components/SmartUploader'

interface BuildingComplianceDetailProps {
  buildingId: number
  buildingName: string
  onBack: () => void
}

export default function BuildingComplianceDetail({ buildingId, buildingName, onBack }: BuildingComplianceDetailProps) {
  const [assets, setAssets] = useState<ActiveComplianceAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadBuildingAssets()
  }, [buildingId])

  const loadBuildingAssets = async () => {
    try {
      setLoading(true)
      const activeAssets = await getActiveComplianceAssets(supabase, buildingId.toString())
      setAssets(activeAssets)
    } catch (error) {
      console.error('Error loading building assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
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
      case 'due_soon':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Due Soon
          </span>
        )
      case 'missing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Shield className="h-3 w-3 mr-1" />
            Missing
          </span>
        )
      default:
        return null
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Safety': return 'border-red-200 bg-red-50'
      case 'Electrical': return 'border-yellow-200 bg-yellow-50'
      case 'Gas': return 'border-orange-200 bg-orange-50'
      case 'Health': return 'border-green-200 bg-green-50'
      case 'Insurance': return 'border-blue-200 bg-blue-50'
      case 'Structural': return 'border-purple-200 bg-purple-50'
      case 'Equipment': return 'border-gray-200 bg-gray-50'
      case 'Energy': return 'border-teal-200 bg-teal-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getDaysUntilDue = (dateString: string | null) => {
    if (!dateString) return null
    const dueDate = new Date(dateString)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleUploadSuccess = () => {
    setUploadingAsset(null)
    loadBuildingAssets() // Refresh the data
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  const compliantCount = assets.filter(asset => asset.status === 'compliant').length
  const overdueCount = assets.filter(asset => asset.status === 'overdue').length
  const missingCount = assets.filter(asset => asset.status === 'missing').length
  const dueSoonCount = assets.filter(asset => asset.status === 'due_soon').length
  const complianceRate = assets.length > 0 ? Math.round((compliantCount / assets.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Buildings
            </button>
            <h2 className="text-xl font-semibold text-gray-900">{buildingName} - Compliance Details</h2>
            <p className="text-gray-600 mt-1">Manage compliance assets and upload documents</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              complianceRate >= 90 ? 'bg-green-100 text-green-800' :
              complianceRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {complianceRate}% Compliant
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Compliant</p>
              <p className="text-2xl font-bold text-gray-900">{compliantCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{overdueCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Due Soon</p>
              <p className="text-2xl font-bold text-gray-900">{dueSoonCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Missing</p>
              <p className="text-2xl font-bold text-gray-900">{missingCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assets.map((asset) => {
          const daysUntilDue = getDaysUntilDue(asset.expiry_date)
          const isOverdue = daysUntilDue !== null && daysUntilDue < 0
          const isDueSoon = daysUntilDue !== null && daysUntilDue <= 30 && daysUntilDue >= 0

          return (
            <div key={asset.asset_type} className={`p-6 rounded-lg border ${getCategoryColor(asset.category)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{asset.title}</h3>
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusBadge(asset.status)}
                    {asset.required && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Category: {asset.category} • Frequency: {asset.frequency}
                  </p>
                </div>
              </div>

              {/* Document Info */}
              <div className="space-y-3 mb-4">
                {asset.last_doc_date && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="h-4 w-4 mr-2" />
                    <span>Last document: {formatDate(asset.last_doc_date)}</span>
                  </div>
                )}
                
                {asset.expiry_date && (
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className={isOverdue ? 'text-red-600 font-medium' : isDueSoon ? 'text-yellow-600 font-medium' : 'text-gray-600'}>
                      {isOverdue ? 'Overdue by ' : 'Due in '}
                      {isOverdue ? Math.abs(daysUntilDue!) : daysUntilDue}
                      {isOverdue ? ' days' : ' days'}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setUploadingAsset(asset.asset_type)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload Document
                </button>
                
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                  <Bell className="h-4 w-4 mr-1" />
                  Set Reminder
                </button>
              </div>

              {/* Upload Modal */}
              {uploadingAsset === asset.asset_type && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Upload Document for {asset.title}</h4>
                  <SmartUploader
                    table="compliance_docs"
                    buildingId={buildingId}
                    docTypePreset={asset.asset_type}
                    onSaveSuccess={handleUploadSuccess}
                  />
                  <button
                    onClick={() => setUploadingAsset(null)}
                    className="mt-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {assets.length === 0 && (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance assets configured</h3>
          <p className="text-gray-500">Set up compliance assets for this building to start tracking.</p>
        </div>
      )}
    </div>
  )
} 