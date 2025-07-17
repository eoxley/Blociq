'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ArrowLeft } from 'lucide-react'

export default function GlobalNavigation() {
  const pathname = usePathname()
  
  // Don't show on homepage or login page
  if (pathname === '/' || pathname === '/login' || pathname === '/home') {
    return null
  }

  return (
    <div className="fixed top-4 left-4 z-50">
      <Link
        href="/home"
        className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">Back to Homepage</span>
        <span className="sm:hidden">Home</span>
      </Link>
    </div>
  )
} 