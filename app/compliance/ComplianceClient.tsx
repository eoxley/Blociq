'use client'

import React, { useState } from 'react'
import { Shield, AlertTriangle, Clock, CheckCircle, Filter, Settings, Calendar, CheckSquare, BarChart3 } from 'lucide-react'
import ComplianceDashboard from './ComplianceDashboard'
import { 
  ComplianceAsset, 
  getComplianceStatus, 
  getStatusBadgeColor, 
  calculateNextDueDate 
} from '../../lib/complianceUtils'

interface ComplianceClientProps {
  complianceAssets: ComplianceAsset[]
}

export default function ComplianceClient({ complianceAssets: initialAssets }: ComplianceClientProps) {
  const [assets, setAssets] = useState<ComplianceAsset[]>(initialAssets)
  const [filter, setFilter] = useState<'all' | 'always' | 'if present' | 'if HRB'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'dashboard' | 'grid' | 'setup'>('dashboard')

  // Filter assets based on search and filter
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.description.toLowerCase().includes(searchTerm.toLowerCase())
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

  const getRequirementBadge = (requiredIf: string) => {
    switch (requiredIf) {
      case 'always':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Always Required
          </span>
        )
      case 'if present':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            If Present
          </span>
        )
      case 'if HRB':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Shield className="h-3 w-3 mr-1" />
            HRB Only
          </span>
        )
      default:
        return null
    }
  }

  const getFrequencyColor = (frequency: string) => {
    if (frequency.includes('6 months')) return 'text-orange-600'
    if (frequency.includes('1 year')) return 'text-green-600'
    if (frequency.includes('3 years')) return 'text-blue-600'
    if (frequency.includes('5 years')) return 'text-purple-600'
    return 'text-gray-600'
  }

  const getStatusBadge = (status: string) => {
    return <span className={`px-2 py-1 text-xs rounded-md ${getStatusBadgeColor(status as any)}`}>
      {status}
    </span>
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance assets found</h3>
        <p className="text-gray-500">Compliance assets will appear here once configured.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'dashboard' 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'grid' 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Shield className="h-4 w-4 inline mr-2" />
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

      {viewMode === 'dashboard' ? (
        <ComplianceDashboard assets={assets} />
      ) : viewMode === 'grid' ? (
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
                <p>Showing {filteredAssets.length} of {assets.length} compliance items</p>
              )}
            </div>
          )}

          {/* Compliance Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => {
              const status = getComplianceStatus(asset)
              return (
                <div
                  key={asset.id}
                  className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                        {asset.name}
                      </h3>
                      {getRequirementBadge(asset.required_if)}
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
                            <div>Last checked: {new Date(asset.last_checked).toLocaleDateString()}</div>
                          )}
                          {asset.next_due && (
                            <div>Next due: {new Date(asset.next_due).toLocaleDateString()}</div>
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
                        className="w-full px-3 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
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

          {assets.map((asset) => (
            <div key={asset.id} className="flex items-start justify-between py-2 border-b gap-4">
              <div>
                <p className="font-medium">{asset.name}</p>
                <p className="text-sm text-gray-500">{asset.description}</p>
                <p className="text-xs text-gray-400 mt-1">Frequency: {asset.default_frequency}</p>
                {getRequirementBadge(asset.required_if)}
              </div>

              <div className="flex flex-col items-end gap-1">
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
                  <>
                    <input
                      type="date"
                      value={asset.last_checked || ''}
                      onChange={(e) => updateLastChecked(asset.id, e.target.value)}
                      className="text-xs border px-2 py-1 rounded"
                      placeholder="Last checked"
                    />
                    <input
                      type="date"
                      value={asset.next_due || ''}
                      onChange={(e) => updateNextDue(asset.id, e.target.value)}
                      className="text-xs border px-2 py-1 rounded"
                      placeholder="Next due"
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 