'use client'

import React, { useState } from 'react'
import { Shield, AlertTriangle, Clock, CheckCircle, Filter, Settings, Calendar, CheckSquare, BarChart3 } from 'lucide-react'
import ComplianceDashboard from './ComplianceDashboard'
import { 
  ComplianceAsset, 
  getComplianceStatus, 
  getStatusBadgeColor, 
  calculateNextDueDate 
} from '../../../lib/complianceUtils'

interface ComplianceClientProps {
  complianceAssets: ComplianceAsset[]
}

export default function ComplianceClient({ complianceAssets: initialAssets = [] }: ComplianceClientProps) {
  const [assets, setAssets] = useState<ComplianceAsset[]>(initialAssets || [])
  const [filter, setFilter] = useState<'all' | 'always' | 'if present' | 'if HRB'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'setup'>('grid')

  // Filter assets based on search and filter
  const filteredAssets = (assets || []).filter(asset => {
    const matchesSearch = (asset.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (asset.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || asset.required_if === filter
    return matchesSearch && matchesFilter
  })

  // State management functions
  const toggleAsset = (assetId: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId 
        ? { ...asset, applies: !asset.applies }
        : asset
    ))
  }

  const updateLastChecked = (assetId: string, date: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId 
        ? { 
            ...asset, 
            last_checked: date,
            next_due: date ? calculateNextDueDate(date, asset.default_frequency) : ''
          }
        : asset
    ))
  }

  const updateNextDue = (assetId: string, date: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId 
        ? { ...asset, next_due: date }
        : asset
    ))
  }

  // Enhanced color coding functions
  const getRequirementBadge = (requiredIf: string) => {
    const config = {
      'always': { color: 'bg-red-100 text-red-800 border-red-200', text: 'Always Required' },
      'if present': { color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'If Present' },
      'if HRB': { color: 'bg-purple-100 text-purple-800 border-purple-200', text: 'HRB Only' }
    }
    
    const configItem = config[requiredIf as keyof typeof config] || config['if present']
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${configItem.color}`}>
        {configItem.text}
      </span>
    )
  }

  const getCategoryColor = (category: string) => {
    const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
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
    
    return categoryColors[category] || categoryColors['Structural']
  }

  const getFrequencyColor = (frequency: string) => {
    const frequencyColors: Record<string, string> = {
      '6 months': 'text-orange-600',
      '1 year': 'text-blue-600',
      '2 years': 'text-green-600',
      '3 years': 'text-purple-600',
      '5 years': 'text-indigo-600',
      '10 years': 'text-gray-600'
    }
    return frequencyColors[frequency] || 'text-gray-600'
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Compliant': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      'Due Soon': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
      'Overdue': { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
      'In Progress': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
      'Not Started': { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Clock },
      'Not Applicable': { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Shield }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Not Started']
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    )
  }

  const getPriorityIndicator = (asset: ComplianceAsset) => {
    const status = getComplianceStatus(asset)
    const isHighPriority = asset.required_if === 'always' || status === 'Overdue' || status === 'Due Soon'
    
    if (isHighPriority) {
      return (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header with Dashboard */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Management</h1>
          <p className="text-gray-600">Track and manage building compliance requirements</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'grid' 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setViewMode('setup')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'setup' 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Settings className="h-4 w-4 inline mr-2" />
            Setup
          </button>
        </div>
      </div>

      {/* Dashboard */}
      <ComplianceDashboard assets={assets} />

      {viewMode === 'grid' ? (
        <>
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search compliance items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white shadow-sm"
              />
              <Shield className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white shadow-sm"
              >
                <option value="all">All Requirements</option>
                <option value="always">Always Required</option>
                <option value="if present">If Present</option>
                <option value="if HRB">HRB Only</option>
              </select>
            </div>
          </div>

          {/* Search Results Info */}
          {searchTerm && (
            <div className="text-sm text-gray-600">
              {filteredAssets.length === 0 ? (
                <p>No compliance items found matching "{searchTerm}"</p>
              ) : (
                <p>Showing {filteredAssets.length} of {(assets || []).length} compliance items</p>
              )}
            </div>
          )}

          {/* Compliance Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => {
              const status = getComplianceStatus(asset)
              const categoryColors = getCategoryColor(asset.category)
              const priorityIndicator = getPriorityIndicator(asset)
              
              return (
                <div
                  key={asset.id}
                  className={`relative bg-white rounded-lg shadow-md border overflow-hidden hover:shadow-lg transition-all duration-200 ${categoryColors.border}`}
                >
                  {priorityIndicator}
                  
                  {/* Category Header */}
                  <div className={`px-4 py-2 ${categoryColors.bg} border-b ${categoryColors.border}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${categoryColors.text}`}>
                        {asset.category}
                      </span>
                      {getRequirementBadge(asset.required_if)}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                        {asset.name}
                      </h3>
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                      {asset.description}
                    </p>
                    
                    {/* Status and Frequency */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm font-medium ${getFrequencyColor(asset.default_frequency)}`}>
                            {asset.default_frequency}
                          </span>
                        </div>
                        {getStatusBadge(status)}
                      </div>
                      
                      {asset.applies && (
                        <div className="text-xs text-gray-500 space-y-1">
                          {asset.last_checked && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Last checked: {new Date(asset.last_checked).toLocaleDateString()}
                            </div>
                          )}
                          {asset.next_due && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-blue-500" />
                              Next due: {new Date(asset.next_due).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Action Button */}
                    <div className="mt-4">
                      <button 
                        onClick={() => {
                          toggleAsset(asset.id)
                          setViewMode('setup')
                        }}
                        className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
                          asset.applies 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-teal-600 text-white hover:bg-teal-700'
                        }`}
                      >
                        {asset.applies ? 'Update Tracking' : 'Start Tracking'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* No Results Message */}
          {searchTerm && filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matching compliance items</h3>
              <p className="text-gray-500">
                Try adjusting your search terms or browse all compliance items.
              </p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}
        </>
      ) : (
        /* Building Compliance Setup View */
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Building Compliance Setup</h2>

          {assets.map((asset) => {
            const categoryColors = getCategoryColor(asset.category)
            const status = getComplianceStatus(asset)
            
            return (
              <div key={asset.id} className={`flex items-start justify-between py-4 px-4 rounded-lg border ${categoryColors.border} ${categoryColors.bg}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium text-gray-900">{asset.name}</p>
                    {getRequirementBadge(asset.required_if)}
                    {getStatusBadge(status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className={`font-medium ${getFrequencyColor(asset.default_frequency)}`}>
                      Frequency: {asset.default_frequency}
                    </span>
                    <span className={`font-medium ${categoryColors.text}`}>
                      Category: {asset.category}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={asset.applies}
                      onChange={() => toggleAsset(asset.id)}
                      className="accent-teal-600"
                    />
                    Applies
                  </label>

                  {asset.applies && (
                    <div className="flex flex-col gap-2">
                      <input
                        type="date"
                        value={asset.last_checked || ''}
                        onChange={(e) => updateLastChecked(asset.id, e.target.value)}
                        className="text-xs border px-2 py-1 rounded bg-white"
                        placeholder="Last checked"
                      />
                      <input
                        type="date"
                        value={asset.next_due || ''}
                        onChange={(e) => updateNextDue(asset.id, e.target.value)}
                        className="text-xs border px-2 py-1 rounded bg-white"
                        placeholder="Next due"
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
} 