import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomePageClient from './HomePageClient'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

export default async function HomePage() {
  // For testing - bypass authentication temporarily
  const userData = {
    name: 'Test User',
    email: 'test@example.com'
  }

  return (
    <LayoutWithSidebar>
      <HomePageClient userData={userData} />
    </LayoutWithSidebar>
  )
}
