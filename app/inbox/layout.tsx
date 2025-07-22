'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Inbox, 
  Building2, 
  MessageSquare, 
  FileText, 
  Settings,
  LogOut
} from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

interface InboxLayoutProps {
  children: React.ReactNode
}

export default function InboxLayout({ children }: InboxLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navigationItems = [
    {
      href: '/inbox',
      icon: Inbox,
      label: 'Inbox',
      tooltip: 'Email Inbox'
    },
    {
      href: '/buildings',
      icon: Building2,
      label: 'Buildings',
      tooltip: 'Property Management'
    },
    {
      href: '/communications',
      icon: MessageSquare,
      label: 'Communications',
      tooltip: 'Communication Tools'
    },
    {
      href: '/documents',
      icon: FileText,
      label: 'Documents',
      tooltip: 'Document Management'
    },
    {
      href: '/account',
      icon: Settings,
      label: 'Settings',
      tooltip: 'Account Settings'
    }
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Icon-only Sidebar */}
      <div className="w-15 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-2">
        {/* Logo */}
        <div className="mb-6">
          <Link href="/home" className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg">
            <span className="text-white font-bold text-sm">B</span>
          </Link>
        </div>

        {/* Navigation Icons */}
        <nav className="flex-1 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (pathname && pathname.startsWith(item.href + '/'))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-teal-100 text-teal-600 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={item.tooltip}
              >
                <Icon className="h-5 w-5" />
                
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  {item.tooltip}
                  <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="group relative flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-red-100 hover:text-red-600 transition-all duration-200"
          title="Sign Out"
        >
          <LogOut className="h-5 w-5" />
          
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
            Sign Out
            <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
          </div>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
} 