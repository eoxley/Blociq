'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
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
  const [assets, setAssets] = useState<ComplianceAsset[]>(existingAssets)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  // Create a map of existing assets for quick lookup
  const existingAssetMap = new Map()
  assets.forEach(asset => {
    const complianceAsset = Array.isArray(asset.compliance_assets) 
      ? asset.compliance_assets[0] 
      : asset.compliance_assets
    if (complianceAsset) {
      existingAssetMap.set(complianceAsset.name, {
        ...asset,
        complianceAsset
      })
    }
  })

  const handleToggle = async (assetName: string, apply: boolean) => {
    setLoading(prev => ({ ...prev, [assetName]: true }))
    setError(null)

    try {
      const response = await fetch('/api/compliance-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId,
          assetName,
          apply
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update asset')
      }

      // Update local state
      if (apply) {
        // Add asset to the list
        const assetItem = UK_COMPLIANCE_ITEMS.find(item => item.name === assetName)
        if (assetItem) {
          const newAsset: ComplianceAsset = {
            id: `temp-${Date.now()}`,
            building_id: parseInt(buildingId, 10),
            asset_id: assetName,
            status: 'Not Started',
            notes: null,
            last_updated: new Date().toISOString(),
            compliance_assets: {
              id: assetName,
              name: assetName,
              description: assetItem.description,
              category: assetItem.category
            }
          }
          setAssets(prev => [...prev, newAsset])
        }
      } else {
        // Remove asset from the list
        setAssets(prev => prev.filter(asset => {
          const complianceAsset = Array.isArray(asset.compliance_assets) 
            ? asset.compliance_assets[0] 
            : asset.compliance_assets
          return complianceAsset?.name !== assetName
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(prev => ({ ...prev, [assetName]: false }))
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-3 mb-4">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}
      
      {UK_COMPLIANCE_ITEMS.map((item) => {
        const isApplied = existingAssetMap.has(item.name)
        const existingAsset = existingAssetMap.get(item.name)
        const isLoading = loading[item.name]
        
        return (
          <div key={item.id} className={`p-4 rounded-lg border transition-colors ${
            isApplied 
              ? 'bg-primary/5 border-primary/20' 
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                {/* Toggle Switch */}
                <div className="relative">
                  <input
                    type="checkbox"
                    id={`toggle-${item.id}`}
                    className="sr-only"
                    checked={isApplied}
                    onChange={(e) => handleToggle(item.name, e.target.checked)}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor={`toggle-${item.id}`}
                    className={`block w-12 h-6 rounded-full transition-colors cursor-pointer ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    } ${
                      isApplied 
                        ? 'bg-primary' 
                        : 'bg-slate-300'
                    }`}
                  >
                    <span className={`block w-4 h-4 bg-white rounded-full transition-transform transform ${
                      isApplied ? 'translate-x-6' : 'translate-x-1'
                    } mt-1`} />
                  </label>
                </div>
                
                {/* Asset Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-medium text-dark">{item.name}</h3>
                    <Badge variant={item.required_if === 'always' ? 'destructive' : 'outline'}>
                      {item.required_if === 'always' ? 'Required' : 'Optional'}
                    </Badge>
                    {isLoading && (
                      <span className="text-xs text-neutral">Saving...</span>
                    )}
                  </div>
                  <p className="text-sm text-neutral mb-2">{item.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-neutral">
                    <span>Category: {item.category}</span>
                    <span>Frequency: {item.default_frequency}</span>
                  </div>
                </div>
              </div>
              
              {/* Status Indicator */}
              {isApplied && (
                <div className="ml-4">
                  <Badge variant="default" className="bg-primary text-white">
                    Applied
                  </Badge>
                  {existingAsset?.status && (
                    <div className="text-xs text-neutral mt-1">
                      Status: {existingAsset.status}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
} 