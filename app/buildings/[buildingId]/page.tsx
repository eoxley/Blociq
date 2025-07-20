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
  const { buildingId } = await params
  const supabase = createServerComponentClient({ cookies })
  
  // Secure the route using Supabase Auth
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch building data
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', buildingId)
    .single()

  if (buildingError || !building) {
    redirect('/buildings')
  }

  // Fetch building setup data
  const { data: buildingSetup } = await supabase
    .from('building_setup')
    .select('*')
    .eq('building_id', buildingId)
    .single()

  // Fetch compliance summary
  const { data: complianceAssets } = await supabase
    .from('building_compliance_assets')
    .select(`
      *,
      compliance_assets (
        name,
        category
      )
    `)
    .eq('building_id', buildingId)

  // Fetch units and leaseholders
  const { data: units } = await supabase
    .from('units')
    .select(`
      *,
      leaseholders (
        id,
        name,
        email,
        phone
      )
    `)
    .eq('building_id', buildingId)
    .order('unit_number')

  // Fetch recent emails
  const { data: recentEmails } = await supabase
    .from('incoming_emails')
    .select('*')
    .eq('building_id', buildingId)
    .order('received_at', { ascending: false })
    .limit(5)

  // Fetch compliance documents
  const { data: complianceDocs } = await supabase
    .from('compliance_docs')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch building documents
  const { data: buildingDocs } = await supabase
    .from('building_documents')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch property events
  const { data: events } = await supabase
    .from('property_events')
    .select('*')
    .eq('building_id', buildingId)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(5)

  // Fetch building todos
  const { data: todos } = await supabase
    .from('building_todos')
    .select('*')
    .eq('building_id', buildingId)
    .order('due_date', { ascending: true })
    .limit(10)

  // Calculate compliance summary
  const now = new Date()
  const complianceSummary = {
    total: complianceAssets?.length || 0,
    compliant: complianceAssets?.filter(asset => asset.status === 'compliant').length || 0,
    dueSoon: complianceAssets?.filter(asset => {
      if (!asset.next_due_date) return false
      const dueDate = new Date(asset.next_due_date)
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilDue <= 30 && daysUntilDue > 0
    }).length || 0,
    overdue: complianceAssets?.filter(asset => {
      if (!asset.next_due_date) return false
      const dueDate = new Date(asset.next_due_date)
      return dueDate < now
    }).length || 0
  }

  // Prepare data for the client component
  const buildingData = {
    building,
    buildingSetup,
    complianceSummary,
    complianceAssets: complianceAssets || [],
    units: units || [],
    recentEmails: recentEmails || [],
    complianceDocs: complianceDocs || [],
    buildingDocs: buildingDocs || [],
    events: events || [],
    todos: todos || []
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Clean Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {building.name}
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
} 