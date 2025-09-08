import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import DashboardSidebar from '@/components/DashboardSidebar'
import MobileNavigation from '@/components/MobileNavigation'
import { NavigationProvider } from '@/components/NavigationContext'
import { AgencyProvider } from '@/hooks/useAgency'
import { LeaseNotificationProvider } from '@/contexts/LeaseNotificationContext'
import { ToastProvider } from '@/components/ToastNotifications'
import ErrorBoundary from '@/components/ErrorBoundary'
import { createClient } from '@/lib/supabase/server'

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({ 
  children 
}: DashboardLayoutProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if user is not authenticated
  if (!user) {
    redirect('/login')
  }

  return (
    <ErrorBoundary>
      <NavigationProvider>
        <AgencyProvider>
          <ToastProvider>
            <LeaseNotificationProvider>
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <div className="flex flex-1 overflow-hidden">
              {/* Desktop Sidebar */}
              <div className="hidden lg:block">
                <DashboardSidebar />
              </div>
              
              {/* Mobile Navigation */}
              <MobileNavigation />
              
              <main className="flex-1 overflow-y-auto">
                {/* Main Content */}
                <div className="p-6 lg:p-8">
                  <div className="w-full max-w-7xl mx-auto">
                    {/* Mobile Breadcrumb Navigation */}
                    <div className="lg:hidden mb-6">
                      <nav className="flex items-center space-x-2 text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                        <a href="/home" className="hover:text-[#4f46e5] transition-colors font-medium">Home</a>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-900 font-semibold">Current Page</span>
                      </nav>
                    </div>
                    {/* Add top margin for mobile navigation bar */}
                    <div className="lg:hidden h-20"></div>
                    {children}
                  </div>
                </div>
              </main>
            </div>
          </div>
            </LeaseNotificationProvider>
          </ToastProvider>
        </AgencyProvider>
      </NavigationProvider>
    </ErrorBoundary>
  )
} 