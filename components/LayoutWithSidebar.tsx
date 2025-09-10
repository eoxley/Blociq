'use client'

import DashboardSidebar from './DashboardSidebar'
import { ReactNode } from 'react'
import { LeaseNotificationProvider } from '@/contexts/LeaseNotificationContext'
import { ToastProvider } from '@/components/ToastNotifications'

interface LayoutWithSidebarProps {
  children: ReactNode
  title?: string
  subtitle?: string
  showSearch?: boolean
}

export default function LayoutWithSidebar({ 
  children, 
  title, 
  subtitle, 
  showSearch 
}: LayoutWithSidebarProps) {
  return (
    <ToastProvider>
      <LeaseNotificationProvider>
        <div className="flex h-screen overflow-hidden">
          <DashboardSidebar />
          <main className="flex-1 overflow-y-auto bg-[#FAFAFA]">
            {children}
          </main>
        </div>
      </LeaseNotificationProvider>
    </ToastProvider>
  )
}
