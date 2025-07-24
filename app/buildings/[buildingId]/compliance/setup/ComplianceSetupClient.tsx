'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Shield, CheckSquare, Square, Clock, Brain, Save, ArrowRight, AlertTriangle, CheckCircle, Building2, FileText, Settings, Zap, CheckCircle2, XCircle } from 'lucide-react'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { BlocIQButton } from '@/components/ui/blociq-button'

// Category configurations with BlocIQ styling
const categoryConfigs = {
  'Legal & Safety': {
    description: 'Fire, electrical and health legislation',
    color: 'bg-red-50 border-red-200 text-red-700',
    icon: Shield,
    emoji: '🔥'
  },
  'Structural & Condition': {
    description: 'Building structure and condition assessments',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    icon: Building2,
    emoji: '🏗️'
  },
  'Operational & Contracts': {
    description: 'Service contracts and operational requirements',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    icon: Settings,
    emoji: '⚙️'
  },
  'Insurance': {
    description: 'Building and liability insurance requirements',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    icon: Shield,
    emoji: '🛡️'
  },
  'Lease & Documentation': {
    description: 'Lease compliance and documentation requirements',
    color: 'bg-green-50 border-green-200 text-green-700',
    icon: FileText,
    emoji: '📋'
  },
  'Admin': {
    description: 'Administrative and reporting requirements',
    color: 'bg-gray-50 border-gray-200 text-gray-700',
    icon: CheckCircle,
    emoji: '📊'
  },
  'Smart Records': {
    description: 'Digital record keeping and smart building systems',
    color: 'bg-teal-50 border-teal-200 text-teal-700',
    icon: Zap,
    emoji: '⚡'
  },
  'Safety': {
    description: 'BSA-specific safety requirements',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    icon: AlertTriangle,
    emoji: '⚠️'
  }
}

interface ComplianceAsset {
  id: string
  name: string
  category: string
  description?: string
  recommended_frequency?: string
  isSelected: boolean
}

interface Building {
  id: string
  name: string
  address?: string
}

interface ComplianceSetupClientProps {
  building: Building
  groupedAssets: Record<string, ComplianceAsset[]>
  buildingId: string
}

