'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { CheckCircle, ChevronRight, ChevronLeft, Building, Shield, Settings, CheckSquare, Square, AlertCircle, Loader2, Save, ArrowRight, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Building {
  id: string
  name: string
  address: string | null
  unit_count: number | null
}

interface ComplianceAsset {
  id: string
  name: string
  description: string | null
  category: string | null
  required_if?: string
  default_frequency?: string
  priority?: string
  legal_requirement?: boolean
}

interface BuildingComplianceAsset {
  id: string
  building_id: number
  asset_id: string
  status: string
  notes: string | null
  next_due_date: string | null
  last_updated: string
}

interface SetupData {
  buildings: Building[]
  assets: ComplianceAsset[]
  existingCompliance: BuildingComplianceAsset[]
}

type SetupStep = 'buildings' | 'assets' | 'configuration' | 'review' | 'complete'

export default function ComplianceSetupWizard() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<SetupStep>('buildings')
  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(new Set())
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [buildingConfigs, setBuildingConfigs] = useState<Record<string, {
    assets: Set<string>
    frequencies: Record<string, string>
    notes: Record<string, string>
  }>>({})
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [setupData, setSetupData] = useState<SetupData>({
    buildings: [],
    assets: [],
    existingCompliance: []
  })

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true)
        
        // Fetch all buildings
        const { data: buildings, error: buildingsError } = await supabase
          .from('buildings')
          .select('id, name, address, unit_count')
          .order('name', { ascending: true })

        if (buildingsError) {
          console.error('Error fetching buildings:', buildingsError)
          toast.error('Could not load buildings')
          return
        }

        // Fetch all compliance assets
        const { data: assets, error: assetsError } = await supabase
          .from('compliance_assets')
          .select('*')
          .order('category', { ascending: true })

        if (assetsError) {
          console.error('Error fetching compliance assets:', assetsError)
          toast.error('Could not load compliance assets')
          return
        }

        // Fetch existing building compliance data
        const { data: existingCompliance, error: complianceError } = await supabase
          .from('building_compliance_assets')
          .select('*')

        if (complianceError) {
          console.error('Error fetching existing compliance:', complianceError)
        }

        setSetupData({
          buildings: buildings || [],
          assets: assets || [],
          existingCompliance: existingCompliance || []
        })
      } catch (error) {
        console.error('Error fetching setup data:', error)
        toast.error('Failed to load setup data')
      } finally {
        setDataLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  // Show loading state while fetching data
  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#008C8F] mx-auto" />
          <p className="text-[#64748B]">Loading compliance setup data...</p>
        </div>
      </div>
    )
  }

  // Group assets by category
  const groupedAssets = setupData.assets.reduce((acc, asset) => {
    const category = asset.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(asset)
    return acc
  }, {} as Record<string, ComplianceAsset[]>)

  // Get existing compliance for a building
  const getExistingCompliance = (buildingId: string) => {
    return setupData.existingCompliance.filter(comp => 
      comp.building_id === parseInt(buildingId, 10)
    )
  }

  // Toggle building selection
  const toggleBuilding = (buildingId: string) => {
    const newSelected = new Set(selectedBuildings)
    if (newSelected.has(buildingId)) {
      newSelected.delete(buildingId)
      // Remove building config when deselected
      const newConfigs = { ...buildingConfigs }
      delete newConfigs[buildingId]
      setBuildingConfigs(newConfigs)
    } else {
      newSelected.add(buildingId)
      // Initialize building config
      setBuildingConfigs(prev => ({
        ...prev,
        [buildingId]: {
          assets: new Set(),
          frequencies: {},
          notes: {}
        }
      }))
    }
    setSelectedBuildings(newSelected)
  }

  // Toggle asset selection for a building
  const toggleAssetForBuilding = (buildingId: string, assetId: string) => {
    setBuildingConfigs(prev => {
      const buildingConfig = prev[buildingId] || { assets: new Set(), frequencies: {}, notes: {} }
      const newAssets = new Set(buildingConfig.assets)
      
      if (newAssets.has(assetId)) {
        newAssets.delete(assetId)
        // Remove asset config
        const newFrequencies = { ...buildingConfig.frequencies }
        const newNotes = { ...buildingConfig.notes }
        delete newFrequencies[assetId]
        delete newNotes[assetId]
        
        return {
          ...prev,
          [buildingId]: {
            assets: newAssets,
            frequencies: newFrequencies,
            notes: newNotes
          }
        }
      } else {
        newAssets.add(assetId)
        return {
          ...prev,
          [buildingId]: {
            assets: newAssets,
            frequencies: buildingConfig.frequencies,
            notes: buildingConfig.notes
          }
        }
      }
    })
  }

  // Update frequency for an asset
  const updateFrequency = (buildingId: string, assetId: string, frequency: string) => {
    setBuildingConfigs(prev => ({
      ...prev,
      [buildingId]: {
        ...prev[buildingId],
        frequencies: {
          ...prev[buildingId]?.frequencies,
          [assetId]: frequency
        }
      }
    }))
  }

  // Update notes for an asset
  const updateNotes = (buildingId: string, assetId: string, notes: string) => {
    setBuildingConfigs(prev => ({
      ...prev,
      [buildingId]: {
        ...prev[buildingId],
        notes: {
          ...prev[buildingId]?.notes,
          [assetId]: notes
        }
      }
    }))
  }

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      'Safety': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
      'Fire': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
      'Electrical': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
      'Gas': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
      'Health': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
      'Structural': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
      'Insurance': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
      'Energy': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
      'Equipment': { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' }
    }
    
    return colors[category] || colors['Structural']
  }

  // Save compliance configuration
  const saveComplianceConfig = async () => {
    setLoading(true)
    
    try {
      const complianceRecords = []
      
      for (const buildingId of selectedBuildings) {
        const buildingConfig = buildingConfigs[buildingId]
        if (!buildingConfig) continue
        
        for (const assetId of buildingConfig.assets) {
          const asset = setupData.assets.find(a => a.id === assetId)
          if (!asset) continue
          
          complianceRecords.push({
            building_id: parseInt(buildingId, 10),
            asset_id: assetId,
            status: 'Missing',
            next_due_date: null,
            notes: buildingConfig.notes[assetId] || null,
            last_updated: new Date().toISOString()
          })
        }
      }
      
      if (complianceRecords.length > 0) {
        const { error } = await supabase
          .from('building_compliance_assets')
          .upsert(complianceRecords, { 
            onConflict: 'building_id,asset_id',
            ignoreDuplicates: false 
          })
        
        if (error) throw error
      }
      
      toast.success('Compliance configuration saved successfully!')
      setCurrentStep('complete')
      
    } catch (error) {
      console.error('Error saving compliance config:', error)
      toast.error('Failed to save compliance configuration')
    } finally {
      setLoading(false)
    }
  }

  // Navigation functions
  const nextStep = () => {
    const steps: SetupStep[] = ['buildings', 'assets', 'configuration', 'review', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const prevStep = () => {
    const steps: SetupStep[] = ['buildings', 'assets', 'configuration', 'review', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  // Step validation
  const canProceed = () => {
    switch (currentStep) {
      case 'buildings':
        return selectedBuildings.size > 0
      case 'assets':
        return selectedBuildings.size > 0
      case 'configuration':
        return selectedBuildings.size > 0
      case 'review':
        return true
      default:
        return false
    }
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
                <h1 className="text-3xl font-bold">Compliance Setup Wizard</h1>
                <p className="text-white/90 text-lg">Configure compliance tracking for your buildings</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BlocIQBadge variant="outline" className="bg-white/20 text-white border-white/30">
              Step {['buildings', 'assets', 'configuration', 'review', 'complete'].indexOf(currentStep) + 1} of 5
            </BlocIQBadge>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-4">
          {['buildings', 'assets', 'configuration', 'review', 'complete'].map((step, index) => {
            const isActive = step === currentStep
            const isCompleted = ['buildings', 'assets', 'configuration', 'review', 'complete'].indexOf(currentStep) > index
            
            return (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isActive 
                    ? 'bg-[#008C8F] text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {/* Step 1: Select Buildings */}
        {currentStep === 'buildings' && (
          <BlocIQCard variant="elevated">
            <BlocIQCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center">
                  <Building className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#333333]">Select Buildings</h2>
                  <p className="text-sm text-[#64748B]">Choose which buildings to set up compliance tracking for</p>
                </div>
              </div>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {setupData.buildings.map((building) => {
                  const isSelected = selectedBuildings.has(building.id)
                  const existingCompliance = getExistingCompliance(building.id)
                  
                  return (
                    <div
                      key={building.id}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-[#008C8F] bg-gradient-to-br from-[#F0FDFA] to-blue-50'
                          : 'border-[#E2E8F0] bg-white hover:border-[#008C8F] hover:bg-[#FAFAFA]'
                      }`}
                      onClick={() => toggleBuilding(building.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#333333] mb-1">{building.name}</h3>
                          {building.address && (
                            <p className="text-sm text-[#64748B] mb-2">{building.address}</p>
                          )}
                          {building.unit_count && (
                            <p className="text-sm text-[#64748B]">{building.unit_count} units</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-[#008C8F]" />
                          ) : (
                            <Square className="h-5 w-5 text-[#64748B]" />
                          )}
                        </div>
                      </div>
                      
                      {existingCompliance.length > 0 && (
                        <div className="bg-[#F0FDFA] p-2 rounded-lg border border-[#2BBEB4]">
                          <div className="flex items-center gap-2 text-xs text-[#0F5D5D]">
                            <CheckCircle className="h-3 w-3" />
                            <span>{existingCompliance.length} compliance items already configured</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {selectedBuildings.size === 0 && (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-[#64748B] mx-auto mb-3" />
                  <p className="text-[#64748B]">Select at least one building to continue</p>
                </div>
              )}
            </BlocIQCardContent>
          </BlocIQCard>
        )}

        {/* Step 2: Select Assets */}
        {currentStep === 'assets' && (
          <BlocIQCard variant="elevated">
            <BlocIQCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#333333]">Compliance Assets</h2>
                  <p className="text-sm text-[#64748B]">Review available compliance requirements</p>
                </div>
              </div>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              <div className="space-y-4">
                {Object.entries(groupedAssets).map(([category, assets]) => {
                  const isExpanded = expandedCategories.has(category)
                  const categoryColors = getCategoryColor(category)
                  
                  return (
                    <div key={category} className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                      <div
                        className={`${categoryColors.bg} p-4 cursor-pointer`}
                        onClick={() => toggleCategory(category)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className={`font-semibold ${categoryColors.text}`}>{category}</h3>
                            <BlocIQBadge variant="outline" className={`${categoryColors.border} ${categoryColors.text}`}>
                              {assets.length} items
                            </BlocIQBadge>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-[#64748B]" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-[#64748B]" />
                          )}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-4 space-y-3">
                          {assets.map((asset) => (
                            <div key={asset.id} className="bg-[#FAFAFA] p-3 rounded-lg border border-[#E2E8F0]">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-[#333333] mb-1">{asset.name}</h4>
                                  {asset.description && (
                                    <p className="text-sm text-[#64748B] mb-2">{asset.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-[#64748B]">
                                    {asset.default_frequency && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{asset.default_frequency}</span>
                                      </div>
                                    )}
                                    {asset.required_if && (
                                      <div className="flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        <span>{asset.required_if}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </BlocIQCardContent>
          </BlocIQCard>
        )}

        {/* Step 3: Configuration */}
        {currentStep === 'configuration' && (
          <div className="space-y-6">
            {Array.from(selectedBuildings).map((buildingId) => {
              const building = setupData.buildings.find(b => b.id === buildingId)
              const buildingConfig = buildingConfigs[buildingId]
              
              if (!building || !buildingConfig) return null
              
              return (
                <BlocIQCard key={buildingId} variant="elevated">
                  <BlocIQCardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#7645ED] to-purple-600 rounded-xl flex items-center justify-center">
                        <Settings className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#333333]">{building.name}</h2>
                        <p className="text-sm text-[#64748B]">Configure compliance tracking</p>
                      </div>
                    </div>
                  </BlocIQCardHeader>
                  <BlocIQCardContent>
                    <div className="space-y-4">
                      {Object.entries(groupedAssets).map(([category, assets]) => (
                        <div key={category} className="space-y-3">
                          <h3 className="font-semibold text-[#333333] border-b pb-2">{category}</h3>
                          {assets.map((asset) => {
                            const isSelected = buildingConfig.assets.has(asset.id)
                            const frequency = buildingConfig.frequencies[asset.id] || asset.default_frequency || '1 year'
                            const notes = buildingConfig.notes[asset.id] || ''
                            
                            return (
                              <div key={asset.id} className="bg-[#FAFAFA] p-4 rounded-lg border border-[#E2E8F0]">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="font-medium text-[#333333]">{asset.name}</h4>
                                      {isSelected ? (
                                        <CheckSquare 
                                          className="h-5 w-5 text-[#008C8F] cursor-pointer" 
                                          onClick={() => toggleAssetForBuilding(buildingId, asset.id)}
                                        />
                                      ) : (
                                        <Square 
                                          className="h-5 w-5 text-[#64748B] cursor-pointer" 
                                          onClick={() => toggleAssetForBuilding(buildingId, asset.id)}
                                        />
                                      )}
                                    </div>
                                    {asset.description && (
                                      <p className="text-sm text-[#64748B] mb-3">{asset.description}</p>
                                    )}
                                  </div>
                                </div>
                                
                                {isSelected && (
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-sm font-medium text-[#333333] mb-1">
                                        Frequency
                                      </label>
                                      <select
                                        value={frequency}
                                        onChange={(e) => updateFrequency(buildingId, asset.id, e.target.value)}
                                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F]"
                                      >
                                        <option value="6 months">6 months</option>
                                        <option value="1 year">1 year</option>
                                        <option value="2 years">2 years</option>
                                        <option value="3 years">3 years</option>
                                        <option value="5 years">5 years</option>
                                        <option value="10 years">10 years</option>
                                      </select>
                                    </div>
                                    
                                    <div>
                                      <label className="block text-sm font-medium text-[#333333] mb-1">
                                        Notes (Optional)
                                      </label>
                                      <textarea
                                        value={notes}
                                        onChange={(e) => updateNotes(buildingId, asset.id, e.target.value)}
                                        placeholder="Add any specific notes for this building..."
                                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F]"
                                        rows={2}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </BlocIQCardContent>
                </BlocIQCard>
              )
            })}
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 'review' && (
          <BlocIQCard variant="elevated">
            <BlocIQCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#333333]">Review Configuration</h2>
                  <p className="text-sm text-[#64748B]">Review your compliance setup before saving</p>
                </div>
              </div>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              <div className="space-y-6">
                {Array.from(selectedBuildings).map((buildingId) => {
                  const building = setupData.buildings.find(b => b.id === buildingId)
                  const buildingConfig = buildingConfigs[buildingId]
                  
                  if (!building || !buildingConfig) return null
                  
                  const selectedAssets = Array.from(buildingConfig.assets)
                  
                  return (
                    <div key={buildingId} className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E2E8F0]">
                      <div className="flex items-center gap-3 mb-4">
                        <Building className="h-5 w-5 text-[#008C8F]" />
                        <h3 className="font-semibold text-[#333333]">{building.name}</h3>
                        <BlocIQBadge variant="outline">
                          {selectedAssets.length} items selected
                        </BlocIQBadge>
                      </div>
                      
                      <div className="space-y-2">
                        {selectedAssets.map((assetId) => {
                          const asset = setupData.assets.find(a => a.id === assetId)
                          const frequency = buildingConfig.frequencies[assetId] || asset?.default_frequency || '1 year'
                          const notes = buildingConfig.notes[assetId] || ''
                          
                          if (!asset) return null
                          
                          return (
                            <div key={assetId} className="bg-white p-3 rounded-lg border border-[#E2E8F0]">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-[#333333] mb-1">{asset.name}</h4>
                                  <div className="flex items-center gap-4 text-sm text-[#64748B]">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{frequency}</span>
                                    </div>
                                    {notes && (
                                      <div className="flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        <span>Has notes</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </BlocIQCardContent>
          </BlocIQCard>
        )}

        {/* Step 5: Complete */}
        {currentStep === 'complete' && (
          <BlocIQCard variant="elevated">
            <BlocIQCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#333333]">Setup Complete!</h2>
                  <p className="text-sm text-[#64748B]">Your compliance tracking has been configured</p>
                </div>
              </div>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#333333] mb-2">Compliance Setup Successful</h3>
                <p className="text-[#64748B] mb-6">
                  You've successfully configured compliance tracking for {selectedBuildings.size} building(s) 
                  with {Array.from(selectedBuildings).reduce((total, buildingId) => 
                    total + (buildingConfigs[buildingId]?.assets.size || 0), 0
                  )} compliance items.
                </p>
                
                <div className="flex gap-3 justify-center">
                  <BlocIQButton variant="secondary" asChild>
                    <Link href="/compliance">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Compliance
                    </Link>
                  </BlocIQButton>
                  <BlocIQButton variant="secondary" asChild>
                    <Link href="/home">
                      <ArrowRight className="h-4 w-4 ml-2" />
                      Go to Dashboard
                    </Link>
                  </BlocIQButton>
                </div>
              </div>
            </BlocIQCardContent>
          </BlocIQCard>
        )}
      </div>

      {/* Navigation */}
      {currentStep !== 'complete' && (
        <div className="flex items-center justify-between">
          <BlocIQButton
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 'buildings'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </BlocIQButton>
          
          <div className="flex items-center gap-3">
            {currentStep === 'review' ? (
              <BlocIQButton
                onClick={saveComplianceConfig}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Saving...' : 'Save Configuration'}
              </BlocIQButton>
            ) : (
              <BlocIQButton
                onClick={nextStep}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </BlocIQButton>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 