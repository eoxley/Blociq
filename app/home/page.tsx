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

  return (
    <LayoutWithSidebar>
      <HomePageClient />
    </LayoutWithSidebar>
  )
}