export default function ComplianceSetupClient({ 
  building, 
  groupedAssets, 
  buildingId 
}: ComplianceSetupClientProps) {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')

  // Initialize selected assets from props
  useEffect(() => {
    const initialSelected = new Set<string>()
    Object.values(groupedAssets).forEach(assets => {
      assets.forEach(asset => {
        if (asset.isSelected) {
          initialSelected.add(asset.id)
        }
      })
    })
    setSelectedAssets(initialSelected)
  }, [groupedAssets])

  // Helper functions
  const isAIAsset = (assetName: string) => {
    const aiKeywords = ['fire', 'fra', 'gas', 'asbestos', 'lift', 'eicr', 'd&o', 'insurance', 'epc']
    return aiKeywords.some(keyword => 
      assetName.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  const handleAssetToggle = (assetId: string, checked: boolean) => {
    const newSelected = new Set(selectedAssets)
    if (checked) {
      newSelected.add(assetId)
    } else {
      newSelected.delete(assetId)
    }
    setSelectedAssets(newSelected)
  }

  const saveSelections = async () => {
    setSaving(true)
    setSaveStatus('idle')
    setSaveMessage('')

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Get all asset IDs from grouped assets
      const allAssetIds = new Set<string>()
      Object.values(groupedAssets).forEach(assets => {
        assets.forEach(asset => {
          allAssetIds.add(asset.id)
        })
      })

      // Prepare upsert data for selected assets
      const upsertData = Array.from(selectedAssets).map(assetId => ({
        building_id: buildingId,
        asset_id: assetId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      // Upsert selected assets
      if (upsertData.length > 0) {
        const { error: upsertError } = await supabase
          .from('building_compliance_assets')
          .upsert(upsertData, { onConflict: 'building_id,asset_id' })

        if (upsertError) {
          throw new Error(`Failed to save selected assets: ${upsertError.message}`)
        }
      }

      // Update unselected assets to inactive
      const unselectedAssetIds = Array.from(allAssetIds).filter(id => !selectedAssets.has(id))
      
      if (unselectedAssetIds.length > 0) {
        const { error: updateError } = await supabase
          .from('building_compliance_assets')
          .update({ status: 'inactive', updated_at: new Date().toISOString() })
          .eq('building_id', buildingId)
          .in('asset_id', unselectedAssetIds)

        if (updateError) {
          throw new Error(`Failed to update unselected assets: ${updateError.message}`)
        }
      }

      setSaveStatus('success')
      setSaveMessage(`Successfully saved ${selectedAssets.size} compliance assets for ${building.name}`)
      
      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = `/buildings/${buildingId}/compliance`
      }, 2000)

    } catch (error) {
      console.error('Error saving compliance selections:', error)
      setSaveStatus('error')
      setSaveMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const getSelectedCount = (assets: ComplianceAsset[]) => {
    return assets.filter(asset => selectedAssets.has(asset.id)).length
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with BlocIQ Gradient Background */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-serif font-bold">Compliance Setup</h1>
                <p className="text-white/90 text-lg">{building.name}</p>
                <p className="text-white/80 text-sm">{building.address}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{selectedAssets.size}</div>
            <div className="text-white/80 text-sm">Currently Selected</div>
          </div>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus !== 'idle' && (
        <BlocIQCard variant="elevated">
          <BlocIQCardContent>
            <div className={`flex items-center gap-3 p-4 rounded-xl ${
              saveStatus === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {saveStatus === 'success' ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <p className={`font-semibold ${
                  saveStatus === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {saveStatus === 'success' ? 'Success!' : 'Error'}
                </p>
                <p className={`text-sm ${
                  saveStatus === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {saveMessage}
                </p>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      )}

      {/* Setup Instructions */}
      <BlocIQCard variant="elevated">
        <BlocIQCardContent>
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-[#2BBEB4] rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#333333] mb-3">
              Configure Compliance Tracking
            </h2>
            <p className="text-[#64748B] max-w-2xl mx-auto">
              Select the compliance requirements that apply to {building.name}. 
              This will set up your compliance tracking dashboard and help you monitor deadlines and requirements.
            </p>
          </div>
        </BlocIQCardContent>
      </BlocIQCard>

      {/* Compliance Categories */}
      {Object.keys(groupedAssets).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedAssets).map(([category, assets]) => {
            const config = categoryConfigs[category as keyof typeof categoryConfigs] || {
              description: 'Other compliance requirements',
              color: 'bg-gray-50 border-gray-200 text-gray-700',
              icon: Shield,
              emoji: '📋'
            }
            const IconComponent = config.icon
            const selectedCount = getSelectedCount(assets)
            
            return (
              <BlocIQCard key={category} variant="elevated">
                <BlocIQCardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-serif font-semibold text-[#333333]">
                          {config.emoji} {category}
                        </h2>
                        <p className="text-sm text-[#64748B]">{config.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <BlocIQBadge variant="secondary" className="bg-gray-100 text-gray-700">
                        {selectedCount} of {assets.length} selected
                      </BlocIQBadge>
                    </div>
                  </div>
                </BlocIQCardHeader>
                
                <BlocIQCardContent>
                  <div className="space-y-4">
                    {assets.map((asset) => {
                      const isAI = isAIAsset(asset.name)
                      const isChecked = selectedAssets.has(asset.id)
                      
                      return (
                        <div 
                          key={asset.id} 
                          className="bg-gradient-to-r from-[#F0FDFA] to-emerald-50 rounded-xl p-6 border border-[#E2E8F0] hover:shadow-lg transition-all duration-200"
                        >
                          <div className="flex items-start space-x-4">
                            {/* Checkbox */}
                            <div className="mt-1 flex-shrink-0">
                              <input
                                type="checkbox"
                                id={`asset-${asset.id}`}
                                checked={isChecked}
                                onChange={(e) => handleAssetToggle(asset.id, e.target.checked)}
                                disabled={saving}
                                className="w-5 h-5 text-[#008C8F] bg-gray-100 border-gray-300 rounded focus:ring-[#008C8F] focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </div>

                            {/* Asset Details */}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <label 
                                  htmlFor={`asset-${asset.id}`}
                                  className="text-lg font-serif font-semibold text-[#333333] cursor-pointer"
                                >
                                  {asset.name}
                                </label>
                                {isAI && (
                                  <BlocIQBadge variant="success" size="sm">
                                    🧠 AI Auto-fill
                                  </BlocIQBadge>
                                )}
                              </div>
                              
                              {asset.description && (
                                <p className="text-sm text-[#64748B] mb-3">
                                  {asset.description}
                                </p>
                              )}

                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                {asset.recommended_frequency && (
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-4 w-4" />
                                    <BlocIQBadge variant="secondary" size="sm">
                                      {asset.recommended_frequency}
                                    </BlocIQBadge>
                                  </div>
                                )}
                              </div>
                            </div>
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
      ) : (
        /* Empty State */
        <BlocIQCard variant="elevated">
          <BlocIQCardContent>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#2BBEB4] rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                No Compliance Assets Available
              </h2>
              <p className="text-[#64748B] mb-6 max-w-md mx-auto">
                No compliance assets have been configured in the system. Please contact your administrator.
              </p>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      )}

      {/* Call to Action */}
      <BlocIQCard variant="elevated">
        <BlocIQCardContent>
          <div className="text-center py-6">
            <h3 className="text-xl font-serif font-semibold text-[#333333] mb-4">
              Ready to Start Compliance Tracking?
            </h3>
            <p className="text-[#64748B] mb-6">
              Your selections will be saved and you'll be redirected to the compliance dashboard.
            </p>
            <div className="space-y-3">
              <BlocIQButton
                variant="primary"
                className="w-full bg-gradient-to-r from-[#008C8F] to-[#2BBEB4] hover:from-[#007B8A] hover:to-[#2BBEB4] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={saveSelections}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Start Compliance Tracking
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </BlocIQButton>
            </div>
          </div>
        </BlocIQCardContent>
      </BlocIQCard>
    </div>
  )
} 