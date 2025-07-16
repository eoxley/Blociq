'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Shield, FileText, Mail, ChevronDown, ChevronUp, ExternalLink, Clock, Wrench, Plus, Users, Edit, Save, X, UserPlus } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useBlocIQContext } from '@/components/BlocIQContext'

type Building = {
  id: string
  name: string
  address: string
  service_charge_year_end?: string
  section_20_threshold?: number
  insurance_renewal_date?: string
  property_account_balance?: number
  ews1_status?: string
  fire_door_survey?: string
  gas_eicr_status?: string
}

type Email = {
  id: string
  subject: string
  sender: string
  preview: string
  created_at: string
}

type Unit = {
  id: string
  unit_number: string
  type: string
  floor: string
  leaseholders: Array<{
    name: string
    email: string
    phone: string
  }>
}

interface BuildingDetailClientProps {
  building: Building
  recentEmails: Email[]
}

export default function BuildingDetailClient({ building, recentEmails }: BuildingDetailClientProps) {
  const [complianceExpanded, setComplianceExpanded] = useState(false)
  const [units, setUnits] = useState<Unit[]>([])
  const [loadingUnits, setLoadingUnits] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedBuilding, setEditedBuilding] = useState(building)
  const supabase = createClientComponentClient()
  const { setContext } = useBlocIQContext()

  // Set building context for AskBlocIQ
  useEffect(() => {
    setContext({
      buildingId: parseInt(building.id),
      buildingName: building.name,
    });
  }, [building.id, building.name, setContext]);

  // Fetch units for this building
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        // First fetch units
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('id, unit_number, type, floor')
          .eq('building_id', building.id)
          .order('unit_number')

        if (unitsError) {
          console.error('Error fetching units:', unitsError)
          return
        }

        // Then fetch leaseholders separately
        let leaseholders: any[] = []
        if (unitsData && unitsData.length > 0) {
          const unitIds = unitsData.map(u => u.id)
          const { data: leaseholdersData, error: leaseholdersError } = await supabase
            .from('leaseholders')
            .select('id, unit_id, name, email, phone')
            .in('unit_id', unitIds)
          
          if (!leaseholdersError && leaseholdersData) {
            leaseholders = leaseholdersData
          }
        }

        // Combine units with their leaseholders
        const unitsWithLeaseholders = unitsData?.map(unit => ({
          ...unit,
          leaseholders: leaseholders.filter(l => l.unit_id === unit.id)
        })) || []

        setUnits(unitsWithLeaseholders)
      } catch (error) {
        console.error('Error fetching units:', error)
      } finally {
        setLoadingUnits(false)
      }
    }

    fetchUnits()
  }, [building.id, supabase])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('buildings')
        .update(editedBuilding)
        .eq('id', building.id)

      if (error) {
        console.error('Error updating building:', error)
      } else {
        setIsEditing(false)
        // Update the building prop if needed
      }
    } catch (error) {
      console.error('Error saving building:', error)
    }
  }

  const handleEmailLeaseholder = (email: string) => {
    window.open(`mailto:${email}`, '_blank')
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Building Overview Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href="/home" 
            className="flex items-center gap-2 text-[#0F5D5D] hover:text-teal-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Home
          </Link>
        </div>
        
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedBuilding.name}
                    onChange={(e) => setEditedBuilding({...editedBuilding, name: e.target.value})}
                    className="text-3xl font-bold text-[#0F5D5D] bg-transparent border-b border-gray-300 focus:outline-none focus:border-teal-500"
                  />
                ) : (
                  building.name
                )}
              </h1>
              <p className="text-lg text-gray-600">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedBuilding.address}
                    onChange={(e) => setEditedBuilding({...editedBuilding, address: e.target.value})}
                    className="text-lg text-gray-600 bg-transparent border-b border-gray-300 focus:outline-none focus:border-teal-500 w-full"
                  />
                ) : (
                  building.address
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditedBuilding(building)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              )}
            </div>
          </div>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-4 mt-4">
            <Link 
              href={`/buildings/${building.id}/units`}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Users className="h-4 w-4" />
              View Units
            </Link>
            <Link 
              href={`/buildings/${building.id}/major-works`}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Wrench className="h-4 w-4" />
              Major Works
            </Link>
          </div>
        </div>
      </div>

      {/* Units Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-[#0F5D5D] flex items-center gap-2">
            <Users className="h-6 w-6" />
            Units ({units.length})
          </h2>
          <Link 
            href={`/buildings/${building.id}/units`}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            View All Units
          </Link>
        </div>

        {loadingUnits ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading units...</p>
          </div>
        ) : units.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.slice(0, 6).map((unit) => (
              <div key={unit.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{unit.unit_number}</h3>
                  <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded">
                    {unit.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Floor {unit.floor}</p>
                {unit.leaseholders && unit.leaseholders.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-700">
                      <p className="font-medium">{unit.leaseholders[0].name}</p>
                      <p className="text-gray-600">{unit.leaseholders[0].email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEmailLeaseholder(unit.leaseholders[0].email)}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
                        title="Email leaseholder"
                      >
                        <Mail className="h-3 w-3" />
                        Email
                      </button>
                      <button
                        className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition-colors"
                        title="Add occupier"
                      >
                        <UserPlus className="h-3 w-3" />
                        Add Occupier
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 italic">No leaseholder assigned</p>
                    <button
                      className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition-colors"
                      title="Add occupier"
                    >
                      <UserPlus className="h-3 w-3" />
                      Add Occupier
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Units Found</h3>
            <p className="text-gray-500">No units have been added to this building yet.</p>
          </div>
        )}
      </div>

      {/* Key Dates & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="h-6 w-6 text-teal-600" />
            <h3 className="font-semibold text-[#0F5D5D]">Service Charge Year End</h3>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🚧</div>
              <h4 className="font-medium text-gray-900 mb-2">Coming Soon</h4>
              <p className="text-gray-600 text-sm">
                Service charge management features are under development.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-6 w-6 text-teal-600" />
            <h3 className="font-semibold text-[#0F5D5D]">Section 20 Threshold</h3>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🚧</div>
              <h4 className="font-medium text-gray-900 mb-2">Coming Soon</h4>
              <p className="text-gray-600 text-sm">
                Section 20 management features are under development.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="h-6 w-6 text-teal-600" />
            <h3 className="font-semibold text-[#0F5D5D]">Account Balance</h3>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🚧</div>
              <h4 className="font-medium text-gray-900 mb-2">Coming Soon</h4>
              <p className="text-gray-600 text-sm">
                Financial management features are under development.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Compliance Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div 
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => setComplianceExpanded(!complianceExpanded)}
          >
            <h2 className="text-xl font-semibold text-[#0F5D5D] flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance
            </h2>
            {complianceExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>

          {complianceExpanded && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-lg">
                    <span className="text-white text-lg">📄</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Document Management</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Coming Soon</span>
                  </div>
                </div>
                
                <div className="text-gray-600 text-sm mb-4">
                  <p className="mb-2">🎯 <strong>What's coming:</strong></p>
                  <ul className="space-y-1 text-sm">
                    <li>• Secure document upload and storage</li>
                    <li>• PDF viewer and annotation tools</li>
                    <li>• Version control and audit trails</li>
                    <li>• Automated compliance tracking</li>
                  </ul>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="text-center">
                      <div className="text-2xl mb-2">🏢</div>
                      <h4 className="font-medium text-gray-900 text-sm">EWS1 Certificate</h4>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        {building.ews1_status || 'Pass'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="text-center">
                      <div className="text-2xl mb-2">🚪</div>
                      <h4 className="font-medium text-gray-900 text-sm">Fire Door Survey</h4>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        {building.fire_door_survey || 'Pending'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="text-center">
                      <div className="text-2xl mb-2">⚡</div>
                      <h4 className="font-medium text-gray-900 text-sm">Gas & EICR</h4>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        {building.gas_eicr_status || 'Current'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Emails Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#0F5D5D] flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Recent Emails
            </h2>
            <Link 
              href="/inbox"
              className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
            >
              View All
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          {recentEmails && recentEmails.length > 0 ? (
            <div className="space-y-3">
              {recentEmails.slice(0, 3).map((email) => (
                <div key={email.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm text-gray-900">{email.subject}</p>
                    <span className="text-xs text-gray-500">{email.sender}</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{email.preview}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Emails</h3>
              <p className="text-gray-500">No emails have been received for this building.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 