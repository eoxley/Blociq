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
  Square
} from 'lucide-react'
import { Tables } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type ComplianceAsset = Tables<'compliance_assets'> & {
  recommended_frequency?: string
}

type Building = Tables<'buildings'>

interface ComplianceSetupClientProps {
  building: Building
  groupedAssets: Record<string, (ComplianceAsset & { isActive: boolean })[]>
  buildingId: string
}

// Category configurations with tooltips
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

export default function ComplianceSetupClient({ 
  building, 
  groupedAssets, 
  buildingId 
}: ComplianceSetupClientProps) {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(
    new Set(
      Object.values(groupedAssets)
        .flat()
        .filter(asset => asset.isActive)
        .map(asset => asset.id)
    )
  )
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

  const handleSaveAndContinue = async () => {
    setIsSaving(true)
    setSaveStatus('saving')

    try {
      // Get all existing building compliance assets
      const { data: existingAssets, error: fetchError } = await supabase
        .from('building_compliance_assets')
        .select('asset_id')
        .eq('building_id', buildingId)

      if (fetchError) {
        console.error('Error fetching existing assets:', fetchError)
        setSaveStatus('error')
        return
      }

      const existingAssetIds = new Set(existingAssets?.map(asset => asset.asset_id) || [])
      const selectedAssetIds = Array.from(selectedAssets)

      // Assets to add (new selections)
      const assetsToAdd = selectedAssetIds.filter(id => !existingAssetIds.has(id))
      
      // Assets to remove (deselected)
      const assetsToRemove = Array.from(existingAssetIds).filter(id => !selectedAssets.has(id))

      // Add new assets
      if (assetsToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('building_compliance_assets')
          .upsert(
            assetsToAdd.map(assetId => ({
              building_id: parseInt(buildingId),
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

      // Remove deselected assets
      if (assetsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('building_compliance_assets')
          .delete()
          .eq('building_id', buildingId)
          .in('asset_id', assetsToRemove)

        if (deleteError) {
          console.error('Error removing assets:', deleteError)
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
      '2 years': 'bg-green-100 text-green-800 border-green-200',
      '3 years': 'bg-purple-100 text-purple-800 border-purple-200',
      '5 years': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      '10 years': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[frequency as keyof typeof colors] || colors['1 year']
  }

  const selectedCount = selectedAssets.size
  const totalCount = Object.values(groupedAssets).flat().length

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#FAFAFA]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-serif text-[#333333] font-bold">
                  Compliance Setup
                </h1>
                <p className="text-lg text-gray-600 mt-1">
                  {building.name} • Select applicable compliance requirements
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Selected</p>
                  <p className="text-2xl font-bold text-[#2BBEB4]">
                    {selectedCount} / {totalCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Instructions */}
            <Card className="bg-gradient-to-r from-[#2BBEB4]/10 to-[#0F5D5D]/10 border-[#2BBEB4]/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-[#2BBEB4] rounded-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#333333] mb-2">
                      Setup Your Building's Compliance Requirements
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Select the compliance assets that apply to {building.name}. 
                      This will create a tailored compliance tracking system for your building. 
                      Assets marked with 🧠 will be auto-filled when relevant documents are uploaded.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Categories */}
            <div className="space-y-8">
              {Object.entries(groupedAssets).map(([category, assets]) => {
                const config = categoryConfigs[category as keyof typeof categoryConfigs] || categoryConfigs['Admin']
                const IconComponent = config.icon
                
                return (
                  <div key={category} className="space-y-4">
                    {/* Category Header */}
                    <div className="flex items-center gap-3 sticky top-24 z-10 bg-[#FAFAFA] py-2">
                      <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-serif font-semibold text-[#333333]">
                          {category}
                        </h2>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{config.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex-1 border-t border-gray-300 ml-4"></div>
                    </div>

                    {/* Assets Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {assets.map((asset) => {
                        const isSelected = selectedAssets.has(asset.id)
                        const isAI = isAIAutoFill(asset.name)
                        
                        return (
                          <Card 
                            key={asset.id} 
                            className={`transition-all duration-200 hover:shadow-lg cursor-pointer ${
                              isSelected 
                                ? 'ring-2 ring-[#2BBEB4] bg-[#2BBEB4]/5' 
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => handleAssetToggle(asset.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <div className="mt-1">
                                  {isSelected ? (
                                    <CheckSquare className="h-5 w-5 text-[#2BBEB4]" />
                                  ) : (
                                    <Square className="h-5 w-5 text-gray-400" />
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="font-semibold text-[#333333] leading-tight">
                                      {asset.name}
                                    </h3>
                                    {isAI && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                                            🧠 AI Auto-fill
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Auto-filled from uploaded document</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>

                                  {asset.description && (
                                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                                      {asset.description}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${getFrequencyColor(asset.recommended_frequency || '1 year')}`}
                                    >
                                      📆 {asset.recommended_frequency || '1 year'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sticky Save Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedCount} of {totalCount} assets selected
            </div>
            
            <div className="flex items-center gap-4">
              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Saved successfully!</span>
                </div>
              )}
              
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Error saving. Please try again.</span>
                </div>
              )}

              <Button
                onClick={handleSaveAndContinue}
                disabled={isSaving}
                className="bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save & Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
} 