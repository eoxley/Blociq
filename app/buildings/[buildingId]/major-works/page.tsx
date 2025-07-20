import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import MajorWorksClient from './MajorWorksClient'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function MajorWorksPage({ 
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
    redirect('/buildings')
  }

  // Fetch major works data (placeholder - would come from major_works table)
  const majorWorks: Array<{
    id: string
    title: string
    description: string
    status: 'Planning' | 'Consultation' | 'Delivery' | 'Complete'
    start_date: string
    end_date: string
    s20_notice_date: string
    contractor: string
    s20_required: boolean
    s20_completed: boolean
  }> = [
    {
      id: '1',
      title: 'Roof Replacement',
      description: 'Complete replacement of the building roof including insulation and waterproofing',
      status: 'Planning' as const,
      start_date: '2025-03-01',
      end_date: '2025-06-30',
      s20_notice_date: '2025-01-15',
      contractor: 'ABC Roofing Ltd',
      s20_required: true,
      s20_completed: false
    },
    {
      id: '2',
      title: 'Lift Modernisation',
      description: 'Upgrade of both passenger lifts with new control systems and safety features',
      status: 'Consultation' as const,
      start_date: '2025-04-15',
      end_date: '2025-08-15',
      s20_notice_date: '2025-02-20',
      contractor: 'LiftTech Solutions',
      s20_required: true,
      s20_completed: true
    },
    {
      id: '3',
      title: 'Fire Safety System Upgrade',
      description: 'Installation of new fire alarms, sprinklers, and emergency lighting',
      status: 'Delivery' as const,
      start_date: '2025-01-10',
      end_date: '2025-03-31',
      s20_notice_date: '2024-11-15',
      contractor: 'FireSafe Systems',
      s20_required: true,
      s20_completed: true
    }
  ]

  return (
    <LayoutWithSidebar>
      <MajorWorksClient 
        building={building}
        majorWorks={majorWorks}
      />
    </LayoutWithSidebar>
  )
} 