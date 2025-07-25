'use client'

import DashboardSidebar from './DashboardSidebar'
import { ReactNode } from 'react'

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
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6">
        {children}
      </main>
    </div>
  )
}
