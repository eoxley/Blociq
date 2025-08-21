'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Shield, CheckSquare, Square, Clock, Brain, Save, ArrowRight, AlertTriangle, CheckCircle, Building2, FileText, Settings, Zap, CheckCircle2, XCircle, Plus, Minus, Eye, EyeOff, Search } from 'lucide-react'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { toast } from 'sonner'

// Enhanced category configurations with better organization
const categoryConfigs = {
  'Fire Safety': {
    description: 'Fire risk assessments, alarms, extinguishers, emergency lighting',
    color: 'bg-red-50 border-red-200 text-red-700',
    icon: Shield,
    emoji: '🔥',
    priority: 1
  },
  'BSA (Building Safety Act)': {
    description: 'Building safety case, safety case report, mandatory occurrence reporting',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    icon: AlertTriangle,
    emoji: '⚠️',
    priority: 2
  },
  'Electrical': {
    description: 'EICR certificates, electrical installations, PAT testing',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    icon: Zap,
    emoji: '⚡',
    priority: 3
  },
  'Gas Safety': {
    description: 'Gas safety certificates, boiler inspections, gas installations',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    icon: Shield,
    emoji: '🔥',
    priority: 4
  },
  'Lifts & Equipment': {
    description: 'Lift inspections, equipment maintenance, LOLER certificates',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    icon: Settings,
    emoji: '⚙️',
    priority: 5
  },
  'Structural': {
    description: 'Building condition surveys, structural assessments, roof inspections',
    color: 'bg-green-50 border-green-200 text-green-700',
    icon: Building2,
    emoji: '🏗️',
    priority: 6
  },
  'Insurance': {
    description: 'Building insurance, liability insurance, professional indemnity',
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    icon: Shield,
    emoji: '🛡️',
    priority: 7
  },
  'Legal & Documentation': {
    description: 'Lease compliance, service charge certificates, health & safety',
    color: 'bg-gray-50 border-gray-200 text-gray-700',
    icon: FileText,
    emoji: '📋',
    priority: 8
  }
}

