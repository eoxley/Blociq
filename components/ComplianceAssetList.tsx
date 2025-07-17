'use client'

import { useState, useEffect } from 'react'
import { UK_COMPLIANCE_ITEMS } from '@/lib/complianceUtils'

interface ComplianceAsset {
  id: string
  building_id: number
  asset_id: string
  status: string
  notes: string | null
  last_updated: string
  compliance_assets: {
    id: string
    name: string
    description: string | null
    category: string | null
  }
}

interface ComplianceAssetListProps {
  buildingId: string
  existingAssets: ComplianceAsset[]
}

export default function ComplianceAssetList({ buildingId, existingAssets }: ComplianceAssetListProps) {
  const [selectedAssets, setSelectedAssets] = useState<Map<string, ComplianceAsset>>(new Map())
  const [trackingAssets, setTrackingAssets] = useState<Set<string>>(new Set())

  // Initialize selected assets from existing assets
  useEffect(() => {
    const assetMap = new Map<string, ComplianceAsset>()
    existingAssets.forEach(asset => {
      const complianceAsset = Array.isArray(asset.compliance_assets) 
        ? asset.compliance_assets[0] 
        : asset.compliance_assets
      if (complianceAsset) {
        assetMap.set(complianceAsset.name, asset)
      }
    })
    setSelectedAssets(assetMap)
  }, [existingAssets])

  const handleToggleAsset = async (assetName: string, isAdding: boolean) => {
    try {
      const formData = new FormData()
      formData.append('building_id', buildingId)
      formData.append('asset_name', assetName)
      formData.append('toggle', isAdding ? '1' : '0')

      const response = await fetch('/api/compliance-assets', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        // Optimistically update UI
        if (isAdding) {
          // Create a temporary asset entry
          const tempAsset: ComplianceAsset = {
            id: `temp-${Date.now()}`,
            building_id: parseInt(buildingId, 10),
            asset_id: assetName,
            status: 'Missing',
            notes: null,
            last_updated: new Date().toISOString(),
            compliance_assets: {
              id: assetName,
              name: assetName,
              description: UK_COMPLIANCE_ITEMS.find(item => item.name === assetName)?.description || '',
              category: UK_COMPLIANCE_ITEMS.find(item => item.name === assetName)?.category || ''
            }
          }
          setSelectedAssets(prev => new Map(prev).set(assetName, tempAsset))
        } else {
          setSelectedAssets(prev => {
            const newMap = new Map(prev)
            newMap.delete(assetName)
            return newMap
          })
          setTrackingAssets(prev => {
            const newSet = new Set(prev)
            newSet.delete(assetName)
            return newSet
          })
        }
      } else {
        console.error('Failed to toggle asset')
      }
    } catch (error) {
      console.error('Error toggling asset:', error)
    }
  }

  const handleStatusUpdate = async (assetName: string, status: string) => {
    const asset = selectedAssets.get(assetName)
    if (!asset) return

    try {
      const response = await fetch('/api/compliance-assets/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: buildingId,
          asset_name: assetName,
          status: status
        })
      })

      if (response.ok) {
        // Update local state
        setSelectedAssets(prev => {
          const newMap = new Map(prev)
          const updatedAsset = { ...asset, status, last_updated: new Date().toISOString() }
          newMap.set(assetName, updatedAsset)
          return newMap
        })
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'compliant': return 'bg-green-100 text-green-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'due soon': return 'bg-yellow-100 text-yellow-800'
      case 'missing': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-3">
      {UK_COMPLIANCE_ITEMS.map((item) => {
        const isSelected = selectedAssets.has(item.name)
        const asset = selectedAssets.get(item.name)
        const isTracking = trackingAssets.has(item.name)
        
        return (
          <div key={item.id} className={`border p-4 rounded-xl transition-colors ${
            isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium text-gray-900">{item.name}</span>
                  {isSelected && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(asset?.status || 'Missing')}`}>
                      {asset?.status || 'Missing'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Category: {item.category}</span>
                  <span>Frequency: {item.default_frequency}</span>
                  <span className={`px-2 py-1 rounded ${
                    item.required_if === 'always' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {item.required_if === 'always' ? 'Required' : 'Optional'}
                  </span>
                </div>
                
                {/* Tracking Section for Applied Assets */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <select 
                        value={asset?.status ?? 'Missing'}
                        onChange={(e) => handleStatusUpdate(item.name, e.target.value)}
                        className="text-sm border rounded px-2 py-1 bg-white"
                      >
                        <option value="Missing">Missing</option>
                        <option value="Compliant">Compliant</option>
                        <option value="Due Soon">Due Soon</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                      <button
                        onClick={() => setTrackingAssets(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(item.name)) {
                            newSet.delete(item.name)
                          } else {
                            newSet.add(item.name)
                          }
                          return newSet
                        })}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          isTracking 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isTracking ? 'Tracking' : 'Track'}
                      </button>
                    </div>
                    {asset?.last_updated && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last updated: {new Date(asset.last_updated).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <button 
                type="button"
                onClick={() => handleToggleAsset(item.name, !isSelected)}
                className={`px-3 py-1 border rounded text-sm font-medium transition-colors ${
                  isSelected 
                    ? 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300' 
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300'
                }`}
              >
                {isSelected ? 'Remove' : 'Add'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
} 