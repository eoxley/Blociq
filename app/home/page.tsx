import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import HomePageClient from './HomePageClient'

export default async function HomePage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  // Get user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', session.user.id)
    .single()

  const userData = {
    name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Property Manager',
    email: session.user.email || ''
  }

  return (
    <LayoutWithSidebar>
      <HomePageClient userData={userData} />
    </LayoutWithSidebar>
  )
}
