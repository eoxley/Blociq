import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import ComplianceTrackerClient from './ComplianceTrackerClient'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getActiveComplianceAssets } from '@/lib/complianceUtils'

export default async function ComplianceTrackerPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  const { buildingId } = await params
  
  const supabase = createServerComponentClient({ cookies })
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch building data
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', buildingId)
    .single()

  if (buildingError || !building) {
    console.error('Building not found:', buildingError)
    redirect('/buildings')
  }

  // Fetch compliance assets for this building
  const complianceAssets = await getActiveComplianceAssets(supabase, buildingId)

  return (
    <LayoutWithSidebar>
      <ComplianceTrackerClient 
        building={building} 
        complianceAssets={complianceAssets}
      />
    </LayoutWithSidebar>
  )
} 