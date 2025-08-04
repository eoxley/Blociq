import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import HomePageClient from './HomePageClient'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

export default async function HomePage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
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
