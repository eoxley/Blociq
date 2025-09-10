'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Shield, 
  Building2, 
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Settings,
  Flame,
  Zap,
  Wrench,
  Eye,
  Clock,
  Star,
  Plus,
  Target,
  Trash2,
  X
} from 'lucide-react'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { toast } from 'sonner'

interface Building {
  id: string
  name: string
  address: string | null
  is_hrb: boolean | null
}

interface BuildingSetup {
  id: string
  structure_type: string | null
}

interface ComplianceAsset {
  id: string
  name: string
  category: string
  description: string
  frequency_months: number
  is_required: boolean
  is_hrb_related?: boolean
}

interface BuildingComplianceAsset {
  id: string
  building_id: string
  compliance_asset_id: string
  status: string
  compliance_assets: ComplianceAsset | null
}

interface ComplianceSetupWizardProps {
  building: Building
  buildingSetup: BuildingSetup | null
  existingAssets: BuildingComplianceAsset[]
  allAssets: ComplianceAsset[]
  buildingId: string
  onAssetsUpdated?: () => void
}

const CATEGORY_ICONS: Record<string, any> = {
  'Safety': Flame,
  'Legal': Shield,
  'Operational': Wrench,
  'Structural': Building2,
  'Electrical': Zap,
  'Fire Safety': Flame,
  'Gas Safety': Flame,
  'Building Safety': Shield,
  'Insurance': Shield,
  'Documentation': Settings
}

const CATEGORY_COLORS: Record<string, string> = {
  'Building Safety Act (BSA / HRB)': 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-600',
  'Fire & Life Safety': 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-600',
  'Structural, Access & Systems': 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-600',
  'Electrical & Mechanical': 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-yellow-600',
  'Water Hygiene & Drainage': 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-600',
  'Insurance & Risk': 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-600',
  'Documentation & Regulatory': 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-indigo-600',
  'Leasehold / Governance': 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-600',
  'Safety': 'bg-gradient-to-r from-red-400 to-red-500 text-white border-red-500',
  'Legal': 'bg-gradient-to-r from-blue-400 to-blue-500 text-white border-blue-500',
  'Operational': 'bg-gradient-to-r from-green-400 to-green-500 text-white border-green-500',
  'Structural': 'bg-gradient-to-r from-purple-400 to-purple-500 text-white border-purple-500',
  'Electrical': 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white border-yellow-500',
  'Fire Safety': 'bg-gradient-to-r from-red-400 to-red-500 text-white border-red-500',
  'Gas Safety': 'bg-gradient-to-r from-orange-400 to-orange-500 text-white border-orange-500',
  'Building Safety': 'bg-gradient-to-r from-blue-400 to-blue-500 text-white border-blue-500',
  'Insurance': 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-500',
  'Documentation': 'bg-gradient-to-r from-indigo-400 to-indigo-500 text-white border-indigo-500'
}

