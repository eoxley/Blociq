import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingsClient from './BuildingsClient'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function BuildingsPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch buildings data
  const { data: buildings, error } = await supabase
    .from('buildings')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching buildings:', error)
  }

  return (
    <LayoutWithSidebar>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-[#0F5D5D] mb-6">Buildings</h1>
        <BuildingsClient buildings={buildings || []} />
      </div>
    </LayoutWithSidebar>
  )
} 