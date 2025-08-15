'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, 
  MapPin, 
  Users, 
  Shield, 
  Key, 
  Phone, 
  Mail, 
  FileText, 
  Edit3, 
  Save, 
  X, 
  Home, 
  Wrench, 
  Calendar,
  Lock,
  User,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

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

interface Leaseholder {
  id: string
  name: string
  email: string
  phone: string | null
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
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [leaseholders, setLeaseholders] = useState<Record<string, Leaseholder>>({})

  // Fetch leaseholder data for units
  useEffect(() => {
    const fetchLeaseholders = async () => {
      const leaseholderIds = units
        .filter(unit => unit.leaseholder_id)
        .map(unit => unit.leaseholder_id!)
        .filter((id, index, arr) => arr.indexOf(id) === index) // unique IDs

      if (leaseholderIds.length === 0) return

      const { data, error } = await supabase
        .from('leaseholders')
        .select('id, name, email, phone')
        .in('id', leaseholderIds)

      if (!error && data) {
        const leaseholderMap: Record<string, Leaseholder> = {}
        data.forEach(leaseholder => {
          leaseholderMap[leaseholder.id] = leaseholder
        })
        setLeaseholders(leaseholderMap)
      }
    }

    fetchLeaseholders()
  }, [units])

  const updateBuilding = async (updates: Partial<Building>) => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('buildings')
        .update(updates)
        .eq('id', buildingId)
      
      if (error) {
        console.error('Failed to update building:', error)
        throw error
      }
      
