'use client'

import DashboardSidebar from './DashboardSidebar'
import { ReactNode } from 'react'

export default function LayoutWithSidebar({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6">
        {children}
      </main>
    </div>
  )
}
