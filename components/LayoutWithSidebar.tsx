'use client'
import Sidebar from './sidebar'
import { ReactNode } from 'react'

import Sidebar from './sidebar'
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-[#f6fafa] p-10">{children}</main>
    </div>
  )
}
