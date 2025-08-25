'use client'

import React, { useState, useEffect } from 'react'
import { Shield, Building2, CheckCircle, AlertTriangle, Clock, Calendar, Save, Loader2 } from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'

interface ComplianceSetupWizardProps {
  buildingId: string
  buildingName: string
  existingAssetIds: string[]
}

interface ComplianceAsset {
  id: string
  title: string
  name: string
  category: string
  description: string
  frequency_months: number
  frequency: string
  isSelected: boolean
}

export default function ComplianceSetupWizard({ 
  buildingId, 
  buildingName, 
  existingAssetIds 
}: ComplianceSetupWizardProps) {
  const [assets, setAssets] = useState<ComplianceAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedAssets, setSelectedAssets] = useState<string[]>(existingAssetIds)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    fetchComplianceAssets()
  }, [])

  const fetchComplianceAssets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/compliance/assets')
      if (response.ok) {
        const data = await response.json()
        const assetsWithSelection = data.assets.map((asset: any) => ({
          ...asset,
          isSelected: existingAssetIds.includes(asset.id)
        }))
        setAssets(assetsWithSelection)
      }
    } catch (error) {
      console.error('Error fetching compliance assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    )
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/compliance/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building_id: buildingId,
          asset_ids: selectedAssets
        })
      })

      if (response.ok) {
        // Redirect back to compliance page
        window.location.href = `/buildings/${buildingId}/compliance`
      } else {
        const error = await response.json()
        alert(`Error saving: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving compliance setup:', error)
      alert('Error saving compliance setup')
    } finally {
      setSaving(false)
    }
  }

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categories = ['all', ...Array.from(new Set(assets.map(asset => asset.category)))]

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading compliance assets...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <Shield className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Setup Instructions
            </h3>
            <p className="text-blue-800 mb-4">
              Select the compliance assets you want to track for <strong>{buildingName}</strong>. 
              These will be used to monitor compliance status and generate reports.
            </p>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• <strong>Selected assets</strong> will be tracked for this building</p>
              <p>• <strong>Frequency</strong> determines how often items need attention</p>
              <p>• <strong>Categories</strong> help organize compliance requirements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search compliance assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map((asset) => (
          <div
            key={asset.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedAssets.includes(asset.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleAssetToggle(asset.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-600" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {asset.category}
                </span>
              </div>
              {selectedAssets.includes(asset.id) && (
                <CheckCircle className="h-5 w-5 text-blue-600" />
              )}
            </div>
            
            <h4 className="font-semibold text-gray-900 mb-2">{asset.title}</h4>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{asset.description}</p>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Every {asset.frequency_months} months</span>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
          <p className="text-gray-600">
            Try adjusting your search terms or category filter.
          </p>
        </div>
      )}

      {/* Summary and Save */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Setup Summary</h3>
            <p className="text-gray-600">
              {selectedAssets.length} compliance assets selected for {buildingName}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{selectedAssets.length}</div>
            <div className="text-sm text-gray-500">Assets Selected</div>
          </div>
        </div>
        
        <div className="flex gap-4">
          <BlocIQButton
            onClick={handleSave}
            disabled={saving || selectedAssets.length === 0}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Compliance Setup
              </>
            )}
          </BlocIQButton>
          
          <BlocIQButton
            variant="secondary"
            onClick={() => window.location.href = `/buildings/${buildingId}/compliance`}
            className="flex-1"
          >
            Cancel
          </BlocIQButton>
        </div>
      </div>
    </div>
  )
}
