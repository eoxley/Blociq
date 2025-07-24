'use client'

import React, { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  Brain, 
  Info, 
  Save, 
  ArrowRight,
  Building2,
  AlertTriangle,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Tables } from '@/lib/database.types'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type ComplianceAsset = Tables<'compliance_assets'> & {
  recommended_frequency?: string
}

type Building = Tables<'buildings'>

interface BuildingComplianceSetupProps {
  building: Building
  groupedAssets: Record<string, (ComplianceAsset & { isActive: boolean })[]>
  buildingId: string
}

// Category configurations with BlocIQ styling
const categoryConfigs = {
  'Legal & Safety': {
    description: 'Fire, electrical and health legislation',
    color: 'bg-red-50 border-red-200 text-red-700',
    icon: Shield
  },
  'Structural & Condition': {
    description: 'Building structure and condition assessments',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    icon: Building2
  },
  'Operational & Contracts': {
    description: 'Service contracts and operational requirements',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    icon: Clock
  },
  'Insurance': {
    description: 'Building and liability insurance requirements',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    icon: Shield
  },
  'Lease & Documentation': {
    description: 'Lease compliance and documentation requirements',
    color: 'bg-green-50 border-green-200 text-green-700',
    icon: CheckCircle
  },
  'Admin': {
    description: 'Administrative and reporting requirements',
    color: 'bg-gray-50 border-gray-200 text-gray-700',
    icon: CheckCircle
  },
  'Smart Records': {
    description: 'Digital record keeping and smart building systems',
    color: 'bg-teal-50 border-teal-200 text-teal-700',
    icon: Brain
  },
  'Safety': {
    description: 'BSA-specific safety requirements',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    icon: AlertTriangle
  }
}

