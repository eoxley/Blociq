import { ReactNode } from 'react'
import DashboardSidebar from '@/components/DashboardSidebar'
import MobileNavigation from '@/components/MobileNavigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import BlocIQLogo from '@/components/BlocIQLogo'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <DashboardSidebar />
      </div>
      
      {/* Mobile Navigation */}
      <MobileNavigation />
      
      <main className="flex-1 overflow-y-auto">
        {/* Enhanced Gradient Header Banner */}
        <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-6 py-4 shadow-lg relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                <BlocIQLogo className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">BlocIQ Dashboard</h1>
                <p className="text-white/80 text-sm">Property Intelligence Platform</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* User Info */}
              {user && (
                <div className="hidden md:flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-white">
                      {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-white/70 text-xs">
                      {user.email}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Status Indicator */}
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1 backdrop-blur-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-white">Online</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
} 