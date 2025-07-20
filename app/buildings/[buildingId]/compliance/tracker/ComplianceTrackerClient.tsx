'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, Clock, Calendar, Plus, Edit, FileText, Upload } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ActiveComplianceAsset, getStatusColor, getStatusBadgeColor, getDaysUntilDue, formatDate } from '@/lib/complianceUtils'

interface ComplianceTrackerClientProps {
  building: any
  complianceAssets: ActiveComplianceAsset[]
}

export default function ComplianceTrackerClient({ building, complianceAssets }: ComplianceTrackerClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClientComponentClient()

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(complianceAssets.map(asset => asset.category)))]

  // Filter assets by category and search
  const filteredAssets = complianceAssets.filter(asset => {
    const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory
    const matchesSearch = asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.asset_type.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Calculate statistics
  const stats = {
    total: complianceAssets.length,
    compliant: complianceAssets.filter(a => a.status === 'compliant').length,
    overdue: complianceAssets.filter(a => a.status === 'overdue').length,
    dueSoon: complianceAssets.filter(a => a.status === 'due_soon').length,
    missing: complianceAssets.filter(a => a.status === 'missing').length,
    complianceRate: complianceAssets.length > 0 
      ? Math.round((complianceAssets.filter(a => a.status === 'compliant').length / complianceAssets.length) * 100)
      : 0
  }

  const handleStatusUpdate = async (assetId: string, newStatus: string) => {
    // TODO: Implement status update logic
    console.log('Update status for asset:', assetId, 'to:', newStatus)
  }

  const handleUploadDocument = async (assetId: string) => {
    // TODO: Implement document upload logic
    console.log('Upload document for asset:', assetId)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href={`/buildings/${building.id}`}
            className="flex items-center gap-2 text-[#0F5D5D] hover:text-teal-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Building
          </Link>
        </div>
        
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">
            Compliance Tracker - {building.name}
          </h1>
          <p className="text-lg text-gray-600">
            Monitor and manage compliance requirements for this building
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Shield className="h-6 w-6 text-teal-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Compliant</p>
              <p className="text-2xl font-bold text-gray-900">{stats.compliant}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Due Soon</p>
              <p className="text-2xl font-bold text-gray-900">{stats.dueSoon}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.complianceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Category Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search compliance items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Compliance Assets List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Compliance Items</h2>
        </div>

        {filteredAssets.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredAssets.map((asset) => {
              const daysUntilDue = asset.expiry_date ? getDaysUntilDue(asset.expiry_date) : null
              const isOverdue = daysUntilDue !== null && daysUntilDue < 0
              const isDueSoon = daysUntilDue !== null && daysUntilDue <= 30 && daysUntilDue >= 0

              return (
                <div key={asset.asset_type} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{asset.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(asset.status === 'compliant' ? 'Compliant' : asset.status === 'overdue' ? 'Overdue' : asset.status === 'missing' ? 'Not Started' : asset.status === 'due_soon' ? 'Due Soon' : 'Not Started')}`}>
                          {asset.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {asset.required && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            REQUIRED
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Category:</span> {asset.category}
                        </div>
                        <div>
                          <span className="font-medium">Frequency:</span> {asset.frequency}
                        </div>
                        <div>
                          <span className="font-medium">Last Updated:</span> {asset.last_doc_date ? formatDate(asset.last_doc_date) : 'Never'}
                        </div>
                      </div>

                      {asset.expiry_date && (
                        <div className="mt-3 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm font-medium ${
                            isOverdue ? 'text-red-600' : 
                            isDueSoon ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'Valid'} - 
                            Expires: {formatDate(asset.expiry_date)}
                            {daysUntilDue !== null && (
                              <span className="ml-2">
                                ({daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days remaining`})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleUploadDocument(asset.asset_type)}
                        className="flex items-center gap-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
                        title="Upload document"
                      >
                        <Upload className="h-4 w-4" />
                        Upload
                      </button>
                      
                      <button
                        onClick={() => handleStatusUpdate(asset.asset_type, 'compliant')}
                        className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        title="Update status"
                      >
                        <Edit className="h-4 w-4" />
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance items found</h3>
            <p className="text-gray-500">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your filters or search terms.'
                : 'No compliance items have been configured for this building yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
            <Plus className="h-5 w-5 mr-2" />
            Add Compliance Item
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Review Overdue Items
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <FileText className="h-5 w-5 mr-2" />
            Generate Report
          </button>
        </div>
      </div>
    </div>
  )
} 