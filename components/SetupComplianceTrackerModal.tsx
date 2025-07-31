'use client'

import { useState, useEffect } from 'react'
import { Shield, X, Check, Search, Filter, Loader2, AlertCircle } from 'lucide-react'
import { BlocIQCard, BlocIQCardHeader, BlocIQCardContent, BlocIQCardFooter } from '@/components/ui/blociq-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ComplianceAsset {
  id: string
  category: string
  title: string
  description: string | null
  frequency_months: number | null
  created_at: string
}

interface SetupComplianceTrackerModalProps {
  buildingId: string
  buildingName: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function SetupComplianceTrackerModal({
  buildingId,
  buildingName,
  isOpen,
  onClose,
  onSuccess
}: SetupComplianceTrackerModalProps) {
  const [masterAssets, setMasterAssets] = useState<ComplianceAsset[]>([])
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch master compliance assets on mount
  useEffect(() => {
    if (isOpen) {
      fetchMasterAssets()
    }
  }, [isOpen])

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

  const handleSelectAll = () => {
    const allAssetIds = Object.values(filteredAssets)
      .flat()
      .map(asset => asset.id)
    setSelectedAssets(allAssetIds)
  }

  const handleDeselectAll = () => {
    setSelectedAssets([])
  }

  const handleSave = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one compliance asset')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/compliance/building/${buildingId}/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetIds: selectedAssets
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save compliance setup')
      }

      toast.success('Compliance tracker set up successfully!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving compliance setup:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save compliance setup')
    } finally {
      setIsSaving(false)
    }
  }

  const getCategoryCount = (category: string) => {
    return groupedAssets[category]?.length || 0
  }

  const getSelectedCount = (category: string) => {
    const categoryAssets = groupedAssets[category] || []
    return categoryAssets.filter(asset => selectedAssets.includes(asset.id)).length
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <BlocIQCard className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <BlocIQCardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Set Up Compliance Tracker
                </h2>
                <p className="text-gray-600">
                  Select compliance assets to track at {buildingName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </BlocIQCardHeader>

        <BlocIQCardContent className="p-6 space-y-6">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search compliance assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {Object.keys(groupedAssets).map(category => (
                  <option key={category} value={category}>
                    {category} ({getCategoryCount(category)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-sm"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="text-sm"
              >
                Deselect All
              </Button>
            </div>
            <Badge variant="secondary" className="text-sm">
              {selectedAssets.length} selected
            </Badge>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-gray-600">Loading compliance assets...</span>
              </div>
            </div>
          )}

          {/* Assets List */}
          {!isLoading && !error && (
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {Object.entries(filteredAssets).map(([category, assets]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category}
                    </h3>
                    <Badge variant="outline" className="text-sm">
                      {getSelectedCount(category)}/{assets.length} selected
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedAssets.includes(asset.id)}
                          onCheckedChange={(checked) => 
                            handleAssetSelection(asset.id, checked as boolean)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {asset.title}
                              </h4>
                              {asset.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {asset.description}
                                </p>
                              )}
                            </div>
                            {asset.frequency_months && (
                              <Badge variant="secondary" className="text-xs ml-2">
                                {asset.frequency_months} months
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {Object.keys(filteredAssets).length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchTerm || categoryFilter !== 'all' 
                      ? 'No compliance assets match your search criteria.'
                      : 'No compliance assets available.'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </BlocIQCardContent>

        <BlocIQCardFooter className="border-t border-gray-200">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600">
              {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={selectedAssets.length === 0 || isSaving}
                className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] hover:from-[#007A7D] hover:to-[#6A3FD8]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save & Start Tracking
                  </>
                )}
              </Button>
            </div>
          </div>
        </BlocIQCardFooter>
      </BlocIQCard>
    </div>
  )
} 