interface ComplianceAsset {
  id: string
  name: string
  category: string
  description?: string
  frequency_months?: number
  is_required?: boolean
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
  const [saveMessage, setSaveMessage] = ''
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)

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
    const aiKeywords = ['fire', 'fra', 'gas', 'asbestos', 'lift', 'eicr', 'd&o', 'insurance', 'epc', 'bsa', 'building safety']
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

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const selectAllInCategory = (category: string, select: boolean) => {
    const newSelected = new Set(selectedAssets)
    const categoryAssets = groupedAssets[category] || []
    
    categoryAssets.forEach(asset => {
      if (select) {
        newSelected.add(asset.id)
      } else {
        newSelected.delete(asset.id)
      }
    })
    
    setSelectedAssets(newSelected)
  }

  const selectAllAssets = (select: boolean) => {
    const newSelected = new Set<string>()
    if (select) {
      Object.values(groupedAssets).forEach(assets => {
        assets.forEach(asset => {
          newSelected.add(asset.id)
        })
      })
    }
    setSelectedAssets(newSelected)
  }

  const saveSelections = async () => {
    if (selectedAssets.size === 0) {
      toast.error('Please select at least one compliance asset')
      return
    }

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
        compliance_asset_id: assetId,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      // Delete unselected assets
      const unselectedAssets = Array.from(allAssetIds).filter(id => !selectedAssets.has(id))
      if (unselectedAssets.length > 0) {
        const { error: deleteError } = await supabase
          .from('building_compliance_assets')
          .delete()
          .eq('building_id', buildingId)
          .in('compliance_asset_id', unselectedAssets)

        if (deleteError) {
          console.error('Error deleting unselected assets:', deleteError)
          throw new Error('Failed to remove unselected assets')
        }
      }

      // Upsert selected assets
      if (upsertData.length > 0) {
        const { error: upsertError } = await supabase
          .from('building_compliance_assets')
          .upsert(upsertData, { 
            onConflict: 'building_id,compliance_asset_id',
            ignoreDuplicates: false 
          })

        if (upsertError) {
          console.error('Error upserting selected assets:', upsertError)
          throw new Error('Failed to save selected assets')
        }
      }

      setSaveStatus('success')
      setSaveMessage(`Successfully saved ${selectedAssets.size} compliance assets`)
      toast.success(`Compliance setup saved successfully!`)
      
      // Redirect to tracking page after successful save
      setTimeout(() => {
        window.location.href = `/buildings/${buildingId}/compliance/tracker`
      }, 1500)

    } catch (error) {
      console.error('Error saving compliance setup:', error)
      setSaveStatus('error')
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save compliance setup')
      toast.error('Failed to save compliance setup')
    } finally {
      setSaving(false)
    }
  }

  // Filter assets based on search and selection
  const filteredGroupedAssets = Object.entries(groupedAssets).reduce((acc, [category, assets]) => {
    const filteredAssets = assets.filter(asset => {
      const matchesSearch = !searchTerm || 
        asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.category.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesSelection = !showSelectedOnly || selectedAssets.has(asset.id)
      
      return matchesSearch && matchesSelection
    })

    if (filteredAssets.length > 0) {
      acc[category] = filteredAssets
    }

    return acc
  }, {} as Record<string, ComplianceAsset[]>)

  // Sort categories by priority
  const sortedCategories = Object.keys(filteredGroupedAssets).sort((a, b) => {
    const priorityA = categoryConfigs[a as keyof typeof categoryConfigs]?.priority || 999
    const priorityB = categoryConfigs[b as keyof typeof categoryConfigs]?.priority || 999
    return priorityA - priorityB
  })

  const totalAssets = Object.values(groupedAssets).reduce((sum, assets) => sum + assets.length, 0)
  const selectedCount = selectedAssets.size

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">
              Compliance Setup - {building.name}
            </h1>
            <p className="text-lg text-gray-600">
              Select which compliance assets apply to this building
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-[#0F5D5D]">{selectedCount}</div>
              <div className="text-sm text-gray-600">of {totalAssets} selected</div>
            </div>
            <BlocIQButton
              onClick={saveSelections}
              disabled={saving || selectedCount === 0}
              className="px-8 py-3"
            >
              {saving ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save & Continue
                </>
              )}
            </BlocIQButton>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search compliance assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showSelectedOnly}
                onChange={(e) => setShowSelectedOnly(e.target.checked)}
                className="rounded border-gray-300 text-[#0F5D5D] focus:ring-[#0F5D5D]"
              />
              <span className="text-sm text-gray-600">Show selected only</span>
            </label>
            
            <div className="flex gap-2">
              <BlocIQButton
                variant="outline"
                size="sm"
                onClick={() => selectAllAssets(true)}
                className="px-4 py-2"
              >
                Select All
              </BlocIQButton>
              <BlocIQButton
                variant="outline"
                size="sm"
                onClick={() => selectAllAssets(false)}
                className="px-4 py-2"
              >
                Clear All
              </BlocIQButton>
            </div>
          </div>
        </div>

        {/* Save Status */}
        {saveStatus !== 'idle' && (
          <div className={`p-4 rounded-lg mb-6 ${
            saveStatus === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {saveStatus === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className="font-medium">{saveMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Compliance Assets by Category */}
      <div className="space-y-6">
        {sortedCategories.map(category => {
          const assets = filteredGroupedAssets[category]
          const categoryConfig = categoryConfigs[category as keyof typeof categoryConfigs]
          const isExpanded = expandedCategories.has(category)
          const selectedInCategory = assets.filter(asset => selectedAssets.has(asset.id)).length
          const totalInCategory = assets.length

          return (
            <BlocIQCard key={category} className="overflow-hidden">
              <BlocIQCardHeader 
                className={`${categoryConfig?.color} cursor-pointer hover:opacity-90 transition-opacity`}
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{categoryConfig?.emoji}</span>
                    <div>
                      <h3 className="text-xl font-bold">{category}</h3>
                      <p className="text-sm opacity-80">{categoryConfig?.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm opacity-80">
                        {selectedInCategory} of {totalInCategory} selected
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <BlocIQButton
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          selectAllInCategory(category, true)
                        }}
                        className="px-3 py-1 text-xs"
                      >
                        Select All
                      </BlocIQButton>
                      <BlocIQButton
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          selectAllInCategory(category, false)
                        }}
                        className="px-3 py-1 text-xs"
                      >
                        Clear All
                      </BlocIQButton>
                    </div>
                    
                    {isExpanded ? (
                      <Minus className="h-5 w-5" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </BlocIQCardHeader>

              {isExpanded && (
                <BlocIQCardContent className="p-0">
                  <div className="grid gap-4 p-6">
                    {assets.map(asset => (
                      <div
                        key={asset.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                          selectedAssets.has(asset.id)
                            ? 'border-[#0F5D5D] bg-[#0F5D5D]/5'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedAssets.has(asset.id)}
                            onChange={(e) => handleAssetToggle(asset.id, e.target.checked)}
                            className="h-5 w-5 rounded border-gray-300 text-[#0F5D5D] focus:ring-[#0F5D5D]"
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">{asset.title}</h4>
                              {asset.is_required && (
                                <BlocIQBadge variant="destructive" className="text-xs">
                                  Required
                                </BlocIQBadge>
                              )}
                              {isAIAsset(asset.title) && (
                                <BlocIQBadge variant="secondary" className="text-xs">
                                  <Brain className="h-3 w-3 mr-1" />
                                  AI Enhanced
                                </BlocIQBadge>
                              )}
                            </div>
                            
                            {asset.description && (
                              <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                            )}
                            
                            {asset.frequency_months && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>Every {asset.frequency_months} months</span>
                              </div>
                            )}
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

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedCount} of {totalAssets} compliance assets selected
          </div>
          
          <div className="flex gap-4">
            <BlocIQButton
              variant="outline"
              onClick={() => window.history.back()}
              className="px-6 py-2"
            >
              Cancel
            </BlocIQButton>
            
            <BlocIQButton
              onClick={saveSelections}
              disabled={saving || selectedCount === 0}
              className="px-8 py-2"
            >
              {saving ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save & Continue to Tracking
                </>
              )}
            </BlocIQButton>
          </div>
        </div>
      </div>
    </div>
  )
} 