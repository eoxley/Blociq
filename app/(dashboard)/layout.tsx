import { ReactNode } from 'react'
import DashboardSidebar from '@/components/DashboardSidebar'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA]">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
} 