      // Update local state
      Object.assign(building, updates)
      setEditingField(null)
    } catch (error) {
      console.error('Failed to update building:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateBuildingSetup = async (updates: Partial<BuildingSetup>) => {
    setIsSaving(true)
    try {
      if (buildingSetup?.id) {
        // Update existing setup
        const { error } = await supabase
          .from('building_setup')
          .update(updates)
          .eq('id', buildingSetup.id)
        
        if (error) throw error
      } else {
        // Create new setup
        const { error } = await supabase
          .from('building_setup')
          .insert({
            building_id: buildingId,
            ...updates
          })
        
        if (error) throw error
      }
      
      setEditingField(null)
    } catch (error) {
      console.error('Failed to update building setup:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (field: string, value: string) => {
    setEditingField(field)
    setEditValue(value)
  }

  const saveEdit = async () => {
    if (!editingField) return

    const updates: any = {}
    updates[editingField] = editValue

    if (editingField.startsWith('setup_')) {
      const setupField = editingField.replace('setup_', '')
      await updateBuildingSetup({ [setupField]: editValue })
    } else {
      await updateBuilding(updates)
    }
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  const renderEditableField = (field: string, value: string, label: string, placeholder?: string) => {
    const isEditing = editingField === field
    
    return (
      <div className="flex items-center justify-between">
        <span className="text-gray-600">{label}:</span>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="border px-2 py-1 rounded text-sm w-48"
              placeholder={placeholder}
            />
            <button
              onClick={saveEdit}
              disabled={isSaving}
              className="text-green-600 hover:text-green-800"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={cancelEdit}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium">{value || 'Not set'}</span>
            <button
              onClick={() => startEditing(field, value)}
              className="text-blue-600 hover:text-blue-800"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mb-8 rounded-2xl shadow-xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{building.name || 'Building Information'}</h1>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              Manage building details, access information, and leaseholder data
            </p>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Building Details</h2>
          <p className="text-gray-600 mt-1">Manage building details and access information</p>
        </div>
        <Link
          href="/buildings"
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back to Buildings
        </Link>
      </div>

      {/* General Info Section */}
      <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#4f46e5]" />
          <h2 className="text-xl font-semibold text-gray-800">General Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderEditableField('name', building.name || '', 'Building Name', 'Enter building name')}
          {renderEditableField('address', building.address || '', 'Address', 'Enter full address')}
          {renderEditableField('setup_structure_type', buildingSetup?.structure_type || '', 'Structure Type', 'Freehold/RMC/Tripartite')}
          {renderEditableField('setup_client_name', buildingSetup?.client_name || '', 'Freeholder/RMC', 'Enter client name')}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Number of Units:</span>
            <span className="font-medium">{units?.length || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Status:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              building.is_hrb ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {building.is_hrb ? 'HRB' : 'Standard'}
            </span>
          </div>
        </div>
      </div>

      {/* Access Information Section */}
      <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-[#4f46e5]" />
          <h2 className="text-xl font-semibold text-gray-800">Access Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderEditableField('setup_operational_notes', buildingSetup?.operational_notes || '', 'Gate Code', 'Enter gate code')}
          {renderEditableField('notes', building.notes || '', 'Fire Panel Code', 'Enter fire panel code')}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Keys Location:</span>
            <span className="font-medium">Not set</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Emergency Access:</span>
            <span className="font-medium">Not set</span>
          </div>
        </div>
      </div>

      {/* Contacts Section */}
      <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#4f46e5]" />
          <h2 className="text-xl font-semibold text-gray-800">Contacts</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderEditableField('setup_client_contact', buildingSetup?.client_contact || '', 'Managing Agent', 'Enter contact name')}
          {renderEditableField('setup_client_email', buildingSetup?.client_email || '', 'Managing Agent Email', 'Enter email address')}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Insurance Contact:</span>
            <span className="font-medium">Not set</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Cleaners:</span>
            <span className="font-medium">Not set</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Contractors:</span>
            <span className="font-medium">Not set</span>
          </div>
        </div>
      </div>

      {/* Site Staff Section */}
      <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-[#4f46e5]" />
          <h2 className="text-xl font-semibold text-gray-800">Site Staff</h2>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">No site staff assigned</div>
              <div className="text-sm text-gray-600">Add site staff information</div>
            </div>
            <button className="text-blue-600 hover:text-blue-800">
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Notes & Instructions Section */}
      <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#4f46e5]" />
          <h2 className="text-xl font-semibold text-gray-800">Notes & Instructions</h2>
        </div>
        
        <div className="space-y-3">
          {editingField === 'notes' ? (
            <div className="space-y-3">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                rows={4}
                placeholder="Add building notes and instructions..."
              />
              <div className="flex space-x-2">
                <button
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="bg-[#4f46e5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <p className="text-gray-600 flex-1">
                {building.notes || 'No notes added yet. Click edit to add building information and instructions.'}
              </p>
              <button
                onClick={() => startEditing('notes', building.notes || '')}
                className="text-blue-600 hover:text-blue-800 ml-2"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Units List Section */}
      <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-[#4f46e5]" />
            <h2 className="text-xl font-semibold text-gray-800">Units & Leaseholders</h2>
          </div>
          <span className="text-sm text-gray-600">{units?.length || 0} units</span>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto rounded border">
          <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 border-b font-medium text-sm text-gray-700">
            <div>Unit</div>
            <div>Leaseholder</div>
            <div>Email</div>
            <div>Actions</div>
          </div>
          
          {units?.map((unit) => {
            const leaseholder = unit.leaseholder_id ? leaseholders[unit.leaseholder_id] : null
            return (
              <div key={unit.id} className="grid grid-cols-4 gap-4 p-3 border-b text-sm hover:bg-gray-50">
                <div className="font-medium">Flat {unit.unit_number}</div>
                <div>{leaseholder?.name || 'No leaseholder'}</div>
                <div className="text-gray-600">{leaseholder?.email || '-'}</div>
                <div>
                  <button className="text-blue-600 underline hover:text-blue-800">
                    Log call
                  </button>
                </div>
              </div>
            )
          })}
          
          {(!units || units.length === 0) && (
            <div className="p-8 text-center text-gray-500">
              <Home className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No units found for this building</p>
            </div>
          )}
        </div>
      </div>

      {/* Compliance Summary Section */}
      <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#4f46e5]" />
            <h2 className="text-xl font-semibold text-gray-800">Compliance Overview</h2>
          </div>
          <Link
            href={`/buildings/${buildingId}/compliance`}
            className="text-[#4f46e5] hover:text-[#4338ca] text-sm font-medium transition-colors"
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

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Quick Actions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/buildings/${buildingId}/compliance/setup`}
            className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Shield className="h-5 w-5 text-[#4f46e5] mr-3" />
            <span className="text-gray-700">Compliance Setup</span>
          </Link>
          <Link
            href={`/buildings/${buildingId}/communications`}
            className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Mail className="h-5 w-5 text-[#4f46e5] mr-3" />
            <span className="text-gray-700">Communications</span>
          </Link>
          <Link
            href={`/buildings/${buildingId}/major-works`}
            className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Wrench className="h-5 w-5 text-[#4f46e5] mr-3" />
            <span className="text-gray-700">Major Works</span>
          </Link>
        </div>
      </div>
    </div>
  )
}