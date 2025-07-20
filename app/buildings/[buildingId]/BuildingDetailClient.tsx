'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Shield, FileText, Mail, ChevronDown, ChevronUp, ExternalLink, Clock, Wrench, Plus, Users, Edit, Save, X, UserPlus } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useBlocIQContext } from '@/components/BlocIQContext'
import BuildingSetup from '@/components/building/BuildingSetup'
import BuildingInfo from '@/components/building/BuildingInfo'

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
  notes?: string
  leaseholder?: {
    full_name: string
    email: string
    phone: string
  }
}

interface BuildingDetailClientProps {
  building: Building
  recentEmails: Email[]
}

export default function BuildingDetailClient({ building, recentEmails }: BuildingDetailClientProps) {
  const [units, setUnits] = useState<Unit[]>([])
  const [loadingUnits, setLoadingUnits] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedBuilding, setEditedBuilding] = useState(building)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClientComponentClient()
  const { setContext } = useBlocIQContext()

  // Filter units based on search term
  const filteredUnits = units.filter((unit) => {
    const unitNumber = unit.unit_number?.toLowerCase() || ''
    const leaseholder = unit.leaseholder?.full_name?.toLowerCase() || ''
    const search = searchTerm.toLowerCase()
    return unitNumber.includes(search) || leaseholder.includes(search)
  })

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
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('id, unit_number, type, floor, notes, leaseholders(full_name, email, phone)')
          .eq('building_id', building.id)
          .order('unit_number')

        if (unitsError) {
          console.error('Error fetching units:', unitsError)
          return
        }

        // Transform the data to match our Unit type
        const transformedUnits = (unitsData || []).map((unit: any) => ({
          ...unit,
          leaseholder: unit.leaseholders?.[0] || null
        }))

        setUnits(transformedUnits)
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
      {/* Compliance Widget - Prominent Position */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Building Compliance</h2>
              <p className="text-blue-100">Manage safety certificates, inspections, and regulatory requirements</p>
            </div>
          </div>
          <Link
            href={`/buildings/${building.id}/compliance/tracker`}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors font-semibold flex items-center gap-2 shadow-lg"
          >
            <Shield className="h-5 w-5" />
            View Compliance
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Building Overview Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
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
          

        </div>
      </div>

      {/* Units Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-1">Units ({units.length})</h2>

          <input
            type="text"
            placeholder="Search by unit or leaseholder name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md border rounded px-3 py-2 text-sm"
          />

          {loadingUnits ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading units...</p>
            </div>
          ) : filteredUnits.length > 0 ? (
            <div className="border rounded-md overflow-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 w-1/4">Unit</th>
                    <th className="text-left px-3 py-2 w-1/4">Leaseholder</th>
                    <th className="text-left px-3 py-2 w-1/2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.map((unit) => (
                    <tr key={unit.id} className="border-t hover:bg-muted/50">
                      <td className="px-3 py-2">{unit.unit_number}</td>
                      <td className="px-3 py-2">{unit.leaseholder?.full_name || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{unit.notes || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Units Found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'No units match your search criteria.' : 'No units have been added to this building yet.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Building Information */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <BuildingInfo buildingId={building.id} />
      </div>

      {/* Building Structure & Setup */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <BuildingSetup />
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
            <Shield className="h-6 w-6 text-teal-600" />
            <h3 className="font-semibold text-[#0F5D5D]">Compliance Status</h3>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🛡️</div>
              <h4 className="font-medium text-gray-900 mb-2">Active</h4>
              <p className="text-gray-600 text-sm mb-3">
                All compliance requirements are up to date
              </p>
              <Link
                href={`/buildings/${building.id}/compliance/tracker`}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Shield className="h-4 w-4" />
                View Details
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Major Works Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="h-6 w-6 text-teal-600" />
            <h2 className="text-xl font-semibold text-[#0F5D5D]">Major Works</h2>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🚧</div>
              <h4 className="font-medium text-gray-900 mb-2">Coming Soon</h4>
              <p className="text-gray-600 text-sm">
                Major works management features are under development.
              </p>
            </div>
          </div>
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