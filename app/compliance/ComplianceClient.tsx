'use client'

import React, { useState } from 'react'
import { Shield, AlertTriangle, Clock, CheckCircle, Filter } from 'lucide-react'

interface ComplianceAsset {
  id: string
  name: string
  description: string
  required_if: 'always' | 'if present' | 'if HRB'
  default_frequency: string
}

interface ComplianceClientProps {
  complianceAssets: ComplianceAsset[]
}

export default function ComplianceClient({ complianceAssets }: ComplianceClientProps) {
  const [filter, setFilter] = useState<'all' | 'always' | 'if present' | 'if HRB'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Filter assets based on search and filter
  const filteredAssets = complianceAssets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || asset.required_if === filter
    return matchesSearch && matchesFilter
  })

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

  if (complianceAssets.length === 0) {
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
            <p>Showing {filteredAssets.length} of {complianceAssets.length} compliance items</p>
          )}
        </div>
      )}

      {/* Compliance Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map((asset) => (
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
              
              {/* Frequency */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className={`text-sm font-medium ${getFrequencyColor(asset.default_frequency)}`}>
                    {asset.default_frequency}
                  </span>
                </div>
                
                <button className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors">
                  Track
                </button>
              </div>
            </div>
          </div>
        ))}
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
    </div>
  )
} 