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
  ChevronLeft,
  Settings,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import SectionCard from '@/components/ui/SectionCard'
import { InfoRow } from '@/components/ui/InfoRow'
import EditIconButton from '@/components/ui/EditIconButton'
import EmptyValue from '@/components/ui/EmptyValue'
import Revealable from '@/components/ui/Revealable'
import UnitsTable from '@/components/buildings/UnitsTable'
import ActionTracker from '@/components/buildings/ActionTracker'
import CommunicationsLog from '@/components/communications/CommunicationsLog'

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
  keys_location: string | null
  emergency_access: string | null
  site_staff: string | null
  site_staff_updated_at: string | null
  insurance_contact: string | null
  cleaners: string | null
  contractors: string | null
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
  const [showSuccess, setShowSuccess] = useState(false)
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

  const showSuccessMessage = () => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

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
      showSuccessMessage()
    } catch (error) {
      console.error('Failed to update building:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateBuildingSetup = async (updates: Partial<BuildingSetup>) => {
    setIsSaving(true)
    try {
      // Add timestamp for relevant fields
      const timestampedUpdates = { ...updates }
      if (updates.site_staff !== undefined) {
        timestampedUpdates.site_staff_updated_at = new Date().toISOString()
      }

      // Use the building-setup API endpoint (with hyphen)
      const response = await fetch('/api/building-setup', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: buildingId,
          ...timestampedUpdates
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update building setup')
      }

      // Update local state
      if (buildingSetup) {
        Object.assign(buildingSetup, timestampedUpdates)
      } else {
        // If no setup existed, we need to refresh the page or create a local object
        // For now, let's create a minimal setup object
        if (!buildingSetup) {
          console.log('Building setup was created, consider refreshing data')
        }
      }

      setEditingField(null)
      showSuccessMessage()
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
      // Add timestamp for notes updates
      if (editingField === 'notes') {
        updates.updated_at = new Date().toISOString()
      }
      await updateBuilding(updates)
    }
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  const renderEditableField = (field: string, value: string | null, label: string, placeholder?: string, multiline?: boolean) => {
    const isEditing = editingField === field
    const displayValue = value || ''

    return (
      <InfoRow
        label={label}
        value={
          isEditing ? (
            <div className="flex items-start gap-2">
              {multiline || field === 'address' ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="border-2 border-gray-300 px-3 py-2 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all duration-200 resize-none"
                  rows={3}
                  placeholder={placeholder}
                  autoFocus
                />
              ) : (
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="border-2 border-gray-300 px-3 py-2 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all duration-200"
                  placeholder={placeholder}
                  autoFocus
                />
              )}
              <div className="flex flex-col gap-1">
                <button
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
                  title="Save changes"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-50 transition-colors"
                  title="Cancel editing"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <span className="font-medium whitespace-pre-wrap">
                {displayValue || <EmptyValue label="Add" onClick={() => startEditing(field, displayValue)} />}
              </span>
              <EditIconButton onClick={() => startEditing(field, displayValue)} />
            </div>
          )
        }
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <span>Changes saved successfully!</span>
        </div>
      )}

      {/* General Info Section */}
      <SectionCard className="group">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2 text-white">
            <Building2 className="h-5 w-5" />
            <h3 className="font-semibold">General Information</h3>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-4 w-8 h-8 bg-white/5 rounded-full blur-lg"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderEditableField('name', building.name || '', 'Building Name')}
          {renderEditableField('address', building.address || '', 'Address:', 'Enter building address')}
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
        <div className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2 text-white">
            <Lock className="h-5 w-5" />
            <h3 className="font-semibold">Access Information</h3>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-4 w-8 h-8 bg-white/5 rounded-full blur-lg"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderEditableField('setup_operational_notes', buildingSetup?.operational_notes || '', 'Gate Code', 'Enter gate code')}
          {renderEditableField('notes', building.notes || '', 'Fire Panel Code', 'Enter fire panel code')}
          {renderEditableField('setup_keys_location', buildingSetup?.keys_location || '', 'Keys Location', 'Enter keys location')}
          {renderEditableField('setup_emergency_access', buildingSetup?.emergency_access || '', 'Emergency Access', 'Enter emergency access details')}
        </div>
      </SectionCard>

      {/* Contacts Section */}
      <SectionCard className="group">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5" />
            <h3 className="font-semibold">Contacts</h3>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-4 w-8 h-8 bg-white/5 rounded-full blur-lg"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderEditableField('setup_client_contact', buildingSetup?.client_contact || '', 'Managing Agent', 'Enter managing agent name')}
          {renderEditableField('setup_client_email', buildingSetup?.client_email || '', 'Managing Agent Email', 'Enter managing agent email')}
          {renderEditableField('setup_insurance_contact', buildingSetup?.insurance_contact || '', 'Insurance Contact', 'Enter insurance contact details')}
          {renderEditableField('setup_cleaners', buildingSetup?.cleaners || '', 'Cleaners', 'Enter cleaners contact details')}
          {renderEditableField('setup_contractors', buildingSetup?.contractors || '', 'Contractors', 'Enter contractors contact details')}
        </div>
      </SectionCard>

      {/* Site Staff Section */}
      <SectionCard className="group">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2 text-white">
            <User className="h-5 w-5" />
            <h3 className="font-semibold">Site Staff</h3>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-4 w-8 h-8 bg-white/5 rounded-full blur-lg"></div>
        </div>
        
        <div className="space-y-3">
          {editingField === 'site_staff' ? (
            <div className="space-y-3 p-4">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all duration-200 resize-none"
                rows={4}
                placeholder="Enter site staff information including names, roles, and contact details..."
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="bg-[#4f46e5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition-colors disabled:opacity-50 font-medium"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between p-4">
              <div className="flex-1">
                <p className="text-gray-600">
                  {buildingSetup?.site_staff || 'No site staff assigned yet. Click edit to add site staff information.'}
                </p>
                {buildingSetup?.site_staff_updated_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    Last updated: {new Date(buildingSetup.site_staff_updated_at).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
              <EditIconButton onClick={() => startEditing('site_staff', buildingSetup?.site_staff || '')} />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Notes & Instructions Section */}
      <SectionCard className="group">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5" />
            <h3 className="font-semibold">Notes & Instructions</h3>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-4 w-8 h-8 bg-white/5 rounded-full blur-lg"></div>
        </div>
        
        <div className="space-y-3">
          {editingField === 'notes' ? (
            <div className="space-y-3 p-4">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all duration-200 resize-none"
                rows={4}
                placeholder="Add building notes and instructions..."
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="bg-[#4f46e5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition-colors disabled:opacity-50 font-medium"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between p-4">
              <div className="flex-1">
                <p className="text-gray-600">
                  {building.notes || 'No notes added yet. Click edit to add building information and instructions.'}
                </p>
                {building.updated_at && (
                  <p className="text-xs text-gray-400 mt-2" suppressHydrationWarning>
                    Last updated: {new Date(building.updated_at).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
              <EditIconButton onClick={() => startEditing('notes', building.notes || '')} />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Units List Section */}
      <SectionCard className="group">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] px-4 py-3 rounded-t-2xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              <h3 className="font-semibold">Units & Leaseholders</h3>
            </div>
            <span className="text-sm text-white/80">{units?.length || 0} units</span>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-4 w-8 h-8 bg-white/5 rounded-full blur-lg"></div>
        </div>
        
        <div className="p-4">
          <UnitsTable buildingId={buildingId} />
        </div>
      </SectionCard>

      {/* Action Tracker Section */}
      <ActionTracker buildingId={buildingId} />

      {/* Communications Section */}
      <SectionCard className="group">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] px-4 py-3 rounded-t-2xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <h3 className="font-semibold">Recent Communications</h3>
            </div>
            <Link
              href={`/buildings/${buildingId}/communications`}
              className="text-white/90 hover:text-white text-sm font-medium transition-colors"
            >
              View All Communications
            </Link>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-4 w-8 h-8 bg-white/5 rounded-full blur-lg"></div>
        </div>

        <div className="p-4">
          <CommunicationsLog
            buildingId={buildingId}
            showFilters={false}
            limit={5}
          />
        </div>
      </SectionCard>

      {/* Compliance Summary Section */}
      <SectionCard className="group">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] px-4 py-3 rounded-t-2xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <h3 className="font-semibold">Compliance Overview</h3>
            </div>
            <Link
              href={`/buildings/${buildingId}/compliance`}
              className="text-white/90 hover:text-white text-sm font-medium transition-colors"
            >
              View Building Compliance
            </Link>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-4 w-8 h-8 bg-white/5 rounded-full blur-lg"></div>
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
        <div className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2 text-white">
            <Wrench className="h-5 w-5" />
            <h3 className="font-semibold">Quick Actions</h3>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-4 w-8 h-8 bg-white/5 rounded-full blur-lg"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          <Link
            href={`/buildings/${buildingId}/setup`}
            className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="h-5 w-5 text-[#4f46e5] mr-3" />
            <span className="text-gray-700">Building Setup</span>
          </Link>
          <Link
            href={`/buildings/${buildingId}/compliance`}
            className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Shield className="h-5 w-5 text-[#4f46e5] mr-3" />
            <span className="text-gray-700">Compliance</span>
          </Link>
          <Link
            href={`/buildings/${buildingId}/compliance/setup`}
            className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Sparkles className="h-5 w-5 text-green-600 mr-3" />
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