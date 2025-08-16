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
  Clock,
  ChevronLeft
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import SectionCard from '@/components/ui/SectionCard'
import { InfoRow } from '@/components/ui/InfoRow'
import EditIconButton from '@/components/ui/EditIconButton'
import EmptyValue from '@/components/ui/EmptyValue'
import Revealable from '@/components/ui/Revealable'

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
      <InfoRow
        label={label}
        value={
          isEditing ? (
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
              <span className="font-medium">
                {value || <EmptyValue label="Add" onClick={() => startEditing(field, value)} />}
              </span>
              <EditIconButton onClick={() => startEditing(field, value)} />
            </div>
          )
        }
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Hero Banner - UNTOUCHED */}
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
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Buildings
        </Link>
      </div>

      {/* General Info Section */}
      <SectionCard className="group">
        <div className="px-4 py-3">
          <h3 className="flex items-center gap-2 text-neutral-800 font-semibold">
            <Building2 className="h-5 w-5 text-[#4f46e5]" />
            General Information
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderEditableField('name', building.name || '', 'Building Name')}
          <InfoRow
            label="Address:"
            value={
              building.address ? (
                <span className="whitespace-pre-wrap">{building.address}</span>
              ) : (
                <EmptyValue label="Add address" onClick={() => startEditing('address', building.address || '')} />
              )
            }
          />
          {renderEditableField('setup_structure_type', buildingSetup?.structure_type || '', 'Structure Type')}
          {renderEditableField('setup_client_name', buildingSetup?.client_name || '', 'Freeholder/RMC')}
          <InfoRow label="Number of Units:" value={<span>{units?.length || 0}</span>} />
          <InfoRow 
            label="Status:" 
            value={
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                building.is_hrb ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {building.is_hrb ? 'HRB' : 'Standard'}
              </span>
            } 
          />
        </div>
      </SectionCard>

      {/* Access Information Section */}
      <SectionCard className="group">
        <div className="px-4 py-3">
          <h3 className="flex items-center gap-2 text-neutral-800 font-semibold">
            <Lock className="h-5 w-5 text-[#4f46e5]" />
            Access Information
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label="Gate Code:"
            value={
              buildingSetup?.operational_notes ? (
                <Revealable text={buildingSetup.operational_notes} />
              ) : (
                <EmptyValue label="Add code" onClick={() => startEditing('setup_operational_notes', buildingSetup?.operational_notes || '')} />
              )
            }
          />
          <InfoRow
            label="Fire Panel Code:"
            value={
              building.notes ? (
                <Revealable text={building.notes} />
              ) : (
                <EmptyValue label="Add code" onClick={() => startEditing('notes', building.notes || '')} />
              )
            }
          />
          <InfoRow
            label="Keys Location:"
            value={<EmptyValue label="Add location" />}
          />
          <InfoRow
            label="Emergency Access:"
            value={<EmptyValue label="Add access" />}
          />
        </div>
      </SectionCard>

      {/* Contacts Section */}
      <SectionCard className="group">
        <div className="px-4 py-3">
          <h3 className="flex items-center gap-2 text-neutral-800 font-semibold">
            <Users className="h-5 w-5 text-[#4f46e5]" />
            Contacts
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderEditableField('setup_client_contact', buildingSetup?.client_contact || '', 'Managing Agent')}
          {renderEditableField('setup_client_email', buildingSetup?.client_email || '', 'Managing Agent Email')}
          <InfoRow
            label="Insurance Contact:"
            value={<EmptyValue label="Add contact" />}
          />
          <InfoRow
            label="Cleaners:"
            value={<EmptyValue label="Add cleaners" />}
          />
          <InfoRow
            label="Contractors:"
            value={<EmptyValue label="Add contractors" />}
          />
        </div>
      </SectionCard>

      {/* Site Staff Section */}
      <SectionCard className="group">
        <div className="px-4 py-3">
          <h3 className="flex items-center gap-2 text-neutral-800 font-semibold">
            <User className="h-5 w-5 text-[#4f46e5]" />
            Site Staff
          </h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">No site staff assigned</div>
              <div className="text-sm text-gray-600">Add site staff information</div>
            </div>
            <EditIconButton />
          </div>
        </div>
      </SectionCard>

      {/* Notes & Instructions Section */}
      <SectionCard className="group">
        <div className="px-4 py-3">
          <h3 className="flex items-center gap-2 text-neutral-800 font-semibold">
            <FileText className="h-5 w-5 text-[#4f46e5]" />
            Notes & Instructions
          </h3>
        </div>
        
        <div className="space-y-3">
          {editingField === 'notes' ? (
            <div className="space-y-3 p-4">
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
            <div className="flex items-start justify-between p-4">
              <p className="text-gray-600 flex-1">
                {building.notes || 'No notes added yet. Click edit to add building information and instructions.'}
              </p>
              <EditIconButton onClick={() => startEditing('notes', building.notes || '')} />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Units List Section */}
      <SectionCard className="group">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-neutral-800 font-semibold">
              <Home className="h-5 w-5 text-[#4f46e5]" />
              Units & Leaseholders
            </h3>
            <span className="text-sm text-gray-600">{units?.length || 0} units</span>
          </div>
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
      </SectionCard>

      {/* Compliance Summary Section */}
      <SectionCard className="group">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-neutral-800 font-semibold">
              <Shield className="h-5 w-5 text-[#4f46e5]" />
              Compliance Overview
            </h3>
            <Link
              href={`/buildings/${buildingId}/compliance`}
              className="text-[#4f46e5] hover:text-[#4338ca] text-sm font-medium transition-colors"
            >
              View All
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
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
      </SectionCard>

      {/* Quick Actions */}
      <SectionCard className="group">
        <div className="px-4 py-3">
          <h3 className="text-neutral-800 font-semibold">Quick Actions</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
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
      </SectionCard>
    </div>
  )
}