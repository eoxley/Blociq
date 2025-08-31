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
  Plus
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
  'Safety': 'bg-red-100 text-red-800 border-red-200',
  'Legal': 'bg-blue-100 text-blue-800 border-blue-200',
  'Operational': 'bg-green-100 text-green-800 border-green-200',
  'Structural': 'bg-purple-100 text-purple-800 border-purple-200',
  'Electrical': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Fire Safety': 'bg-red-100 text-red-800 border-red-200',
  'Gas Safety': 'bg-orange-100 text-orange-800 border-orange-200',
  'Building Safety': 'bg-blue-100 text-blue-800 border-blue-200',
  'Insurance': 'bg-gray-100 text-gray-800 border-gray-200',
  'Documentation': 'bg-indigo-100 text-indigo-800 border-indigo-200'
}

export default function ComplianceSetupWizard({ 
  building, 
  buildingSetup, 
  existingAssets, 
  allAssets, 
  buildingId 
}: ComplianceSetupWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(
    new Set(existingAssets.map(ea => ea.compliance_asset_id))
  )
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const steps = [
    {
      id: 'overview',
      title: 'Building Assessment',
      description: 'Review your building type and compliance requirements'
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

  const handleComplete = async () => {
    setSaving(true)
    try {
      // Get assets to add and remove
      const existingAssetIds = new Set(existingAssets.map(ea => ea.compliance_asset_id))
      const assetsToAdd = Array.from(selectedAssets).filter(id => !existingAssetIds.has(id))
      const assetsToRemove = existingAssets
        .filter(ea => !selectedAssets.has(ea.compliance_asset_id))
        .map(ea => ea.id)

      // Add new assets
      if (assetsToAdd.length > 0) {
        const response = await fetch('/api/compliance/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            building_id: buildingId,
            asset_ids: assetsToAdd
          })
        })

        if (!response.ok) {
          throw new Error('Failed to add compliance assets')
        }
      }

      // Remove unselected assets
      if (assetsToRemove.length > 0) {
        for (const assetId of assetsToRemove) {
          const response = await fetch(`/api/compliance/assets/${assetId}`, {
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
      toast.error('Failed to complete setup. Please try again.')
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
            You've selected <strong>{selectedAssets.size}</strong> compliance assets for {building.name}
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
              You haven't selected any compliance assets. Go back to select assets to track.
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
        return renderSelectionStep()
      case 2:
        return renderReviewStep()
      default:
        return null
    }
  }

  const canProceed = currentStep < 2 || selectedAssets.size > 0
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push(`/buildings/${buildingId}`)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-[#004AAD] via-[#3B82F6] to-[#7209B7] rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#004AAD] to-[#7209B7] bg-clip-text text-transparent">
                  Compliance Setup Wizard
                </h1>
                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4" />
                  {building.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                  index <= currentStep 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {index < currentStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-20 h-0.5 mx-4 ${
                    index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-600 mt-1">
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
            className="inline-flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            {!canProceed && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Please select at least one asset
              </div>
            )}
            
            {isLastStep ? (
              <BlocIQButton
                onClick={handleComplete}
                disabled={!canProceed || saving}
                className="bg-gradient-to-r from-[#004AAD] to-[#7209B7] hover:from-[#003A8C] hover:to-[#5A078F]"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Completing Setup...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </BlocIQButton>
            ) : (
              <button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={!canProceed}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}