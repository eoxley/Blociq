import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BuildingCommunicationsClient from './components/BuildingCommunicationsClient'

interface BuildingCommunicationsPageProps {
  params: {
    id: string
  }
}

export default async function BuildingCommunicationsPage({ params }: BuildingCommunicationsPageProps) {
  const supabase = createClient()

  // Get building information
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', params.id)
    .single()

  if (buildingError || !building) {
    notFound()
  }

  return <BuildingCommunicationsClient building={building} />
}