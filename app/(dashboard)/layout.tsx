import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import DashboardSidebar from '@/components/DashboardSidebar'
import MobileNavigation from '@/components/MobileNavigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({ 
  children 
}: DashboardLayoutProps) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if user is not authenticated
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <DashboardSidebar />
      </div>
      
      {/* Mobile Navigation */}
      <MobileNavigation />
      
      <main className="flex-1 overflow-y-auto">
        {/* Main Content */}
        <div className="p-4 lg:p-6">
          <div className="w-full max-w-[1800px] mx-auto px-4 lg:px-6 xl:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
} 