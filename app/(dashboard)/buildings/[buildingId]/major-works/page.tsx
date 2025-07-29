import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import MajorWorksTimeline from './MajorWorksTimeline'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function MajorWorksPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  const { buildingId } = await params
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
    redirect('/buildings')
  }

  return (
    <LayoutWithSidebar>
      <div className="max-w-7xl mx-auto p-6">
        <MajorWorksTimeline 
          buildingId={buildingId}
          buildingName={building.name}
        />
      </div>
    </LayoutWithSidebar>
  )
} 