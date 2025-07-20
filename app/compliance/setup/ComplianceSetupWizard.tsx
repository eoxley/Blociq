'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Shield, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Info,
  AlertTriangle,
  Loader2,
  Check,
  X,
  BarChart3,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

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
  [key: string]: any // Allow additional fields from select('*')
}

interface ComplianceSetupWizardProps {
  buildings: Building[]
  complianceAssets: ComplianceAsset[]
  buildingsWithCompliance: string[]
}

type Step = 'buildings' | 'assets' | 'confirm'

export default function ComplianceSetupWizard({ 
  buildings, 
  complianceAssets, 
  buildingsWithCompliance 
}: ComplianceSetupWizardProps) {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('buildings')
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([])
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [buildingSearchTerm, setBuildingSearchTerm] = useState('')
  const [assetSearchTerm, setAssetSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [setupResult, setSetupResult] = useState<any>(null)

  // Define category priority order for sorting
  const categoryPriority = [
    'Safety',
    'Legal & Safety', 
    'Lease & Documentation',
    'Operational & Contracts',
    'Environmental',
    'Smart Records',
    'Other'
  ]

  // Group compliance assets by category with priority sorting
  const assetsByCategory = complianceAssets.reduce((acc, asset) => {
    const category = asset.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(asset)
    return acc
  }, {} as Record<string, ComplianceAsset[]>)

  // Sort categories by priority, then alphabetically
  const sortedCategories = Object.keys(assetsByCategory).sort((a, b) => {
    const aIndex = categoryPriority.indexOf(a)
    const bIndex = categoryPriority.indexOf(b)
    
    // If both categories are in priority list, sort by priority
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex
    }
    
    // If only one is in priority list, prioritize it
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    
    // Otherwise sort alphabetically
    return a.localeCompare(b)
  })

  // Create sorted assets by category
  const sortedAssetsByCategory = sortedCategories.reduce((acc, category) => {
    acc[category] = assetsByCategory[category]
    return acc
  }, {} as Record<string, ComplianceAsset[]>)

  // Filter buildings based on search
  const filteredBuildings = buildings.filter(building => {
    const searchTerm = buildingSearchTerm.toLowerCase()
    return (
      building.name.toLowerCase().includes(searchTerm) ||
      (building.address && building.address.toLowerCase().includes(searchTerm))
    )
  })

  // Filter assets based on search
  const filteredAssetsByCategory = Object.entries(sortedAssetsByCategory).reduce((acc, [category, assets]) => {
    const filteredAssets = assets.filter(asset => {
      const searchTerm = assetSearchTerm.toLowerCase()
      return (
        asset.name.toLowerCase().includes(searchTerm) ||
        (asset.description && asset.description.toLowerCase().includes(searchTerm)) ||
        category.toLowerCase().includes(searchTerm)
      )
    })
    if (filteredAssets.length > 0) {
      acc[category] = filteredAssets
    }
    return acc
  }, {} as Record<string, ComplianceAsset[]>)

  // Handle building selection
  const toggleBuilding = (buildingId: string) => {
    setSelectedBuildings(prev => 
      prev.includes(buildingId) 
        ? prev.filter(id => id !== buildingId)
        : [...prev, buildingId]
    )
  }

  // Handle asset selection
  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    )
  }

  // Handle select all buildings
  const selectAllBuildings = () => {
    setSelectedBuildings(filteredBuildings.map(b => b.id))
  }

  // Handle deselect all buildings
  const deselectAllBuildings = () => {
    setSelectedBuildings([])
  }

  // Handle select all assets
  const selectAllAssets = () => {
    const allAssetIds = Object.values(filteredAssetsByCategory)
      .flat()
      .map(asset => asset.id)
    setSelectedAssets(allAssetIds)
  }

  // Handle deselect all assets
  const deselectAllAssets = () => {
    setSelectedAssets([])
  }

  // Navigation functions
  const nextStep = () => {
    if (currentStep === 'buildings' && selectedBuildings.length === 0) {
      toast.error('Please select at least one building')
      return
    }
    if (currentStep === 'assets' && selectedAssets.length === 0) {
      toast.error('Please select at least one compliance asset')
      return
    }
    
    if (currentStep === 'buildings') {
      setCurrentStep('assets')
    } else if (currentStep === 'assets') {
      setCurrentStep('confirm')
    }
  }

  const prevStep = () => {
    if (currentStep === 'assets') {
      setCurrentStep('buildings')
    } else if (currentStep === 'confirm') {
      setCurrentStep('assets')
    }
  }

  // Submit compliance setup
  const handleSubmit = async () => {
    if (selectedBuildings.length === 0 || selectedAssets.length === 0) {
      toast.error('Please select buildings and assets')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/compliance-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingIds: selectedBuildings,
          assetIds: selectedAssets
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSubmittedCount(result.inserted)
        setSetupResult(result)
        toast.success(result.message)
      } else {
        toast.error(result.error || 'Failed to set up compliance. Please try again.')
      }

    } catch (error) {
      console.error('Error in compliance setup:', error)
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Navigation functions
  const goToComplianceDashboard = () => {
    router.push('/compliance')
  }

  const goToBuildingCompliance = (buildingId: string) => {
    router.push(`/buildings/${buildingId}/compliance`)
  }

  const resetWizard = () => {
    setSelectedBuildings([])
    setSelectedAssets([])
    setCurrentStep('buildings')
    setSubmittedCount(0)
    setSetupResult(null)
  }

  // Get step progress
  const getStepProgress = () => {
    switch (currentStep) {
      case 'buildings':
        return 33
      case 'assets':
        return 66
      case 'confirm':
        return 100
      default:
        return 0
    }
  }

  // Get step title
  const getStepTitle = () => {
    switch (currentStep) {
      case 'buildings':
        return 'Step 1: Select Buildings'
      case 'assets':
        return 'Step 2: Select Compliance Assets'
      case 'confirm':
        return 'Step 3: Confirm Setup'
      default:
        return ''
    }
  }

  // Get category summary for selected assets
  const getCategorySummary = () => {
    const categoryCounts = Object.entries(filteredAssetsByCategory).map(([category, assets]) => {
      const selectedCount = assets.filter(asset => selectedAssets.includes(asset.id)).length
      return { category, selectedCount, totalCount: assets.length }
    }).filter(item => item.selectedCount > 0)

    return categoryCounts
  }

  // Success state with navigation options
  if (submittedCount > 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 max-w-2xl mx-auto">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
            <p className="text-gray-600 mb-6">
              Successfully configured compliance tracking for {selectedBuildings.length} buildings with {selectedAssets.length} assets.
            </p>
            
            {/* Setup Summary */}
            {setupResult && (
              <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
                <h3 className="font-medium text-gray-900 mb-3">Setup Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">New records created:</span>
                    <span className="font-medium ml-2 text-green-600">{setupResult.inserted}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Existing records skipped:</span>
                    <span className="font-medium ml-2 text-gray-600">{setupResult.skipped}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Buildings processed:</span>
                    <span className="font-medium ml-2">{setupResult.details?.buildingsProcessed}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Assets processed:</span>
                    <span className="font-medium ml-2">{setupResult.details?.assetsProcessed}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Options */}
            <div className="space-y-3">
              <Button
                onClick={goToComplianceDashboard}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Go to Compliance Dashboard
              </Button>
              
              {selectedBuildings.length === 1 && (
                <Button
                  variant="outline"
                  onClick={() => goToBuildingCompliance(selectedBuildings[0])}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Compliance Tracker for {buildings.find(b => b.id === selectedBuildings[0])?.name}
                </Button>
              )}
              
              {selectedBuildings.length > 1 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">View compliance tracker for individual buildings:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedBuildings.slice(0, 3).map(buildingId => {
                      const building = buildings.find(b => b.id === buildingId)
                      return (
                        <Button
                          key={buildingId}
                          variant="outline"
                          size="sm"
                          onClick={() => goToBuildingCompliance(buildingId)}
                          className="justify-start"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {building?.name}
                        </Button>
                      )
                    })}
                    {selectedBuildings.length > 3 && (
                      <p className="text-xs text-gray-500">
                        ... and {selectedBuildings.length - 3} more buildings
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <Button
                variant="ghost"
                onClick={resetWizard}
                className="w-full mt-4"
              >
                Set Up More Buildings
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Floating Save Status */}
      {(selectedBuildings.length > 0 || selectedAssets.length > 0) && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-64">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Setup Progress</h4>
              <div className="flex items-center gap-1">
                {selectedBuildings.length > 0 && selectedAssets.length > 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Buildings:</span>
                <span className="font-medium">{selectedBuildings.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Assets:</span>
                <span className="font-medium">{selectedAssets.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Records:</span>
                <span className="font-medium">{selectedBuildings.length * selectedAssets.length}</span>
              </div>
            </div>
            {selectedBuildings.length > 0 && selectedAssets.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <div className="text-xs text-green-600 font-medium">
                  ✓ Ready to save
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-gray-100 rounded-full h-2">
        <div 
          className="bg-teal-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${getStepProgress()}%` }}
        />
      </div>

      {/* Step Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{getStepTitle()}</h2>
        <p className="text-gray-600">
          Step {currentStep === 'buildings' ? '1' : currentStep === 'assets' ? '2' : '3'} of 3
        </p>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={currentStep} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="buildings" disabled={currentStep !== 'buildings'}>
            <Building2 className="h-4 w-4 mr-2" />
            Buildings
          </TabsTrigger>
          <TabsTrigger value="assets" disabled={currentStep !== 'assets'}>
            <Shield className="h-4 w-4 mr-2" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="confirm" disabled={currentStep !== 'confirm'}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm
          </TabsTrigger>
        </TabsList>

        {/* Step 1: Building Selection */}
        <TabsContent value="buildings" className="space-y-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Select Buildings
              </CardTitle>
              <p className="text-gray-600">
                Choose which buildings should have compliance tracking set up. You can select multiple buildings.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search buildings by name or address..."
                  value={buildingSearchTerm}
                  onChange={(e) => setBuildingSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Select All/Deselect All */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllBuildings}
                  disabled={filteredBuildings.length === 0}
                >
                  Select All ({filteredBuildings.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllBuildings}
                  disabled={selectedBuildings.length === 0}
                >
                  Deselect All
                </Button>
              </div>

              {/* Buildings List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredBuildings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No buildings found matching your search.</p>
                  </div>
                ) : (
                  filteredBuildings.map((building) => {
                    const isSelected = selectedBuildings.includes(building.id)
                    const hasExistingCompliance = buildingsWithCompliance.includes(building.id)
                    
                    return (
                      <div
                        key={building.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'bg-gradient-to-r from-teal-50 to-blue-50 border-teal-300 shadow-sm' 
                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                        onClick={() => toggleBuilding(building.id)}
                      >
                        <Checkbox
                          id={`building-${building.id}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleBuilding(building.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isSelected ? 'text-teal-800' : 'text-gray-900'}`}>
                              {building.name}
                            </span>
                            {hasExistingCompliance && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Has Compliance
                              </Badge>
                            )}
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-teal-600" />
                            )}
                          </div>
                          {building.address && (
                            <p className={`text-sm ${isSelected ? 'text-teal-600' : 'text-gray-500'}`}>
                              {building.address}
                            </p>
                          )}
                          {building.unit_count && (
                            <p className={`text-xs ${isSelected ? 'text-teal-500' : 'text-gray-400'}`}>
                              {building.unit_count} units
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {selectedBuildings.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>{selectedBuildings.length}</strong> building{selectedBuildings.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Asset Selection */}
        <TabsContent value="assets" className="space-y-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Select Compliance Assets
              </CardTitle>
              <p className="text-gray-600">
                Choose which compliance requirements should apply to the selected buildings.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search assets by name, description, or category..."
                  value={assetSearchTerm}
                  onChange={(e) => setAssetSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Summary */}
              {selectedAssets.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Selected by Category:</h4>
                  <div className="flex flex-wrap gap-2">
                    {getCategorySummary().map(({ category, selectedCount, totalCount }) => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category} ({selectedCount}/{totalCount})
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-blue-800 mt-2">
                    <strong>Total:</strong> {selectedAssets.length} compliance asset{selectedAssets.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {/* Select All/Deselect All */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllAssets}
                  disabled={Object.keys(filteredAssetsByCategory).length === 0}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllAssets}
                  disabled={selectedAssets.length === 0}
                >
                  Deselect All
                </Button>
              </div>

              {/* Assets by Category */}
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {Object.keys(filteredAssetsByCategory).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No compliance assets found matching your search.</p>
                  </div>
                ) : (
                  Object.entries(filteredAssetsByCategory).map(([category, assets]) => {
                    const selectedCount = assets.filter(asset => selectedAssets.includes(asset.id)).length
                    
                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                          <Badge variant="outline" className="text-xs">
                            {selectedCount}/{assets.length} selected
                          </Badge>
                        </div>
                        <Card className="p-4 space-y-2">
                          {assets.map((asset) => {
                            const isSelected = selectedAssets.includes(asset.id)
                            
                            return (
                              <div
                                key={asset.id}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                  isSelected 
                                    ? 'bg-gradient-to-r from-teal-50 to-blue-50 border-teal-300 shadow-sm' 
                                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                                onClick={() => toggleAsset(asset.id)}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-medium ${isSelected ? 'text-teal-800' : 'text-gray-900'}`}>
                                      {asset.name}
                                    </span>
                                    {asset.description && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Info className="h-4 w-4 text-gray-400" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="max-w-xs">{asset.description}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    {isSelected && (
                                      <CheckCircle className="h-4 w-4 text-teal-600" />
                                    )}
                                  </div>
                                  {asset.description && (
                                    <p className={`text-sm mt-1 ${isSelected ? 'text-teal-600' : 'text-muted-foreground'}`}>
                                      {asset.description}
                                    </p>
                                  )}
                                </div>
                                <Checkbox
                                  id={`asset-${asset.id}`}
                                  checked={isSelected}
                                  onCheckedChange={() => toggleAsset(asset.id)}
                                />
                              </div>
                            )
                          })}
                        </Card>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 3: Confirm */}
        <TabsContent value="confirm" className="space-y-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Confirm Setup
              </CardTitle>
              <p className="text-gray-600">
                Review your selections before setting up compliance tracking.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Selected Buildings</h3>
                  <div className="space-y-1">
                    {selectedBuildings.map(buildingId => {
                      const building = buildings.find(b => b.id === buildingId)
                      return (
                        <div key={buildingId} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{building?.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Selected Assets</h3>
                  <div className="space-y-1">
                    {selectedAssets.map(assetId => {
                      const asset = complianceAssets.find(a => a.id === assetId)
                      return (
                        <div key={assetId} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{asset?.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Impact Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Setup Impact</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Total Buildings:</span>
                    <span className="font-medium ml-2">{selectedBuildings.length}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Total Assets:</span>
                    <span className="font-medium ml-2">{selectedAssets.length}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Total Records:</span>
                    <span className="font-medium ml-2">{selectedBuildings.length * selectedAssets.length}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Initial Status:</span>
                    <span className="font-medium ml-2">Not Started</span>
                  </div>
                </div>
              </div>

              {/* Warning for existing compliance */}
              {selectedBuildings.some(buildingId => buildingsWithCompliance.includes(buildingId)) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Existing Compliance Detected</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Some selected buildings already have compliance tracking set up. 
                    This setup will add additional compliance assets to those buildings.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 'buildings'}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {currentStep === 'confirm' ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedBuildings.length === 0 || selectedAssets.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {isSubmitting ? 'Setting Up...' : 'Save Compliance Setup'}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={
                (currentStep === 'buildings' && selectedBuildings.length === 0) ||
                (currentStep === 'assets' && selectedAssets.length === 0)
              }
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 