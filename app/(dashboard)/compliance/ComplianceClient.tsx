'use client'

import React, { useState, useMemo } from 'react'
import { Shield, Search, Filter, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface ComplianceAsset {
  id: string
  name: string
  description: string
  category: string
  required_if: string
  default_frequency: string
  applies: boolean
  last_checked?: string
  next_due?: string
}

interface ComplianceClientProps {
  complianceAssets: ComplianceAsset[]
}

export default function ComplianceClient({ complianceAssets: initialAssets = [] }: ComplianceClientProps) {
  const [assets, setAssets] = useState<ComplianceAsset[]>(initialAssets)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'tracking' | 'setup'>('tracking')

  const toggleAsset = (assetId: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId ? { ...asset, applies: !asset.applies } : asset
    ))
  }

  const updateLastChecked = (assetId: string, date: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId ? { ...asset, last_checked: date } : asset
    ))
  }

  const updateNextDue = (assetId: string, date: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId ? { ...asset, next_due: date } : asset
    ))
  }

  const getRequirementBadge = (requiredIf: string) => {
    if (!requiredIf) return null
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Required: {requiredIf}
      </span>
    )
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'fire safety':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' }
      case 'electrical':
        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' }
      case 'plumbing':
        return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' }
      case 'structural':
        return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' }
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' }
    }
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency.toLowerCase()) {
      case 'monthly':
        return 'text-blue-600'
      case 'quarterly':
        return 'text-green-600'
      case 'annually':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Compliant
          </span>
        )
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Overdue
          </span>
        )
      case 'due soon':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Due Soon
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Not Set
          </span>
        )
    }
  }

  const getPriorityIndicator = (asset: ComplianceAsset) => {
    if (!asset.applies) return null
    
    const nextDue = asset.next_due ? new Date(asset.next_due) : null
    const today = new Date()
    
    if (!nextDue) return null
    
    const daysUntilDue = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilDue < 0) {
      return <div className="w-2 h-2 bg-red-500 rounded-full"></div>
    } else if (daysUntilDue <= 30) {
      return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
    } else {
      return <div className="w-2 h-2 bg-green-500 rounded-full"></div>
    }
  }

  const getComplianceStatus = (asset: ComplianceAsset) => {
    if (!asset.applies) return 'not applicable'
    
    const nextDue = asset.next_due ? new Date(asset.next_due) : null
    const today = new Date()
    
    if (!nextDue) return 'not set'
    
    const daysUntilDue = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilDue < 0) return 'overdue'
    if (daysUntilDue <= 30) return 'due soon'
    return 'compliant'
  }

  const filteredAssets = useMemo(() => {
    if (!searchTerm.trim()) return assets
    
    return assets.filter(asset => {
      const searchLower = searchTerm.toLowerCase()
      return (
        asset.name.toLowerCase().includes(searchLower) ||
        asset.description.toLowerCase().includes(searchLower) ||
        asset.category.toLowerCase().includes(searchLower)
      )
    })
  }, [assets, searchTerm])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compliance Tracking</h2>
          <p className="text-gray-600">Manage and track compliance requirements</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search compliance items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('tracking')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'tracking' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tracking
            </button>
            <button
              onClick={() => setViewMode('setup')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'setup' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Setup
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'tracking' ? (
        <>
          <div className="grid gap-4">
            {filteredAssets.filter(asset => asset.applies).map((asset) => {
              const categoryColors = getCategoryColor(asset.category)
              const status = getComplianceStatus(asset)
              
              return (
                <div key={asset.id} className={`flex items-start justify-between py-4 px-4 rounded-lg border ${categoryColors.border} ${categoryColors.bg}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getPriorityIndicator(asset)}
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
                    <div className="text-right">
                      {asset.last_checked && (
                        <div className="text-xs text-gray-500">
                          Last checked: {new Date(asset.last_checked).toLocaleDateString()}
                        </div>
                      )}
                      {asset.next_due && (
                        <div className="text-xs text-gray-500">
                          Next due: {new Date(asset.next_due).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        setViewMode('setup')
                      }}
                      className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
                        asset.applies 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {asset.applies ? 'Update Tracking' : 'Start Tracking'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {searchTerm && filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matching compliance items</h3>
              <p className="text-gray-500">
                Try adjusting your search terms or browse all compliance items.
              </p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}
        </>
      ) : (
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