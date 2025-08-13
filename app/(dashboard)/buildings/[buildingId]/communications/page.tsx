import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Shield, Mail, Phone, FileText, Building2 } from 'lucide-react'
import Link from 'next/link'

interface BuildingCommunicationsPageProps {
  params: {
    buildingId: string
  }
}

interface Building {
  id: string
  name: string
  address: string | null
  unit_count: number | null
}

interface Unit {
  id: string
  unit_number: string
  type: string | null
  floor: string | null
  leaseholder_id: string | null
}

interface Leaseholder {
  id: string
  full_name: string
  email: string | null
  phone_number: string | null
}

export default async function BuildingCommunicationsPage({ params }: BuildingCommunicationsPageProps) {
  const supabase = createClient(cookies())
  
  try {
    // Check authentication first
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    // Validate building ID format
    if (!params.buildingId || typeof params.buildingId !== 'string') {
      console.error('Invalid building ID:', params.buildingId)
      notFound()
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.buildingId)) {
      console.error('Invalid UUID format for building ID:', params.buildingId)
      notFound()
    }

    // Fetch building with all required fields
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', params.buildingId)
      .maybeSingle()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      throw new Error('Failed to fetch building data')
    }

    if (!building) {
      console.error('Building not found:', params.buildingId)
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Building Not Found</h2>
            <p className="text-gray-600 mb-4">We couldn't find the building you're looking for.</p>
            <a 
              href="/buildings"
              className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity inline-block"
            >
              Back to Buildings
            </a>
          </div>
        </div>
      )
    }

    // Fetch units with leaseholder information
    const { data: units = [], error: unitsError } = await supabase
      .from('units')
      .select(`
        id, 
        unit_number, 
        type, 
        floor, 
        building_id, 
        leaseholder_id,
        leaseholders (
          id,
          full_name,
          email,
          phone_number
        )
      `)
      .eq('building_id', params.buildingId)
      .order('unit_number')

    if (unitsError) {
      console.error('Error fetching units:', unitsError)
    }

    // Count leaseholders with contact information
    const leaseholdersWithContact = units.filter(unit => 
      unit.leaseholders && (unit.leaseholders.email || unit.leaseholders.phone_number)
    ).length

    return (
      <div className="min-h-screen bg-gray-50">
        {/* TOP: Building Header with BlocIQ Gradient */}
        <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Mail className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">Building Communications</h1>
                  </div>
                  <div className="flex items-center gap-4 text-white/80 text-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{building.name || 'Unnamed Building'}</span>
                    </div>
                    <span>•</span>
                    <span>{building.address || 'No address provided'}</span>
                    <span>•</span>
                    <span>{units?.length || 0} unit{(units?.length || 0) !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  href={`/buildings/${params.buildingId}`}
                  className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
                >
                  Back to Building
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Communication Actions */}
            <div className="space-y-6">
              
              {/* Communication Overview */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Communication Overview</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{units?.length || 0}</div>
                    <div className="text-sm text-blue-600">Total Units</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{leaseholdersWithContact}</div>
                    <div className="text-sm text-green-600">With Contact Info</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    href={`/buildings/${params.buildingId}/communications/email-all`}
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Mail className="h-5 w-5 text-[#008C8F] mr-3" />
                    <span className="text-gray-700">Email All Leaseholders</span>
                  </Link>
                  <Link
                    href={`/buildings/${params.buildingId}/communications/letter-all`}
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FileText className="h-5 w-5 text-[#008C8F] mr-3" />
                    <span className="text-gray-700">Send Letter to All</span>
                  </Link>
                  <Link
                    href={`/buildings/${params.buildingId}/communications/notices`}
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Shield className="h-5 w-5 text-[#008C8F] mr-3" />
                    <span className="text-gray-700">Building Notices</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column - Unit List & Contact Info */}
            <div className="space-y-6">
              
              {/* Units with Contact Information */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Units & Contact Information</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {units.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No units found for this building</p>
                  ) : (
                    units.map((unit) => (
                      <div key={unit.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">Unit {unit.unit_number}</h4>
                          <div className="flex gap-2">
                            {unit.leaseholders?.email && (
                              <Mail className="h-4 w-4 text-green-500" title="Has email" />
                            )}
                            {unit.leaseholders?.phone_number && (
                              <Phone className="h-4 w-4 text-blue-500" title="Has phone" />
                            )}
                          </div>
                        </div>
                        {unit.floor && (
                          <p className="text-sm text-gray-600">Floor {unit.floor}</p>
                        )}
                        {unit.type && (
                          <p className="text-sm text-gray-600">{unit.type}</p>
                        )}
                        {unit.leaseholders ? (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-900">
                              {unit.leaseholders.full_name}
                            </p>
                            {unit.leaseholders.email && (
                              <p className="text-xs text-gray-600">{unit.leaseholders.email}</p>
                            )}
                            {unit.leaseholders.phone_number && (
                              <p className="text-xs text-gray-600">{unit.leaseholders.phone_number}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No leaseholder assigned</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Communication Templates */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Communication Templates</h3>
                <div className="space-y-3">
                  <Link
                    href="/communications/templates"
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FileText className="h-5 w-5 text-[#008C8F] mr-3" />
                    <span className="text-gray-700">Manage Templates</span>
                  </Link>
                  <Link
                    href="/communications"
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Mail className="h-5 w-5 text-[#008C8F] mr-3" />
                    <span className="text-gray-700">Global Communications</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )

  } catch (error) {
    console.error('❌ Error in BuildingCommunicationsPage:', error)
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error loading communications</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <a 
            href="/buildings"
            className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity inline-block"
          >
            Back to Buildings
          </a>
        </div>
      </div>
    )
  }
}
