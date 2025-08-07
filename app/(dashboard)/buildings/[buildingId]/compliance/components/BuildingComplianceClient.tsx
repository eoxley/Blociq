'use client'

import { useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, Clock, Calendar, FileText, Upload, Settings, Plus, X, Edit3, Save, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import SetupComplianceTrackerModal from '@/components/SetupComplianceTrackerModal'

// Type definitions
interface Building {
  id: string
  name: string
  address: string | null
}

interface ComplianceAsset {
  id: string
  category: string
  title: string
  description: string | null
  frequency_months: number | null
  created_at: string
}

interface BuildingComplianceAsset {
  id: string
  building_id: string
  compliance_asset_id: string
  due_date: string | null
  status: 'pending' | 'compliant' | 'overdue' | 'due_soon'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
  compliance_asset: ComplianceAsset
}

interface ComplianceSummary {
  total: number
  compliant: number
  pending: number
  overdue: number
  due_soon: number
}

interface BuildingComplianceClientProps {
  building: Building
  masterAssets: ComplianceAsset[]
  buildingAssets: BuildingComplianceAsset[]
  summary: ComplianceSummary
  hasComplianceSetup: boolean
}

export default function BuildingComplianceClient({
  building,
  masterAssets,
  buildingAssets,
  summary,
  hasComplianceSetup
}: BuildingComplianceClientProps) {
  const [isSetupMode, setIsSetupMode] = useState(!hasComplianceSetup)
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [showSetupModal, setShowSetupModal] = useState(false)

  // Group master assets by category
  const groupedMasterAssets = masterAssets.reduce((acc, asset) => {
    if (!acc[asset.category]) {
      acc[asset.category] = []
    }
    acc[asset.category].push(asset)
    return acc
  }, {} as Record<string, ComplianceAsset[]>)

  // Group building assets by category
  const groupedBuildingAssets = buildingAssets.reduce((acc, asset) => {
    const category = asset.compliance_asset.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(asset)
    return acc
  }, {} as Record<string, BuildingComplianceAsset[]>)

  const handleAssetSelection = (assetId: string, checked: boolean) => {
    if (checked) {
      setSelectedAssets(prev => [...prev, assetId])
    } else {
      setSelectedAssets(prev => prev.filter(id => id !== assetId))
    }
  }

  const handleSetupSave = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one compliance asset')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/compliance/building/${building.id}/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetIds: selectedAssets
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save compliance setup')
      }

      toast.success('Compliance setup saved successfully!')
      setIsSetupMode(false)
      // Refresh the page to show the new setup
      window.location.reload()
    } catch (error) {
      console.error('Error saving compliance setup:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save compliance setup')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSetupModalSuccess = () => {
    // Refresh the page to show the new setup
    window.location.reload()
  }

  const getStatusBadge = (status: string, dueDate: string | null) => {
    switch (status) {
      case 'compliant':
        return { variant: 'default' as const, text: 'Compliant', icon: CheckCircle, className: 'bg-green-100 text-green-800' }
      case 'overdue':
        return { variant: 'destructive' as const, text: 'Overdue', icon: AlertTriangle, className: 'bg-red-100 text-red-800' }
      case 'due_soon':
        return { variant: 'secondary' as const, text: 'Due Soon', icon: Clock, className: 'bg-yellow-100 text-yellow-800' }
      default:
        return { variant: 'outline' as const, text: 'Pending', icon: Clock, className: 'bg-gray-100 text-gray-800' }
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { text: 'Urgent', className: 'bg-red-100 text-red-800' }
      case 'high':
        return { text: 'High', className: 'bg-orange-100 text-orange-800' }
      case 'medium':
        return { text: 'Medium', className: 'bg-yellow-100 text-yellow-800' }
      default:
        return { text: 'Low', className: 'bg-green-100 text-green-800' }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Shield className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Compliance Tracker</h1>
                <p className="text-white/80 text-lg">{building.name}</p>
                <p className="text-white/60 text-sm">{building.address}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-white/80 text-sm">Total Assets</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{summary.total}</p>
                </div>
                <Shield className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Compliant</p>
                  <p className="text-2xl font-bold text-green-600">{summary.compliant}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{summary.overdue}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant={isSetupMode ? 'default' : 'outline'}
              onClick={() => setIsSetupMode(true)}
              disabled={isSaving}
            >
              <Settings className="h-4 w-4 mr-2" />
              Setup Mode
            </Button>
            <Button
              variant={!isSetupMode ? 'default' : 'outline'}
              onClick={() => setIsSetupMode(false)}
              disabled={isSaving || !hasComplianceSetup}
            >
              <FileText className="h-4 w-4 mr-2" />
              Tracking Mode
            </Button>
          </div>
        </div>

        {isSetupMode ? (
          /* Setup Mode */
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Setup Compliance Tracking
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Select which compliance assets apply to this building. You can track status, due dates, and notes for each asset.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(groupedMasterAssets).map(([category, assets]) => (
                    <div key={category} className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assets.map((asset) => (
                          <div key={asset.id} className="flex items-center space-x-3 p-4 border rounded-lg">
                            <Checkbox
                              id={asset.id}
                              checked={selectedAssets.includes(asset.id)}
                              onCheckedChange={(checked) => 
                                handleAssetSelection(asset.id, checked as boolean)
                              }
                            />
                            <div className="flex-1">
                              <label htmlFor={asset.id} className="text-sm font-medium text-gray-900 cursor-pointer">
                                {asset.title}
                              </label>
                              {asset.description && (
                                <p className="text-sm text-gray-600 mt-1">{asset.description}</p>
                              )}
                              {asset.frequency_months && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Frequency: {asset.frequency_months} months
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedAssets([])}
                      disabled={isSaving}
                    >
                      Clear All
                    </Button>
                    <Button
                      onClick={handleSetupSave}
                      disabled={isSaving || selectedAssets.length === 0}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Setup
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Tracking Mode */
          <div className="space-y-6">
            {Object.keys(groupedBuildingAssets).length > 0 ? (
              Object.entries(groupedBuildingAssets).map(([category, assets]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      {category}
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      {assets.length} compliance asset{assets.length !== 1 ? 's' : ''}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {assets.map((asset) => {
                        const statusBadge = getStatusBadge(asset.status, asset.due_date)
                        const priorityBadge = getPriorityBadge(asset.priority)

                        return (
                          <div key={asset.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-semibold text-gray-900">
                                    {asset.compliance_asset.title}
                                  </h4>
                                  <Badge className={statusBadge.className}>
                                    <statusBadge.icon className="h-3 w-3 mr-1" />
                                    {statusBadge.text}
                                  </Badge>
                                  <Badge className={priorityBadge.className}>
                                    {priorityBadge.text}
                                  </Badge>
                                </div>
                                
                                {asset.compliance_asset.description && (
                                  <p className="text-sm text-gray-600 mb-3">
                                    {asset.compliance_asset.description}
                                  </p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">Due Date:</span>
                                    <span className="font-medium">
                                      {asset.due_date ? new Date(asset.due_date).toLocaleDateString() : 'Not set'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">Assigned:</span>
                                    <span className="font-medium">
                                      {asset.assigned_to || 'Unassigned'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">Updated:</span>
                                    <span className="font-medium">
                                      {new Date(asset.updated_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {asset.notes && (
                                    <div className="md:col-span-3">
                                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                        <strong>Notes:</strong> {asset.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Compliance Assets Set Up
                  </h3>
                  <p className="text-gray-600 mb-6">
                    This building doesn't have any compliance tracking set up yet.
                  </p>
                  <Button onClick={() => setShowSetupModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Set Up Compliance Tracker
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Setup Compliance Tracker Modal */}
      <SetupComplianceTrackerModal
        buildingId={building.id}
        buildingName={building.name}
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onSuccess={handleSetupModalSuccess}
      />
    </div>
  )
} 