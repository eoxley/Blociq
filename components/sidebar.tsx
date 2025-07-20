'use client'

import React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, usePathname } from 'next/navigation'
import {
  Home,
  Inbox,
  Building2,
  MessageSquare,
  LogOut,
  Wrench,
  Clock,
  ChevronRight,
  FileText,
  Brain,
} from 'lucide-react'

export default function Sidebar() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Navigation items pointing to correct routes (no dashboard)
  const navigationItems = [
    { href: '/home', icon: Home, label: 'Home' },
    { href: '/inbox', icon: Inbox, label: 'Inbox' },
    { href: '/buildings', icon: Building2, label: 'Buildings' },
    { href: '/communications', icon: MessageSquare, label: 'Communications' },
    { href: '/ai-documents', icon: Brain, label: 'AI Documents' },
    { href: '/major-works', icon: Wrench, label: 'Major Works' },
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
          const isActive = pathname === item.href || (pathname && pathname.startsWith(item.href + '/'))
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive 
                  ? 'bg-white/20 text-white font-semibold' 
                  : 'hover:bg-white/10 text-white/90 hover:text-white'
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform ${
                isActive ? 'scale-110' : 'group-hover:scale-110'
              }`} />
              <span>{item.label}</span>
            </a>
          )
        })}

        {/* Coming Soon Section */}
        <div className="pt-4 border-t border-white/20 mt-4">
          <div className="px-4 py-2">
            <p className="text-xs text-white/75 mb-2">Coming Soon</p>
          </div>
          {/* Finances Parent */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium opacity-60 cursor-not-allowed">
            <span className="text-lg font-bold">£</span>
            <span>Finances</span>
            <Clock className="h-3 w-3 ml-auto" />
          </div>
          {/* Finances Subitems */}
          <div className="ml-8 space-y-1">
            <a
              href="/finances/service-charges"
              className="flex items-center gap-2 px-2 py-1 rounded text-xs opacity-60 cursor-not-allowed"
              tabIndex={-1}
              aria-disabled="true"
            >
              <ChevronRight className="h-3 w-3" /> Service Charges
            </a>
            <a
              href="/finances/budgeting"
              className="flex items-center gap-2 px-2 py-1 rounded text-xs opacity-60 cursor-not-allowed"
              tabIndex={-1}
              aria-disabled="true"
            >
              <ChevronRight className="h-3 w-3" /> Budgeting
            </a>
            <a
              href="/finances/accounts"
              className="flex items-center gap-2 px-2 py-1 rounded text-xs opacity-60 cursor-not-allowed"
              tabIndex={-1}
              aria-disabled="true"
            >
              <ChevronRight className="h-3 w-3" /> Accounts
            </a>
          </div>
        </div>
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