export default function ComplianceSetupWizard({ 
  building, 
  buildingSetup, 
  existingAssets, 
  allAssets, 
  buildingId,
  onAssetsUpdated
}: ComplianceSetupWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(
    new Set(existingAssets.map(ea => ea.compliance_asset_id))
  )
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [removingAssets, setRemovingAssets] = useState<Set<string>>(new Set())

  const steps = [
    {
      id: 'overview',
      title: 'Building Assessment',
      description: 'Review your building type and compliance requirements'
    },
    {
      id: 'existing',
      title: 'Existing Assets',
      description: 'Manage currently configured compliance assets'
    },
    {
      id: 'selection',
      title: 'Asset Selection',
      description: 'Choose which compliance assets to track for this building'
    },
    {
      id: 'review',
      title: 'Review & Confirm',
      description: 'Review your selections and complete the setup'
    }
  ]

  // Group assets by category
  const assetsByCategory = allAssets.reduce((acc, asset) => {
    if (!acc[asset.category]) {
      acc[asset.category] = []
    }
    acc[asset.category].push(asset)
    return acc
  }, {} as Record<string, ComplianceAsset[]>)

  const toggleAsset = (assetId: string) => {
    const newSelected = new Set(selectedAssets)
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId)
    } else {
      newSelected.add(assetId)
    }
    setSelectedAssets(newSelected)
  }

  const toggleCategory = (category: string) => {
    const categoryAssets = assetsByCategory[category] || []
    const allSelected = categoryAssets.every(asset => selectedAssets.has(asset.id))
    
    const newSelected = new Set(selectedAssets)
    if (allSelected) {
      categoryAssets.forEach(asset => newSelected.delete(asset.id))
    } else {
      categoryAssets.forEach(asset => newSelected.add(asset.id))
    }
    setSelectedAssets(newSelected)
  }

  const autoSelectRequired = () => {
    const requiredAssets = allAssets.filter(asset => 
      asset.is_required || 
      (building.is_hrb && asset.is_hrb_related)
    )
    setSelectedAssets(new Set(requiredAssets.map(asset => asset.id)))
  }

  const autoSelectHRB = () => {
    if (!building.is_hrb) return
    
    const hrbAssets = allAssets.filter(asset => 
      asset.is_hrb_related ||
      asset.name.toLowerCase().includes('fire') ||
      asset.name.toLowerCase().includes('safety') ||
      asset.category.toLowerCase().includes('safety')
    )
    
    const newSelected = new Set(selectedAssets)
    hrbAssets.forEach(asset => newSelected.add(asset.id))
    setSelectedAssets(newSelected)
  }

  const removeAsset = async (assetId: string) => {
    setRemovingAssets(prev => new Set([...prev, assetId]))
    
    try {
      const response = await fetch(`/api/building_compliance_assets?id=${assetId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Remove from selected assets
        const newSelected = new Set(selectedAssets)
        newSelected.delete(assetId)
        setSelectedAssets(newSelected)
        
        toast.success('Asset removed successfully')
        
        // Notify parent component to refresh
        onAssetsUpdated?.()
      } else {
        throw new Error('Failed to remove asset')
      }
    } catch (error) {
      console.error('Error removing asset:', error)
      toast.error('Failed to remove asset')
    } finally {
      setRemovingAssets(prev => {
        const newSet = new Set(prev)
        newSet.delete(assetId)
        return newSet
      })
    }
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      // Get assets to add and remove
      const existingAssetIds = new Set(existingAssets.map(ea => ea.compliance_asset_id))
      const assetsToAdd = Array.from(selectedAssets).filter(id => !existingAssetIds.has(id))
      const assetsToRemove = existingAssets
        .filter(ea => !selectedAssets.has(ea.compliance_asset_id))
        .map(ea => ea.id)

      // Add new assets using the correct bulk-add endpoint
      if (assetsToAdd.length > 0) {
        const response = await fetch(`/api/buildings/${buildingId}/compliance/bulk-add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asset_ids: assetsToAdd
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Bulk add error:', errorData)
          throw new Error(`Failed to add compliance assets: ${errorData.error || 'Unknown error'}`)
        }

        const result = await response.json()
        console.log('✅ Successfully added assets:', result)
      }

      // Remove unselected assets using the building compliance assets endpoint
      if (assetsToRemove.length > 0) {
        for (const assetId of assetsToRemove) {
          const response = await fetch(`/api/building_compliance_assets?id=${assetId}`, {
            method: 'DELETE'
          })
          
          if (!response.ok) {
            console.warn(`Failed to remove asset ${assetId}`)
          }
        }
      }

      toast.success('Compliance setup completed successfully!')
      router.push(`/buildings/${buildingId}/compliance`)
    } catch (error) {
      console.error('Error completing setup:', error)
      toast.error(`Failed to complete setup: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const renderOverviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{building.name}</h3>
        <p className="text-gray-600">{building.address}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BlocIQCard>
          <BlocIQCardHeader>
            <h4 className="font-semibold">Building Type</h4>
          </BlocIQCardHeader>
          <BlocIQCardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                <span>{buildingSetup?.structure_type || 'Not specified'}</span>
              </div>
              {building.is_hrb && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">High-Risk Building (HRB)</span>
                </div>
              )}
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard>
          <BlocIQCardHeader>
            <h4 className="font-semibold">Compliance Status</h4>
          </BlocIQCardHeader>
          <BlocIQCardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <span>{existingAssets.length} assets configured</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>{allAssets.filter(a => a.is_required).length} required assets available</span>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      </div>

      {building.is_hrb && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800 mb-2">High-Risk Building Requirements</h4>
              <p className="text-amber-700 text-sm mb-3">
                As an HRB, this building must comply with additional Building Safety Act requirements. 
                Certain safety-critical assets will be automatically recommended.
              </p>
              <button
                onClick={autoSelectHRB}
                className="text-sm bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Auto-select HRB Assets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderExistingAssetsStep = () => {
    const existingAssetsWithDetails = existingAssets
      .map(ea => {
        const asset = allAssets.find(a => a.id === ea.compliance_asset_id)
        return asset ? { ...ea, asset } : null
      })
      .filter(Boolean)
      .sort((a, b) => (a?.asset?.category || '').localeCompare(b?.asset?.category || ''))

    const assetsByCategory = existingAssetsWithDetails.reduce((acc, item) => {
      if (!item) return acc
      const category = item.asset?.category || 'Other'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(item)
      return acc
    }, {} as Record<string, any[]>)

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Existing Compliance Assets</h3>
            <p className="text-gray-600 mt-1">Manage currently configured assets for {building.name}</p>
          </div>
          <div className="text-sm text-gray-500">
            {existingAssetsWithDetails.length} assets configured
          </div>
        </div>

        {existingAssetsWithDetails.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Assets Configured</h4>
            <p className="text-gray-600 mb-4">This building doesn't have any compliance assets set up yet.</p>
            <p className="text-sm text-gray-500">Continue to the next step to add compliance assets.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(assetsByCategory).map(([category, categoryAssets]) => {
              const Icon = CATEGORY_ICONS[category] || Settings
              
              return (
                <BlocIQCard key={category} className="border-l-4 border-l-blue-500">
                  <BlocIQCardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold">{category}</h4>
                      <BlocIQBadge variant="secondary" className={CATEGORY_COLORS[category]}>
                        {categoryAssets.length} assets
                      </BlocIQBadge>
                    </div>
                  </BlocIQCardHeader>
                  
                  <BlocIQCardContent className="pt-0">
                    <div className="space-y-3">
                      {categoryAssets.map((item) => {
                        if (!item) return null
                        const { asset, id, status } = item
                        const isRemoving = removingAssets.has(id)
                        
                        return (
                          <div
                            key={id}
                            className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-medium">{asset.name}</h5>
                                  <BlocIQBadge 
                                    variant="secondary" 
                                    className={
                                      status === 'not_applied' ? 'bg-red-100 text-red-800' :
                                      status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      status === 'completed' ? 'bg-green-100 text-green-800' :
                                      'bg-gray-100 text-gray-800'
                                    }
                                  >
                                    {status.replace('_', ' ')}
                                  </BlocIQBadge>
                                  {asset.is_required && (
                                    <BlocIQBadge variant="secondary" className="bg-red-100 text-red-800">
                                      Required
                                    </BlocIQBadge>
                                  )}
                                  {asset.is_hrb_related && (
                                    <BlocIQBadge variant="secondary" className="bg-purple-100 text-purple-800">
                                      HRB
                                    </BlocIQBadge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Every {asset.frequency_months} months
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => removeAsset(id)}
                                disabled={isRemoving}
                                className="ml-4 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove asset"
                              >
                                {isRemoving ? (
                                  <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </BlocIQCardContent>
                </BlocIQCard>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderSelectionStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Select Compliance Assets</h3>
          <p className="text-gray-600 mt-1">Choose which assets to track for {building.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={autoSelectRequired}
            className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Select Required Only
          </button>
          <button
            onClick={() => setSelectedAssets(new Set())}
            className="text-sm bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <strong>{selectedAssets.size}</strong> of {allAssets.length} assets selected
      </div>

      <div className="space-y-4">
        {Object.entries(assetsByCategory).map(([category, categoryAssets]) => {
          const isExpanded = expandedCategories.has(category)
          const selectedCount = categoryAssets.filter(asset => selectedAssets.has(asset.id)).length
          const Icon = CATEGORY_ICONS[category] || Settings
          
          return (
            <BlocIQCard key={category} className="border-l-4 border-l-blue-500">
              <BlocIQCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold">{category}</h4>
                    <BlocIQBadge variant="secondary" className={CATEGORY_COLORS[category]}>
                      {selectedCount}/{categoryAssets.length} selected
                    </BlocIQBadge>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      {selectedCount === categoryAssets.length ? 'Unselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedCategories)
                        if (isExpanded) {
                          newExpanded.delete(category)
                        } else {
                          newExpanded.add(category)
                        }
                        setExpandedCategories(newExpanded)
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronLeft className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </BlocIQCardHeader>
              
              {isExpanded && (
                <BlocIQCardContent className="pt-0">
                  <div className="space-y-3">
                    {categoryAssets.map(asset => {
                      const isSelected = selectedAssets.has(asset.id)
                      const isRequired = asset.is_required || (building.is_hrb && asset.is_hrb_related)
                      
                      return (
                        <div
                          key={asset.id}
                          className={`p-3 border rounded-lg transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleAsset(asset.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleAsset(asset.id)}
                                  className="h-4 w-4 text-blue-600"
                                />
                                <h5 className="font-medium">{asset.name}</h5>
                                {isRequired && (
                                  <BlocIQBadge variant="secondary" className="bg-red-100 text-red-800">
                                    Required
                                  </BlocIQBadge>
                                )}
                                {asset.is_hrb_related && (
                                  <BlocIQBadge variant="secondary" className="bg-purple-100 text-purple-800">
                                    HRB
                                  </BlocIQBadge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Every {asset.frequency_months} months
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </BlocIQCardContent>
              )}
            </BlocIQCard>
          )
        })}
      </div>
    </div>
  )

  const renderReviewStep = () => {
    const selectedAssetsList = allAssets.filter(asset => selectedAssets.has(asset.id))
    const selectedByCategory = selectedAssetsList.reduce((acc, asset) => {
      if (!acc[asset.category]) {
        acc[asset.category] = []
      }
      acc[asset.category].push(asset)
      return acc
    }, {} as Record<string, ComplianceAsset[]>)

    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Review Your Selection</h3>
          <p className="text-gray-600">
            You&apos;ve selected <strong>{selectedAssets.size}</strong> compliance assets for {building.name}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-700">{selectedAssets.size}</div>
            <div className="text-sm text-green-600">Assets Selected</div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <Settings className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-700">{Object.keys(selectedByCategory).length}</div>
            <div className="text-sm text-blue-600">Categories</div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
            <Star className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-700">
              {selectedAssetsList.filter(a => a.is_required).length}
            </div>
            <div className="text-sm text-purple-600">Required Assets</div>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(selectedByCategory).map(([category, categoryAssets]) => {
            const Icon = CATEGORY_ICONS[category] || Settings
            
            return (
              <BlocIQCard key={category} className="border-l-4 border-l-green-500">
                <BlocIQCardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold">{category}</h4>
                    <BlocIQBadge variant="secondary" className="bg-green-100 text-green-800">
                      {categoryAssets.length} assets
                    </BlocIQBadge>
                  </div>
                </BlocIQCardHeader>
                <BlocIQCardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {categoryAssets.map(asset => (
                      <div key={asset.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{asset.name}</span>
                        {asset.is_required && (
                          <BlocIQBadge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                            Required
                          </BlocIQBadge>
                        )}
                      </div>
                    ))}
                  </div>
                </BlocIQCardContent>
              </BlocIQCard>
            )
          })}
        </div>

        {selectedAssets.size === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
            <h4 className="font-semibold text-amber-800 mb-1">No Assets Selected</h4>
            <p className="text-amber-700 text-sm">
              You haven&apos;t selected any compliance assets. Go back to select assets to track.
            </p>
          </div>
        )}
      </div>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderOverviewStep()
      case 1:
        return renderExistingAssetsStep()
      case 2:
        return renderSelectionStep()
      case 3:
        return renderReviewStep()
      default:
        return null
    }
  }

  const canProceed = currentStep < 3 || selectedAssets.size > 0
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 border-b border-white/20 px-6 py-8 shadow-2xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push(`/buildings/${buildingId}`)}
                className="p-3 text-white hover:text-white hover:bg-white/20 rounded-2xl transition-all duration-200 backdrop-blur-sm border border-white/20"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-white/20 to-white/30 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl border border-white/30">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Compliance Setup Wizard
                </h1>
                <p className="text-lg text-white/90 flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {building.name}
                </p>
              </div>
            </div>
            
            {/* Progress Badge */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/20">
              <Target className="h-5 w-5 text-white" />
              <span className="text-white font-medium">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-14 h-14 rounded-2xl border-2 transition-all duration-300 shadow-lg ${
                  index <= currentStep 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-600 text-white transform scale-110' 
                    : 'border-gray-200 text-gray-400 bg-gray-50'
                }`}>
                  {index < currentStep ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <span className="text-lg font-bold">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-24 h-1 mx-6 rounded-full transition-all duration-300 ${
                    index < currentStep ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
              {steps[currentStep].title}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {steps[currentStep].description}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-3 px-8 py-4 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 bg-gray-50 hover:bg-gray-100 rounded-2xl font-medium"
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </button>

          <div className="flex items-center gap-4">
            {!canProceed && (
              <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                <AlertTriangle className="h-4 w-4" />
                Please select at least one asset
              </div>
            )}
            
            {isLastStep ? (
              <BlocIQButton
                onClick={handleComplete}
                disabled={!canProceed || saving}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                    Completing Setup...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-3" />
                    Complete Setup
                  </>
                )}
              </BlocIQButton>
            ) : (
              <button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={!canProceed}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                Next
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}