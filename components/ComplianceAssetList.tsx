'use client'

import { useState } from 'react'
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
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(() => {
    const selected = new Set<string>()
    existingAssets.forEach(asset => {
      const complianceAsset = Array.isArray(asset.compliance_assets) 
        ? asset.compliance_assets[0] 
        : asset.compliance_assets
      if (complianceAsset) {
        selected.add(complianceAsset.name)
      }
    })
    return selected
  })

  const handleFormSubmit = async (formData: FormData) => {
    const assetName = formData.get('asset_name') as string
    const toggle = formData.get('toggle') as string
    const isAdding = toggle === '1'

    // Optimistically update UI
    if (isAdding) {
      setSelectedAssets(prev => new Set([...prev, assetName]))
    } else {
      setSelectedAssets(prev => {
        const newSet = new Set(prev)
        newSet.delete(assetName)
        return newSet
      })
    }
  }

  return (
    <div className="space-y-3">
      {UK_COMPLIANCE_ITEMS.map((item) => {
        const isSelected = selectedAssets.has(item.name)
        
        return (
          <div key={item.id} className="flex items-center justify-between border p-3 rounded-xl bg-white">
            <div className="flex-1">
              <span className="font-medium text-gray-900">{item.name}</span>
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
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
            </div>
            <form action={`/api/compliance-assets`} method="POST">
              <input type="hidden" name="building_id" value={buildingId} />
              <input type="hidden" name="asset_name" value={item.name} />
              <input type="hidden" name="toggle" value={isSelected ? "0" : "1"} />
              <button 
                type="submit" 
                className="px-3 py-1 border rounded text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium transition-colors"
              >
                {isSelected ? 'Remove' : 'Add'}
              </button>
            </form>
          </div>
        )
      })}
    </div>
  )
} 