import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomePageClient from './HomePageClient'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if user is not authenticated
  if (!user) {
    redirect('/login')
  }

  // For testing - bypass authentication temporarily
  const userData = {
    name: 'Test User',
    email: 'test@example.com'
  }

  return <HomePageClient userData={userData} />
}
