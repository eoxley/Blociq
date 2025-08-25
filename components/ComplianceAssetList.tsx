'use client'

import React, { useState, useEffect } from 'react'
import { Shield, Search, Filter, Loader2, AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { BlocIQCard, BlocIQCardHeader, BlocIQCardContent } from '@/components/ui/blociq-card'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface ComplianceAsset {
  id: string
  category: string
  title: string
  description: string | null
  frequency_months: number | null
  is_required?: boolean
  created_at: string
}

interface ComplianceAssetListProps {
  buildingId: string
  existingAssets: any[]
}

export default function ComplianceAssetList({ buildingId, existingAssets }: ComplianceAssetListProps) {
  const [masterAssets, setMasterAssets] = useState<ComplianceAsset[]>([])
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get existing asset IDs for comparison
  const existingAssetIds = existingAssets.map(asset => asset.compliance_asset_id || asset.id)

  // Fetch master compliance assets on mount
  useEffect(() => {
    fetchMasterAssets()
  }, [])

  const fetchMasterAssets = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/compliance-assets')
      if (!response.ok) {
        throw new Error('Failed to fetch compliance assets')
      }
      
      const data = await response.json()
      setMasterAssets(data.assets || [])
    } catch (error) {
      console.error('Error fetching master assets:', error)
      setError('Failed to load compliance assets. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Group assets by category
  const groupedAssets = masterAssets.reduce((acc, asset) => {
    if (!acc[asset.category]) {
      acc[asset.category] = []
    }
    acc[asset.category].push(asset)
    return acc
  }, {} as Record<string, ComplianceAsset[]>)

  // Filter assets based on search and category
  const filteredAssets = Object.entries(groupedAssets)
    .filter(([category]) => categoryFilter === 'all' || category === categoryFilter)
    .reduce((acc, [category, assets]) => {
      const filteredCategoryAssets = assets.filter(asset =>
        asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.description && asset.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      if (filteredCategoryAssets.length > 0) {
        acc[category] = filteredCategoryAssets
      }
      return acc
    }, {} as Record<string, ComplianceAsset[]>)

  const handleAssetSelection = (assetId: string, checked: boolean) => {
    if (checked) {
      setSelectedAssets(prev => [...prev, assetId])
    } else {
      setSelectedAssets(prev => prev.filter(id => id !== assetId))
    }
  }

  const handleSaveSelection = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one compliance asset')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/compliance-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId,
          assetIds: selectedAssets,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save compliance assets')
      }

      toast.success(`Successfully added ${selectedAssets.length} compliance assets`)
      setSelectedAssets([])
      // Refresh the page or trigger a callback to update the parent component
      window.location.reload()
    } catch (error) {
      console.error('Error saving compliance assets:', error)
      toast.error('Failed to save compliance assets. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'fire safety':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'gas safety':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'electrical':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'structural':
        return <Shield className="w-4 h-4 text-blue-500" />
      case 'hrb':
        return <Shield className="w-4 h-4 text-purple-500" />
      case 'environmental':
        return <Shield className="w-4 h-4 text-green-500" />
      default:
        return <Shield className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusIcon = (assetId: string) => {
    if (existingAssetIds.includes(assetId)) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    return <Clock className="w-4 h-4 text-gray-400" />
  }

  const getStatusText = (assetId: string) => {
    if (existingAssetIds.includes(assetId)) {
      return 'Already Setup'
    }
    return 'Available'
  }

  if (isLoading) {
    return (
      <BlocIQCard>
        <BlocIQCardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading compliance assets...</span>
        </BlocIQCardContent>
      </BlocIQCard>
    )
  }

  if (error) {
    return (
      <BlocIQCard>
        <BlocIQCardContent className="py-12">
          <div className="flex items-center justify-center text-red-500">
            <AlertCircle className="w-6 h-6 mr-2" />
            <span>{error}</span>
          </div>
        </BlocIQCardContent>
      </BlocIQCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Available Compliance Assets</h3>
          <p className="text-sm text-gray-600">
            Select the compliance assets you want to track for this building
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <BlocIQButton
            onClick={handleSaveSelection}
            disabled={isSaving || selectedAssets.length === 0}
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Setup Selected ({selectedAssets.length})
              </>
            )}
          </BlocIQButton>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search compliance assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="sm:w-48">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {Object.keys(groupedAssets).map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assets List */}
      <div className="space-y-4">
        {Object.entries(filteredAssets).map(([category, assets]) => (
          <BlocIQCard key={category}>
            <BlocIQCardHeader>
              <div className="flex items-center space-x-2">
                {getCategoryIcon(category)}
                <h4 className="font-medium text-gray-900">{category}</h4>
                <span className="text-sm text-gray-500">({assets.length})</span>
              </div>
            </BlocIQCardHeader>
            
            <BlocIQCardContent>
              <div className="space-y-3">
                {assets.map((asset) => {
                  const isExisting = existingAssetIds.includes(asset.id)
                  const isSelected = selectedAssets.includes(asset.id)
                  
                  return (
                    <div
                      key={asset.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border ${
                        isExisting 
                          ? 'bg-green-50 border-green-200' 
                          : isSelected 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-white border-gray-200'
                      }`}
                    >
                      <Checkbox
                        id={asset.id}
                        checked={isSelected}
                        onCheckedChange={(checked) => handleAssetSelection(asset.id, checked as boolean)}
                        disabled={isExisting}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor={asset.id}
                            className={`text-sm font-medium cursor-pointer ${
                              isExisting ? 'text-green-700' : 'text-gray-900'
                            }`}
                          >
                            {asset.title}
                          </label>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(asset.id)}
                            <span className={`text-xs ${
                              isExisting ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {getStatusText(asset.id)}
                            </span>
                          </div>
                        </div>
                        
                        {asset.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {asset.description}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-2">
                          {asset.frequency_months && (
                            <span className="text-xs text-gray-500">
                              Renewal: Every {asset.frequency_months} months
                            </span>
                          )}
                          {asset.is_required && (
                            <span className="text-xs text-red-600 font-medium">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </BlocIQCardContent>
          </BlocIQCard>
        ))}
      </div>

      {/* Empty State */}
      {Object.keys(filteredAssets).length === 0 && (
        <BlocIQCard>
          <BlocIQCardContent className="py-12 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
            <p className="text-gray-600">
              {searchTerm || categoryFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'No compliance assets are currently available'
              }
            </p>
          </BlocIQCardContent>
        </BlocIQCard>
      )}
    </div>
  )
}
