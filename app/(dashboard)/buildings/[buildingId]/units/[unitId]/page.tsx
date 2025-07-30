import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
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
  leaseholders?: {
    id: string
    name: string | null
    email: string | null
    phone: string | null
  } | null
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
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(buildingId) || !uuidRegex.test(unitId)) {
      console.error('Invalid UUID format')
      notFound()
    }

    // Fetch building data
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, address')
      .eq('id', buildingId)
      .single()

    if (buildingError || !building) {
      console.error('Building not found:', buildingError)
      notFound()
    }

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
        created_at,
        leaseholders (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('id', unitId)
      .single()

    if (unitError || !unit) {
      console.error('Unit not found:', unitError)
      notFound()
    }

    // Fetch linked documents for this unit
    const { data: documents = [], error: documentsError } = await supabase
      .from('building_documents')
      .select('id, file_name, file_url, type, created_at')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
    }

    // Fetch lease information for this unit
    let leases: Lease[] = []
    const { data: leasesData = [], error: leasesError } = await supabase
      .from('leases')
      .select('id, building_id, unit_id, start_date, expiry_date, doc_type, is_headlease, doc_url, created_at')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })

    if (leasesError) {
      console.error('Error fetching leases:', leasesError)
    } else {
      leases = leasesData
    }

    // Fetch correspondence emails for leaseholder
    let emails: Email[] = []
    if (unit.leaseholders?.email) {
      const { data: emailsData = [], error: emailsError } = await supabase
        .from('incoming_emails')
        .select('id, subject, from_email, body_preview, received_at')
        .eq('to_email', unit.leaseholders.email)
        .order('received_at', { ascending: false })
        .limit(10)

      if (emailsError) {
        console.error('Error fetching emails:', emailsError)
      } else {
        emails = emailsData
      }
    }

    return (
      <LeaseholderInfoClient
        building={building}
        unit={unit}
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