'use client'

import React, { useState, useEffect } from 'react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { UK_COMPLIANCE_ITEMS, BuildingAsset, getActiveComplianceAssets } from '../../../../lib/complianceUtils'
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, Plus, Save, Building, Settings } from 'lucide-react'
import Link from 'next/link'

interface BuildingCompliancePageProps {
  params: Promise<{
    buildingId: string
  }>
}

interface Building {
  id: number
  name: string
}

interface ComplianceSummary {
  total: number
  compliant: number
  overdue: number
  missing: number
  dueSoon: number
}

export default function BuildingCompliancePage({ params }: BuildingCompliancePageProps) {
  const [building, setBuilding] = useState<Building | null>(null)
  const [assets, setAssets] = useState<BuildingAsset[]>([])
  const [activeAssets, setActiveAssets] = useState<any[]>([])
  const [summary, setSummary] = useState<ComplianceSummary>({
    total: 0,
    compliant: 0,
    overdue: 0,
    missing: 0,
    dueSoon: 0
  })
  const [loading, setLoading] = useState(true)
  const [currentSection, setCurrentSection] = useState<'summary' | 'setup' | 'add'>('summary')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [buildingId, setBuildingId] = useState<string>('')
  const supabase = createClientComponentClient()

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params
      setBuildingId(resolvedParams.buildingId)
    }
    loadParams()
  }, [params])

  useEffect(() => {
    if (buildingId) {
      loadBuildingData()
    }
  }, [buildingId])

  const loadBuildingData = async () => {
    try {
      setLoading(true)
      const buildingIdNum = parseInt(buildingId)

      // Load building info
      const { data: buildingData, error: buildingError } = await supabase
        .from('buildings')
        .select('id, name')
        .eq('id', buildingId)
        .single()

      if (buildingError) {
        console.error('Error loading building:', buildingError)
        return
      }

      setBuilding(buildingData)

      // Load building assets
      const response = await fetch(`/api/building-assets?buildingId=${buildingId}`)
      const { assets: assetsData, error: assetsError } = await response.json()

      if (assetsError) {
        console.error('Error loading building assets:', assetsError)
        return
      }

      // Create a map of existing assets
      const existingAssets = new Map(assetsData?.map((asset: BuildingAsset) => [asset.compliance_item_id, asset]) || [])
      
      // Merge with UK compliance items
      const mergedAssets = UK_COMPLIANCE_ITEMS.map(item => {
        const existing = existingAssets.get(item.id) as BuildingAsset | undefined
        return {
          id: existing?.id || 0,
          building_id: buildingIdNum,
          compliance_item_id: item.id,
          applies: existing?.applies || item.required_if === 'always',
          last_checked: existing?.last_checked || null,
          next_due: existing?.next_due || null,
          notes: existing?.notes || null,
          created_at: existing?.created_at || null,
          updated_at: existing?.updated_at || null
        }
      })

      setAssets(mergedAssets)

      // Load active compliance assets for summary
      const activeAssetsData = await getActiveComplianceAssets(supabase, buildingId.toString())
      setActiveAssets(activeAssetsData)

      // Calculate summary
      const total = mergedAssets.filter(asset => asset.applies).length
      const compliant = activeAssetsData.filter(asset => asset.status === 'compliant').length
      const overdue = activeAssetsData.filter(asset => asset.status === 'overdue').length
      const missing = activeAssetsData.filter(asset => asset.status === 'missing').length
      const dueSoon = activeAssetsData.filter(asset => asset.status === 'due_soon').length

      setSummary({ total, compliant, overdue, missing, dueSoon })

    } catch (error) {
      console.error('Error loading building data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAsset = (complianceItemId: number) => {
    setAssets(prev => prev.map(asset => {
      if (asset.compliance_item_id === complianceItemId) {
        const item = UK_COMPLIANCE_ITEMS.find(i => i.id === complianceItemId)
        // Don't allow deselecting always required items
        if (item?.required_if === 'always') {
          return asset
        }
        return { ...asset, applies: !asset.applies }
      }
      return asset
    }))
  }

  const updateDate = (complianceItemId: number, field: 'last_checked' | 'next_due', value: string) => {
    setAssets(prev => prev.map(asset => 
      asset.compliance_item_id === complianceItemId 
        ? { ...asset, [field]: value || null }
        : asset
    ))
  }

  const updateNotes = (complianceItemId: number, notes: string) => {
    setAssets(prev => prev.map(asset => 
      asset.compliance_item_id === complianceItemId 
        ? { ...asset, notes }
        : asset
    ))
  }

  const saveSetup = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/building-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId: parseInt(buildingId),
          assets,
          applyToAll: false
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Error saving building assets:', result.error)
        alert('Failed to save compliance setup. Please try again.')
        return
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      
      // Reload data to refresh summary
      await loadBuildingData()
    } catch (error) {
      console.error('Error saving setup:', error)
      alert('Failed to save compliance setup. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-100'
      case 'overdue': return 'text-red-600 bg-red-100'
      case 'missing': return 'text-gray-600 bg-gray-100'
      case 'due_soon': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4" />
      case 'overdue': return <XCircle className="h-4 w-4" />
      case 'missing': return <AlertTriangle className="h-4 w-4" />
      case 'due_soon': return <Clock className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }

  if (!building) {
    return (
      <LayoutWithSidebar>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <XCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Building Not Found</h3>
            <p className="text-gray-500">The building you're looking for doesn't exist.</p>
            <Link
              href="/buildings"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-teal-700 bg-teal-100 hover:bg-teal-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Buildings
            </Link>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }

  return (
    <LayoutWithSidebar>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link
              href="/buildings"
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{building.name}</h1>
              <p className="mt-2 text-gray-600">Compliance Management</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentSection('summary')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentSection === 'summary' 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CheckCircle className="h-4 w-4 mr-2 inline" />
              Summary
            </button>
            <button
              onClick={() => setCurrentSection('setup')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentSection === 'setup' 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Settings className="h-4 w-4 mr-2 inline" />
              Setup
            </button>
            <button
              onClick={() => setCurrentSection('add')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentSection === 'add' 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Plus className="h-4 w-4 mr-2 inline" />
              Add Item
            </button>
          </div>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-green-800">Success!</h3>
                <p className="text-sm text-green-700">Compliance setup saved successfully.</p>
              </div>
            </div>
          </div>
        )}

        {/* Content Sections */}
        {currentSection === 'summary' && (
          <div className="space-y-6">
            {/* Compliance Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Compliant</p>
                    <p className="text-2xl font-semibold text-gray-900">{summary.compliant}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Overdue</p>
                    <p className="text-2xl font-semibold text-gray-900">{summary.overdue}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Due Soon</p>
                    <p className="text-2xl font-semibold text-gray-900">{summary.dueSoon}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-8 w-8 text-gray-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Missing</p>
                    <p className="text-2xl font-semibold text-gray-900">{summary.missing}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Compliance Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Active Compliance Items</h3>
                <p className="text-sm text-gray-600 mt-1">Currently tracked compliance requirements for this building</p>
              </div>
              <div className="p-6">
                {activeAssets.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Compliance Items Set Up</h3>
                    <p className="text-gray-500 mb-4">Configure compliance requirements for this building in the Setup tab.</p>
                    <button
                      onClick={() => setCurrentSection('setup')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Go to Setup
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeAssets.map((asset, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-full ${getStatusColor(asset.status)}`}>
                            {getStatusIcon(asset.status)}
                          </div>
                          <div className="ml-4">
                            <h4 className="font-medium text-gray-900">{asset.title}</h4>
                            <p className="text-sm text-gray-500">{asset.category} • {asset.frequency}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {asset.expiry_date ? `Due: ${new Date(asset.expiry_date).toLocaleDateString()}` : 'No due date'}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                            {asset.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentSection === 'setup' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Setup</h3>
              <p className="text-gray-600 mb-6">
                Configure which compliance requirements apply to this building. Legally required items are pre-selected and cannot be removed.
              </p>

              {/* Always Required Section */}
              <div className="mb-8">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  Always Required (Legally Mandatory)
                </h4>
                <div className="space-y-3">
                  {UK_COMPLIANCE_ITEMS.filter(item => item.required_if === 'always').map(item => {
                    const asset = assets.find(a => a.compliance_item_id === item.id)
                    return (
                      <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={asset?.applies || false}
                            disabled
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                          />
                          <div className="ml-3">
                            <h5 className="font-medium text-gray-900">{item.name}</h5>
                            <p className="text-sm text-gray-500">{item.description}</p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.default_frequency}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Optional Assets Section */}
              <div className="mb-8">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <Settings className="h-5 w-5 text-blue-600 mr-2" />
                  Optional Assets (If Present)
                </h4>
                <div className="space-y-3">
                  {UK_COMPLIANCE_ITEMS.filter(item => item.required_if !== 'always').map(item => {
                    const asset = assets.find(a => a.compliance_item_id === item.id)
                    return (
                      <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={asset?.applies || false}
                            onChange={() => toggleAsset(item.id)}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                          />
                          <div className="ml-3">
                            <h5 className="font-medium text-gray-900">{item.name}</h5>
                            <p className="text-sm text-gray-500">{item.description}</p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.default_frequency}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={saveSetup}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {currentSection === 'add' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Custom Compliance Item</h3>
            <p className="text-gray-600 mb-6">
              Add a custom compliance requirement specific to this building that's not in the standard library.
            </p>
            
            <div className="text-center py-8">
              <Plus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Custom Items Coming Soon</h3>
              <p className="text-gray-500">
                This feature will allow you to add building-specific compliance requirements that aren't covered by the standard UK compliance library.
              </p>
            </div>
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  )
} 