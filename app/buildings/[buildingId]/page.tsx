import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingCommandCentre from './BuildingCommandCentre'

export default async function BuildingDetailPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  try {
    const { buildingId } = await params
    const supabase = createServerComponentClient({ cookies })
    
    // Secure the route using Supabase Auth
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      redirect('/login')
    }

    // Validate buildingId
    if (!buildingId) {
      console.error('No building ID provided')
      redirect('/buildings')
    }

    console.log('🔍 Fetching building details for ID:', buildingId)

    // Fetch building data
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single()

    if (buildingError) {
      console.error('❌ Error fetching building:', buildingError)
      redirect('/buildings')
    }

    if (!building) {
      console.error('❌ Building not found:', buildingId)
      redirect('/buildings')
    }

    console.log('✅ Building found:', building.name)

    // Fetch building setup data with error handling
    const { data: buildingSetup, error: setupError } = await supabase
      .from('building_setup')
      .select('*')
      .eq('building_id', buildingId)
      .single()

    if (setupError && setupError.code !== 'PGRST116') {
      console.warn('⚠️ Error fetching building setup:', setupError)
    }

    // Fetch compliance summary with error handling
    const { data: complianceAssets, error: complianceError } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets (
          name,
          category
        )
      `)
      .eq('building_id', buildingId)

    if (complianceError) {
      console.warn('⚠️ Error fetching compliance assets:', complianceError)
    }

    // Fetch units and leaseholders with lease information
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select(`
        *,
        leaseholders (
          id,
          name,
          email,
          phone
        ),
        leases (
          id,
          start_date,
          expiry_date,
          doc_type,
          is_headlease
        )
      `)
      .eq('building_id', buildingId)
      .order('unit_number')

    if (unitsError) {
      console.warn('⚠️ Error fetching units:', unitsError)
    }

    // Fetch recent emails with error handling
    const { data: recentEmails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('building_id', buildingId)
      .order('received_at', { ascending: false })
      .limit(5)

    if (emailsError) {
      console.warn('⚠️ Error fetching recent emails:', emailsError)
    }

    // Fetch compliance documents with error handling
    const { data: complianceDocs, error: complianceDocsError } = await supabase
      .from('compliance_docs')
      .select('*')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (complianceDocsError) {
      console.warn('⚠️ Error fetching compliance docs:', complianceDocsError)
    }

    // Fetch building documents with error handling
    const { data: buildingDocs, error: buildingDocsError } = await supabase
      .from('building_documents')
      .select('*')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (buildingDocsError) {
      console.warn('⚠️ Error fetching building docs:', buildingDocsError)
    }

    // Fetch property events with error handling
    const { data: events, error: eventsError } = await supabase
      .from('property_events')
      .select('*')
      .eq('building_id', buildingId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5)

    if (eventsError) {
      console.warn('⚠️ Error fetching events:', eventsError)
    }

    // Fetch building todos with error handling
    const { data: todos, error: todosError } = await supabase
      .from('building_todos')
      .select('*')
      .eq('building_id', buildingId)
      .order('due_date', { ascending: true })
      .limit(10)

    if (todosError) {
      console.warn('⚠️ Error fetching todos:', todosError)
    }

    // Calculate compliance summary with safe defaults
    const now = new Date()
    const complianceSummary = {
      total: complianceAssets?.length || 0,
      compliant: complianceAssets?.filter(asset => asset?.status === 'compliant').length || 0,
      dueSoon: complianceAssets?.filter(asset => {
        if (!asset?.next_due_date) return false
        try {
          const dueDate = new Date(asset.next_due_date)
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return daysUntilDue <= 30 && daysUntilDue > 0
        } catch (error) {
          console.warn('⚠️ Invalid date format:', asset.next_due_date)
          return false
        }
      }).length || 0,
      overdue: complianceAssets?.filter(asset => {
        if (!asset?.next_due_date) return false
        try {
          const dueDate = new Date(asset.next_due_date)
          return dueDate < now
        } catch (error) {
          console.warn('⚠️ Invalid date format:', asset.next_due_date)
          return false
        }
      }).length || 0
    }

    // Prepare data for the client component with safe defaults
    const buildingData = {
      building: building || {},
      buildingSetup: buildingSetup || {},
      complianceSummary,
      complianceAssets: complianceAssets || [],
      units: units || [],
      recentEmails: recentEmails || [],
      complianceDocs: complianceDocs || [],
      buildingDocs: buildingDocs || [],
      events: events || [],
      todos: todos || []
    }

    console.log('✅ Building data prepared successfully')

    return (
      <LayoutWithSidebar>
        <div className="space-y-6">
          {/* Clean Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {building.name || 'Building Details'}
            </h1>
            {building.address && (
              <p className="text-gray-600 text-lg">{building.address}</p>
            )}
          </div>

          {/* Building Command Centre Component */}
          <BuildingCommandCentre buildingData={buildingData} />
        </div>
      </LayoutWithSidebar>
    )
  } catch (error) {
    console.error('❌ Unexpected error in building detail page:', error)
    redirect('/buildings')
  }
} 