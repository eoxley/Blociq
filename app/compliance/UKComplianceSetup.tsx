'use client'

import React, { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Clock, CheckCircle, Save, CheckSquare, XCircle, Info, Building } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { UK_COMPLIANCE_ITEMS, BuildingAsset } from '../../lib/complianceUtils'

interface Building {
  id: number
  name: string
}

interface UKComplianceSetupProps {
  onSaveSuccess?: () => void
}

export default function UKComplianceSetup({ onSaveSuccess }: UKComplianceSetupProps) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null)
  const [assets, setAssets] = useState<BuildingAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load buildings on component mount
  useEffect(() => {
    loadBuildings()
  }, [])

  // Load building assets when building is selected
  useEffect(() => {
    if (selectedBuildingId) {
      loadBuildingAssets(selectedBuildingId)
    } else {
      setAssets([])
      setLoading(false)
    }
  }, [selectedBuildingId])

  const loadBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name')

      if (error) {
        console.error('Error loading buildings:', error)
        return
      }

      setBuildings(data || [])
    } catch (error) {
      console.error('Error loading buildings:', error)
    }
  }

  const loadBuildingAssets = async (buildingId: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/building-assets?buildingId=${buildingId}`)
      const { assets: data, error } = await response.json()

      if (error) {
        console.error('Error loading building assets:', error)
        return
      }

      // Create a map of existing assets
      const existingAssets = new Map(data?.map((asset: BuildingAsset) => [asset.compliance_item_id, asset]) || [])
      
      // Merge with UK compliance items
      const mergedAssets = UK_COMPLIANCE_ITEMS.map(item => {
        const existing = existingAssets.get(item.id) as BuildingAsset | undefined
        return {
          id: existing?.id || 0,
          building_id: buildingId,
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
    } catch (error) {
      console.error('Error loading building assets:', error)
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

  const validateSetup = () => {
    const errors: string[] = []
    
    if (!selectedBuildingId) {
      errors.push('Please select a building')
      setValidationErrors(errors)
      return false
    }
    
    // Check that all always required items are selected
    const alwaysRequired = UK_COMPLIANCE_ITEMS.filter(item => item.required_if === 'always')
    const selectedAlwaysRequired = assets.filter(asset => 
      alwaysRequired.some(item => item.id === asset.compliance_item_id && asset.applies)
    )
    
    if (selectedAlwaysRequired.length !== alwaysRequired.length) {
      errors.push('All legally required items must be selected')
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const saveSetup = async () => {
    if (!validateSetup()) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/building-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId: selectedBuildingId,
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
      setTimeout(() => setSaveSuccess(false), 3000) // Hide success message after 3 seconds
      
      if (onSaveSuccess) {
        onSaveSuccess()
      }
    } catch (error) {
      console.error('Error saving setup:', error)
      alert('Failed to save compliance setup. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getRequirementBadge = (requiredIf: string) => {
    switch (requiredIf) {
      case 'always':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Always Required
          </span>
        )
      case 'if present':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            If Present
          </span>
        )
      case 'if HRB':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Shield className="h-3 w-3 mr-1" />
            HRB Only
          </span>
        )
      default:
        return null
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Safety': return 'border-red-200 bg-red-50'
      case 'Electrical': return 'border-yellow-200 bg-yellow-50'
      case 'Gas': return 'border-orange-200 bg-orange-50'
      case 'Health': return 'border-green-200 bg-green-50'
      case 'Insurance': return 'border-blue-200 bg-blue-50'
      case 'Structural': return 'border-purple-200 bg-purple-50'
      case 'Equipment': return 'border-gray-200 bg-gray-50'
      case 'Energy': return 'border-teal-200 bg-teal-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const alwaysRequired = UK_COMPLIANCE_ITEMS.filter(item => item.required_if === 'always')
  const optionalItems = UK_COMPLIANCE_ITEMS.filter(item => item.required_if !== 'always')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Building Compliance Setup
        </h2>
        <p className="text-gray-600 mb-4">
          Configure which compliance obligations apply to each building. Legally required items are pre-selected and cannot be removed.
        </p>
        
        {/* Building Selector */}
        <div className="mb-4">
          <label htmlFor="building-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Building
          </label>
          <select
            id="building-select"
            value={selectedBuildingId || ''}
            onChange={(e) => setSelectedBuildingId(e.target.value ? parseInt(e.target.value) : null)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">Choose a building...</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Success!</h3>
              <p className="text-sm text-green-700">Compliance setup saved successfully.</p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Setup Issues</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {selectedBuildingId && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : (
            <>
              {/* Always Required Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    Always Required (Legally Mandatory)
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    These items are legally required for all buildings and cannot be deselected.
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  {alwaysRequired.map(item => {
                    const asset = assets.find(a => a.compliance_item_id === item.id)
                    return (
                      <div key={item.id} className={`p-4 rounded-lg border ${getCategoryColor(item.category)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <input
                                type="checkbox"
                                checked={asset?.applies || false}
                                disabled
                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                              />
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              {getRequirementBadge(item.required_if)}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                            <div className="text-xs text-gray-500 mb-3">
                              Frequency: {item.default_frequency}
                            </div>
                            
                            {asset?.applies && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Last Checked
                                  </label>
                                  <input
                                    type="date"
                                    value={asset.last_checked || ''}
                                    onChange={(e) => updateDate(item.id, 'last_checked', e.target.value)}
                                    className="block w-full text-sm border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Next Due
                                  </label>
                                  <input
                                    type="date"
                                    value={asset.next_due || ''}
                                    onChange={(e) => updateDate(item.id, 'next_due', e.target.value)}
                                    className="block w-full text-sm border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Notes
                                  </label>
                                  <input
                                    type="text"
                                    value={asset.notes || ''}
                                    onChange={(e) => updateNotes(item.id, e.target.value)}
                                    placeholder="Optional notes"
                                    className="block w-full text-sm border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Optional Assets Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Info className="h-5 w-5 text-blue-600 mr-2" />
                    Optional Assets (If Present)
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Select these items if they apply to your building.
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  {optionalItems.map(item => {
                    const asset = assets.find(a => a.compliance_item_id === item.id)
                    return (
                      <div key={item.id} className={`p-4 rounded-lg border ${getCategoryColor(item.category)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <input
                                type="checkbox"
                                checked={asset?.applies || false}
                                onChange={() => toggleAsset(item.id)}
                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                              />
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              {getRequirementBadge(item.required_if)}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                            <div className="text-xs text-gray-500 mb-3">
                              Frequency: {item.default_frequency}
                            </div>
                            
                            {asset?.applies && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Last Checked
                                  </label>
                                  <input
                                    type="date"
                                    value={asset.last_checked || ''}
                                    onChange={(e) => updateDate(item.id, 'last_checked', e.target.value)}
                                    className="block w-full text-sm border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Next Due
                                  </label>
                                  <input
                                    type="date"
                                    value={asset.next_due || ''}
                                    onChange={(e) => updateDate(item.id, 'next_due', e.target.value)}
                                    className="block w-full text-sm border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Notes
                                  </label>
                                  <input
                                    type="text"
                                    value={asset.notes || ''}
                                    onChange={(e) => updateNotes(item.id, e.target.value)}
                                    placeholder="Optional notes"
                                    className="block w-full text-sm border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
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
            </>
          )}
        </>
      )}

      {!selectedBuildingId && !loading && (
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Building</h3>
          <p className="text-gray-500">Choose a building from the dropdown above to configure its compliance requirements.</p>
        </div>
      )}
    </div>
  )
} 