'use client'

import Sidebar from './sidebar'
import { ReactNode } from 'react'

export default function LayoutWithSidebar({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-background p-10">
        {children}
      </main>
    </div>
  )
}