export default function BuildingComplianceSetup({ 
  building, 
  groupedAssets, 
  buildingId 
}: BuildingComplianceSetupProps) {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(
    new Set(
      Object.values(groupedAssets)
        .flat()
        .filter(asset => asset.isActive)
        .map(asset => asset.id)
    )
  )
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev)
      if (newSet.has(assetId)) {
        newSet.delete(assetId)
      } else {
        newSet.add(assetId)
      }
      return newSet
    })
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  // 🔧 On tick: upsert with status: 'active'
  // 🔧 On untick: update status to 'inactive' (don't delete)
  const handleSaveAndContinue = async () => {
    setIsSaving(true)
    setSaveStatus('saving')

    try {
      // Get all existing building compliance assets
      const { data: existingAssets, error: fetchError } = await supabase
        .from('building_compliance_assets')
        .select('asset_id, status')
        .eq('building_id', buildingId)

      if (fetchError) {
        console.error('Error fetching existing assets:', fetchError)
        setSaveStatus('error')
        return
      }

      const existingAssetIds = new Set(existingAssets?.map(asset => asset.asset_id) || [])
      const selectedAssetIds = Array.from(selectedAssets)

      // Assets to add (new selections) - upsert with status: 'active'
      const assetsToAdd = selectedAssetIds.filter(id => !existingAssetIds.has(id))
      
      // Assets to update (deselected) - update status to 'inactive'
      const assetsToDeactivate = Array.from(existingAssetIds).filter(id => !selectedAssets.has(id))

      // Add new assets with status: 'active'
      if (assetsToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('building_compliance_assets')
          .upsert(
            assetsToAdd.map(assetId => ({
              building_id: buildingId,
              asset_id: assetId,
              status: 'active',
              notes: null,
              next_due_date: null,
              last_updated: new Date().toISOString()
            }))
          )

        if (insertError) {
          console.error('Error adding assets:', insertError)
          setSaveStatus('error')
          return
        }
      }

      // Update deselected assets to status: 'inactive' (don't delete)
      if (assetsToDeactivate.length > 0) {
        const { error: updateError } = await supabase
          .from('building_compliance_assets')
          .update({ 
            status: 'inactive',
            last_updated: new Date().toISOString()
          })
          .eq('building_id', buildingId)
          .in('asset_id', assetsToDeactivate)

        if (updateError) {
          console.error('Error deactivating assets:', updateError)
          setSaveStatus('error')
          return
        }
      }

      setSaveStatus('success')
      
      // Navigate to compliance page after a brief delay
      setTimeout(() => {
        router.push(`/buildings/${buildingId}/compliance`)
      }, 1000)

    } catch (error) {
      console.error('Error saving compliance setup:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const isAIAutoFill = (assetName: string) => {
    const aiKeywords = ['fire', 'fra', 'gas', 'asbestos', 'lift', 'eicr', 'd&o', 'insurance']
    return aiKeywords.some(keyword => 
      assetName.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  const getFrequencyColor = (frequency: string) => {
    const colors = {
      '6 months': 'bg-orange-100 text-orange-800 border-orange-200',
      '1 year': 'bg-blue-100 text-blue-800 border-blue-200',
      '2 years': 'bg-purple-100 text-purple-800 border-purple-200',
      '5 years': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      '10 years': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[frequency as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const selectedCount = selectedAssets.size
  const totalCount = Object.values(groupedAssets).flat().length

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#FAFAFA] pb-24">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-serif font-bold text-[#333333] mb-2">
                  Compliance Setup
                </h1>
                <p className="text-gray-600 font-serif">
                  {building.name} • Select applicable compliance requirements
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 font-serif">
                  {selectedCount} of {totalCount} selected
                </p>
                <p className="text-xs text-gray-500">
                  {Math.round((selectedCount / totalCount) * 100)}% complete
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Assets by Category */}
        <div className="p-6 space-y-6">
          {Object.entries(groupedAssets).map(([category, assets]) => {
            const config = categoryConfigs[category as keyof typeof categoryConfigs] || {
              description: 'Other compliance requirements',
              color: 'bg-gray-50 border-gray-200 text-gray-700',
              icon: Shield
            }
            const IconComponent = config.icon
            const isExpanded = expandedCategories.has(category)
            const categorySelectedCount = assets.filter(asset => selectedAssets.has(asset.id)).length

            return (
              <BlocIQCard key={category} className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden">
                <BlocIQCardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-serif font-semibold text-[#333333]">{category}</h3>
                        <p className="text-sm text-gray-600 font-serif">{config.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <BlocIQBadge variant="secondary" className="bg-gray-100 text-gray-700">
                        {categorySelectedCount} of {assets.length} selected
                      </BlocIQBadge>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </div>
                </BlocIQCardHeader>

                {isExpanded && (
                  <BlocIQCardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                      {assets.map((asset) => (
                        <div key={asset.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start space-x-4">
                            {/* Checkbox */}
                            <button
                              onClick={() => handleAssetToggle(asset.id)}
                              className="mt-1 flex-shrink-0"
                            >
                              {selectedAssets.has(asset.id) ? (
                                <CheckSquare className="w-5 h-5 text-[#2BBEB4]" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400 border-2 border-gray-300 rounded" />
                              )}
                            </button>

                            {/* Asset Details */}
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-serif font-semibold text-[#333333]">
                                  {asset.name}
                                </h4>
                                {isAIAutoFill(asset.name) && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <BlocIQBadge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-300">
                                        🧠 AI Auto-fill
                                      </BlocIQBadge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>This asset is commonly required for buildings like yours</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              
                              {asset.description && (
                                <p className="text-gray-600 font-serif mb-3">
                                  {asset.description}
                                </p>
                              )}

                              <div className="flex items-center space-x-4 text-sm text-gray-500 font-serif">
                                {asset.recommended_frequency && (
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>Frequency: {asset.recommended_frequency}</span>
                                  </div>
                                )}
                                
                                {asset.category && (
                                  <div className="flex items-center space-x-1">
                                    <Info className="w-4 h-4" />
                                    <span>Category: {asset.category}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </BlocIQCardContent>
                )}
              </BlocIQCard>
            )
          })}
        </div>

        {/* 💅 Sticky "Save & Continue" Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-600 font-serif">
              {selectedCount} compliance requirements selected
            </div>
            <div className="flex items-center space-x-3">
              <BlocIQButton
                variant="outline"
                onClick={() => router.back()}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </BlocIQButton>
              <BlocIQButton
                onClick={handleSaveAndContinue}
                disabled={isSaving}
                className="bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white min-w-[160px]"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : saveStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save & Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </BlocIQButton>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
} 