import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AlertTriangle, Home } from 'lucide-react'
import LeaseholderInfoClient from './LeaseholderInfoClient'

interface UnitDetailPageProps {
  params: Promise<{ buildingId: string; unitId: string }>
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
  full_name: string | null
  email: string | null
  phone_number: string | null
  correspondence_address?: string | null
  is_director: boolean | null
}

interface Building {
  id: string
  name: string
  address: string | null
}

interface Document {
  id: string
  file_name: string
  file_url: string
  type: string | null
  created_at: string
}

interface Email {
  id: string
  subject: string | null
  from_email: string
  body_preview: string | null
  received_at: string
}

interface Lease {
  id: string
  building_id: number
  unit_id: number | null
  start_date: string | null
  expiry_date: string | null
  doc_type: string | null
  is_headlease: boolean | null
  doc_url: string | null
  created_at: string | null
}

export default async function UnitDetailPage({ params }: UnitDetailPageProps) {
  const { buildingId, unitId } = await params
  const supabase = createClient(cookies())

  try {
    console.log('🔍 UnitDetailPage - Starting with params:', { buildingId, unitId })

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.log('❌ No session found, redirecting to login')
      redirect('/login')
    }

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(buildingId) || !uuidRegex.test(unitId)) {
      console.error('❌ Invalid UUID format:', { buildingId, unitId })
      notFound()
    }

    // First, let's check if the unit exists at all
    const { data: unitExists, error: unitExistsError } = await supabase
      .from('units')
      .select('id')
      .eq('id', unitId)
      .single()

    if (unitExistsError) {
      console.error('❌ Unit existence check failed:', unitExistsError)
      if (unitExistsError.code === 'PGRST116') {
        console.log('❌ Unit not found in database')
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md mx-auto text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unit Not Found</h2>
              <p className="text-gray-600 mb-4">
                The unit you're looking for doesn't exist in our database.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Unit ID: {unitId}
              </p>
              <a 
                href={`/buildings/${buildingId}`}
                className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity inline-block"
              >
                Back to Building
              </a>
            </div>
          </div>
        )
      }
    }

    console.log('✅ Unit exists in database')

    // Fetch building data
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, address')
      .eq('id', buildingId)
      .single()

    if (buildingError || !building) {
      console.error('❌ Building not found:', buildingError)
      notFound()
    }

    console.log('✅ Building found:', building.name)

    // Fetch unit data with leaseholder information
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select(`
        id,
        unit_number,
        type,
        floor,
        building_id,
        leaseholder_id,
        created_at
      `)
      .eq('id', unitId)
      .single()

    if (unitError) {
      console.error('❌ Unit query error:', unitError)
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Unit</h2>
            <p className="text-gray-600 mb-4">
              {unitError.message || 'Failed to load unit data'}
            </p>
            <a 
              href={`/buildings/${buildingId}`}
              className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity inline-block"
            >
              Back to Building
            </a>
          </div>
        </div>
      )
    }

    if (!unit) {
      console.error('❌ Unit not found after query')
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unit Not Found</h2>
            <p className="text-gray-600 mb-4">
              The unit you're looking for doesn't exist.
            </p>
            <a 
              href={`/buildings/${buildingId}`}
              className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity inline-block"
            >
              Back to Building
            </a>
          </div>
        </div>
      )
    }

    // Verify unit belongs to the correct building
    if (unit.building_id !== buildingId) {
      console.error('❌ Unit does not belong to building:', { unitBuildingId: unit.building_id, requestedBuildingId: buildingId })
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Unit</h2>
            <p className="text-gray-600 mb-4">
              This unit does not belong to the specified building.
            </p>
            <a 
              href={`/buildings/${buildingId}`}
              className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity inline-block"
            >
              Back to Building
            </a>
          </div>
        </div>
      )
    }

    console.log('✅ Unit belongs to correct building')

    // Fetch all leaseholders for this unit (supporting multiple leaseholders per unit)
    const { data: leaseholdersData = [], error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select('id, full_name, email, phone_number, is_director, correspondence_address')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: true })
    
    const leaseholders = leaseholdersData || []
    if (leaseholdersError) {
      console.error('⚠️ Error fetching leaseholders:', leaseholdersError)
    } else {
      console.log('✅ Leaseholders found:', leaseholders.length)
    }

    // For backward compatibility, keep the primary leaseholder (first one or the one with leaseholder_id)
    let leaseholder: Leaseholder | null = null
    if (leaseholders.length > 0) {
      // If there's a specific leaseholder_id, find that one, otherwise use the first
      if (unit.leaseholder_id) {
        leaseholder = leaseholders.find(l => l.id === unit.leaseholder_id) || leaseholders[0]
      } else {
        leaseholder = leaseholders[0]
      }
      console.log('✅ Primary leaseholder:', leaseholder.full_name)
    } else {
      console.log('ℹ️ No leaseholders assigned to this unit')
    }

    // Fetch linked documents for this unit
    const { data: documentsData = [], error: documentsError } = await supabase
      .from('building_documents')
      .select('id, file_name, file_url, type, created_at')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })

    const documents = documentsData || []
    if (documentsError) {
      console.error('⚠️ Error fetching documents:', documentsError)
    } else {
      console.log('✅ Documents found:', documents.length)
    }

    // Fetch lease information for this unit
    let leases: Lease[] = []
    const { data: leasesData = [], error: leasesError } = await supabase
      .from('leases')
      .select('id, building_id, unit_id, start_date, expiry_date, doc_type, is_headlease, doc_url, created_at')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })

    if (leasesError) {
      console.error('⚠️ Error fetching leases:', leasesError)
    } else {
      leases = leasesData || []
      console.log('✅ Leases found:', leases.length)
    }

    // Fetch correspondence emails for leaseholder
    let emails: Email[] = []
    if (leaseholder?.email) {
      const { data: emailsData = [], error: emailsError } = await supabase
        .from('incoming_emails')
        .select('id, subject, from_email, body_preview, received_at')
        .eq('to_email', leaseholder.email)
        .order('received_at', { ascending: false })
        .limit(10)

      if (emailsError) {
        console.error('⚠️ Error fetching emails:', emailsError)
      } else {
        emails = emailsData || []
        console.log('✅ Emails found:', emails.length)
      }
    }

    console.log('✅ All data fetched successfully, rendering component')

    return (
      <LeaseholderInfoClient
        building={building}
        unit={unit as any}
        leaseholder={leaseholder}
        leaseholders={leaseholders}
        documents={documents}
        emails={emails}
        leases={leases}
      />
    )

  } catch (error) {
    console.error('❌ Error in UnitDetailPage:', error)
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error loading unit</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <a 
            href={`/buildings/${buildingId}`}
            className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity inline-block"
          >
            Back to Building
          </a>
        </div>
      </div>
    )
  }
} 