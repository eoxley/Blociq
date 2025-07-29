'use client'

import { useState } from 'react'
import { Building2, AlertTriangle, CheckCircle, Clock, Users, Shield, FileText, Mail, Search, Edit3, Save, X, Home, Wrench, Calendar } from 'lucide-react'
import Link from 'next/link'
import BuildingUnitsClient from './BuildingUnitsClient'

interface Building {
  id: string
  name: string
  address: string | null
  unit_count: number | null
  notes: string | null
  is_hrb: boolean | null
  created_at: string
  updated_at: string
}

interface BuildingSetup {
  id: string
  building_id: string
  structure_type: 'Freehold' | 'RMC' | 'Tripartite' | null
  operational_notes: string | null
  client_type: string | null
  client_name: string | null
  client_contact: string | null
  client_email: string | null
}

interface Unit {
  id: string
  unit_number: string
  type: string | null
  floor: string | null
  building_id: string
  leaseholder_id: string | null
  created_at: string | null
}

interface ComplianceSummary {
  total: number
  compliant: number
  pending: number
  overdue: number
}

interface BuildingDetailClientProps {
  building: Building
  buildingSetup: BuildingSetup | null
  units: Unit[]
  complianceSummary: ComplianceSummary
  buildingId: string
}

export default function BuildingDetailClient({ 
  building, 
  buildingSetup, 
  units, 
  complianceSummary, 
  buildingId 
}: BuildingDetailClientProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState(building.notes || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveNotes = async () => {
    setIsSaving(true)
    try {
      // Here you would typically call an API to save the notes
      // For now, we'll just simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIsEditingNotes(false)
    } catch (error) {
      console.error('Failed to save notes:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TOP: Building Header with BlocIQ Gradient */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{building.name || 'Unnamed Building'}</h1>
                <p className="text-white/80 text-lg">
                  {building.address || 'No address provided'} • 
                  {units?.length || 0} unit{(units?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/buildings"
                className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
              >
                Back to Buildings
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* SECTION 1: Building Overview */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Building Overview</h2>
                <button
                  onClick={() => setIsEditingNotes(!isEditingNotes)}
                  className="text-[#008C8F] hover:text-[#7645ED] text-sm font-medium transition-colors"
                >
                  {isEditingNotes ? 'Cancel' : 'Edit Notes'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Structure Type:</span>
                      <span className="font-medium">{buildingSetup?.structure_type || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium">{building.is_hrb ? 'HRB' : 'Standard'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Units:</span>
                      <span className="font-medium">{units?.length || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                  {isEditingNotes ? (
                    <div className="space-y-3">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                        rows={4}
                        placeholder="Add building notes..."
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveNotes}
                          disabled={isSaving}
                          className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingNotes(false)
                            setNotes(building.notes || '')
                          }}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      {building.notes || 'No notes added yet. Click "Edit Notes" to add building information.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: Compliance Overview */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Compliance Overview</h2>
                <Link
                  href={`/buildings/${buildingId}/compliance`}
                  className="text-[#008C8F] hover:text-[#7645ED] text-sm font-medium transition-colors"
                >
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{complianceSummary.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{complianceSummary.compliant}</div>
                  <div className="text-sm text-green-600">Compliant</div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{complianceSummary.pending}</div>
                  <div className="text-sm text-yellow-600">Pending</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{complianceSummary.overdue}</div>
                  <div className="text-sm text-red-600">Overdue</div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Major Works */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Major Works</h2>
                <Link
                  href={`/buildings/${buildingId}/major-works`}
                  className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Add Major Work
                </Link>
              </div>
              <div className="text-center py-8">
                <Wrench className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No major works recorded yet</h3>
                <p className="text-gray-600">
                  This section will track upcoming projects and historic works.
                </p>
              </div>
            </div>

            {/* SECTION 4: Units */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Units</h2>
              </div>
              <BuildingUnitsClient units={units || []} buildingId={buildingId} />
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href={`/buildings/${buildingId}/compliance/setup`}
                  className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Shield className="h-5 w-5 text-[#008C8F] mr-3" />
                  <span className="text-gray-700">Compliance Setup</span>
                </Link>
                <Link
                  href={`/buildings/${buildingId}/communications`}
                  className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Mail className="h-5 w-5 text-[#008C8F] mr-3" />
                  <span className="text-gray-700">Communications</span>
                </Link>
                <Link
                  href={`/buildings/${buildingId}/major-works`}
                  className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Wrench className="h-5 w-5 text-[#008C8F] mr-3" />
                  <span className="text-gray-700">Major Works</span>
                </Link>
                <Link
                  href={`/buildings/${buildingId}/calendar`}
                  className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Calendar className="h-5 w-5 text-[#008C8F] mr-3" />
                  <span className="text-gray-700">Calendar</span>
                </Link>
              </div>
            </div>

            {/* Building Stats */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Building Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Units</span>
                  <span className="font-semibold">{units?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Occupied Units</span>
                  <span className="font-semibold">
                    {units?.filter(unit => unit.leaseholder_id).length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Compliance Items</span>
                  <span className="font-semibold">{complianceSummary.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Overdue Items</span>
                  <span className="font-semibold text-red-600">{complianceSummary.overdue}</span>
                </div>
              </div>
            </div>

            {/* Client Information */}
            {buildingSetup && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Client Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Client Type</span>
                    <p className="font-medium">{buildingSetup.client_type || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Client Name</span>
                    <p className="font-medium">{buildingSetup.client_name || 'Not specified'}</p>
                  </div>
                  {buildingSetup.client_email && (
                    <div>
                      <span className="text-sm text-gray-600">Contact Email</span>
                      <p className="font-medium">{buildingSetup.client_email}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}