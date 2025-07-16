import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingAmendments from '@/components/BuildingAmendments'
import { Tables } from '@/lib/database.types'

export default async function BuildingAmendmentsPage({ 
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

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Building Amendments</h1>
            <p className="text-gray-600">{building.name}</p>
          </div>
        </div>
        
        <BuildingAmendments buildingId={parseInt(buildingId)} />
      </div>
    </LayoutWithSidebar>
  )
} 