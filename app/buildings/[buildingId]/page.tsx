import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingCommandCentre from './BuildingCommandCentre'
import ErrorBoundary from '@/components/ErrorBoundary'

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

    // Try to fetch building by ID - handle both integer and UUID
    let building = null
    let buildingError = null

    // First, try as integer ID
    if (/^\d+$/.test(buildingId)) {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', parseInt(buildingId))
        .single()
      
      building = data
      buildingError = error
    } else {
      // If not an integer, try as UUID (in case there's a UUID column)
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', buildingId)
        .single()
      
      building = data
      buildingError = error
    }

    if (buildingError) {
      console.error('❌ Error fetching building:', buildingError)
      redirect('/buildings')
    }

    if (!building) {
      console.error('❌ Building not found:', buildingId)
      redirect('/buildings')
    }

    console.log('✅ Building found:', building.name)

    // Initialize empty data structures to prevent undefined errors
    const buildingData: any = {
      building: building || {},
      buildingSetup: {},
      complianceSummary: { total: 0, compliant: 0, dueSoon: 0, overdue: 0 },
      complianceAssets: [],
      units: [],
      recentEmails: [],
      complianceDocs: [],
      buildingDocs: [],
      events: [],
      todos: []
    }

    // Try to fetch additional data with individual error handling
    try {
      const { data: buildingSetup } = await supabase
        .from('building_setup')
        .select('*')
        .eq('building_id', building.id)
        .single()
      
      if (buildingSetup) {
        buildingData.buildingSetup = buildingSetup
      }
    } catch (error) {
      console.warn('⚠️ Error fetching building setup:', error)
    }

    try {
      const { data: complianceAssets } = await supabase
        .from('building_compliance_assets')
        .select(`
          *,
          compliance_assets (
            name,
            category
          )
        `)
        .eq('building_id', building.id)

      if (complianceAssets) {
        buildingData.complianceAssets = complianceAssets
        
        // Calculate compliance summary
        const now = new Date()
        buildingData.complianceSummary = {
          total: complianceAssets.length,
          compliant: complianceAssets.filter(asset => asset?.status === 'compliant').length,
          dueSoon: complianceAssets.filter(asset => {
            if (!asset?.next_due_date) return false
            try {
              const dueDate = new Date(asset.next_due_date)
              const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              return daysUntilDue <= 30 && daysUntilDue > 0
            } catch (error) {
              return false
            }
          }).length,
          overdue: complianceAssets.filter(asset => {
            if (!asset?.next_due_date) return false
            try {
              const dueDate = new Date(asset.next_due_date)
              return dueDate < now
            } catch (error) {
              return false
            }
          }).length
        }
      }
    } catch (error) {
      console.warn('⚠️ Error fetching compliance assets:', error)
    }

    try {
      const { data: units } = await supabase
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
        .eq('building_id', building.id)
        .order('unit_number')

      if (units) {
        buildingData.units = units
      }
    } catch (error) {
      console.warn('⚠️ Error fetching units:', error)
    }

    try {
      const { data: recentEmails } = await supabase
        .from('incoming_emails')
        .select('*')
        .eq('building_id', building.id)
        .order('received_at', { ascending: false })
        .limit(5)

      if (recentEmails) {
        buildingData.recentEmails = recentEmails
      }
    } catch (error) {
      console.warn('⚠️ Error fetching recent emails:', error)
    }

    try {
      const { data: complianceDocs } = await supabase
        .from('compliance_docs')
        .select('*')
        .eq('building_id', building.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (complianceDocs) {
        buildingData.complianceDocs = complianceDocs
      }
    } catch (error) {
      console.warn('⚠️ Error fetching compliance docs:', error)
    }

    try {
      const { data: buildingDocs } = await supabase
        .from('building_documents')
        .select('*')
        .eq('building_id', building.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (buildingDocs) {
        buildingData.buildingDocs = buildingDocs
      }
    } catch (error) {
      console.warn('⚠️ Error fetching building docs:', error)
    }

    try {
      const { data: events } = await supabase
        .from('property_events')
        .select('*')
        .eq('building_id', building.id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5)

      if (events) {
        buildingData.events = events
      }
    } catch (error) {
      console.warn('⚠️ Error fetching events:', error)
    }

    try {
      const { data: todos } = await supabase
        .from('building_todos')
        .select('*')
        .eq('building_id', building.id)
        .order('due_date', { ascending: true })
        .limit(10)

      if (todos) {
        buildingData.todos = todos
      }
    } catch (error) {
      console.warn('⚠️ Error fetching todos:', error)
    }

    console.log('✅ Building data prepared successfully')

    return (
      <ErrorBoundary>
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
      </ErrorBoundary>
    )
  } catch (error) {
    console.error('❌ Unexpected error in building detail page:', error)
    redirect('/buildings')
  }
} 