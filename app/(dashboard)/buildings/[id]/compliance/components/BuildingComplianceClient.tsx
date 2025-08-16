'use client'

import { useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, Clock, Calendar, FileText, Upload, Edit3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import SetupComplianceModal from '@/components/compliance/SetupComplianceModal'

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
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [hasRows, setHasRows] = useState(hasComplianceSetup)
  const [loading, setLoading] = useState(false)

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

  async function refreshHasRows() {
    setLoading(true);
    try {
      const response = await fetch(`/api/buildings/${building.id}/compliance`, { cache: "no-store" });
      const data = await response.json();
      setHasRows((data.data || []).length > 0);
    } catch (error) {
      console.error('Error refreshing compliance data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSetupModalSuccess = async () => {
    await refreshHasRows();
    setShowSetupModal(false);
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
    <div className="space-y-4">
      {/* DO NOT edit hero/banner above this component */}

      {/* Mode switch */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSetupModal(true)}
          className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm"
        >
          Setup compliance
        </button>
        {hasRows ? <span className="text-sm text-neutral-600">Tracking {hasRows ? "enabled" : "—"}</span> : null}
      </div>

      {/* Body */}
      <div>
        {hasRows ? (
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
              <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
                No assets selected yet. Click <strong>Setup compliance</strong> to begin.
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
            No assets selected yet. Click <strong>Setup compliance</strong> to begin.
          </div>
        )}
      </div>

      {/* Setup Compliance Modal */}
      {showSetupModal && (
        <SetupComplianceModal
          open={showSetupModal}
          buildingId={building.id}
          onClose={() => setShowSetupModal(false)}
          onSaved={handleSetupModalSuccess}
        />
      )}
    </div>
  );
} 