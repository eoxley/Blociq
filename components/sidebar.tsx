'use client'

import React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import {
  Home,
  MessageSquare,
  LogOut,
} from 'lucide-react'

export default function Sidebar() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Only Home navigation (no dashboard)
  const navigationItems = [
    { href: '/home', icon: Home, label: 'Home' },
    // Add other non-dashboard routes here if needed
  ]

  return (
    <aside className="min-h-screen w-64 bg-gradient-to-b from-secondary to-secondary/90 text-white flex flex-col py-6 px-4 shadow-xl">
      {/* Logo Section */}
      <div className="mb-8 px-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif">BlocIQ</h1>
            <p className="text-xs text-white/75">Property Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-white/10 transition-all duration-200 group"
            >
              <Icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>

      {/* Logout Section */}
      <div className="border-t border-white/20 pt-4 mt-6">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-error/20 transition-all duration-200 w-full text-left group"
        >
          <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
