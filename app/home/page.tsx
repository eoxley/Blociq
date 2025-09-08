import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomePageClient from './HomePageClient'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const userData = {
    name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Property Manager',
    email: user.email || ''
  }

  return (
    <LayoutWithSidebar>
      <HomePageClient userData={userData} />
    </LayoutWithSidebar>
  )
}
