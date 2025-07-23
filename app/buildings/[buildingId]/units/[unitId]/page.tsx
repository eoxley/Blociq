import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import UnitDetailClient from './UnitDetailClient'
import { Tables } from '@/lib/database.types'

type Unit = Tables<'units'> & {
  leaseholders: Tables<'leaseholders'>[]
  occupiers: Tables<'occupiers'>[]
}

export default async function UnitDetailPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string; unitId: string }> 
}) {
  const { buildingId, unitId } = await params
  
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
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

  // Fetch unit data with leaseholders and occupiers
  const { data: unit, error: unitError } = await supabase
    .from('units')
    .select(`
      *,
      leaseholders (
        id,
        name,
        email,
        phone
      ),
      occupiers (
        id,
        full_name,
        email,
        phone,
        start_date,
        end_date,
        rent_amount,
        rent_frequency,
        status,
        notes,
        created_at
      )
    `)
    .eq('id', unitId)
    .single()

  if (unitError || !unit) {
    console.error('Unit not found:', unitError)
    redirect(`/buildings/${buildingId}/units`)
  }

  return (
    <LayoutWithSidebar>
      <UnitDetailClient 
        building={building}
        unit={unit}
      />
    </LayoutWithSidebar>
  )
} 