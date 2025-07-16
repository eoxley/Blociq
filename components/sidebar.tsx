'use client'

import React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import {
  Home,
  Inbox,
  Building2,
  MessageSquare,
  LogOut,
  Wrench,
  DollarSign,
  FileText,
  Calendar,
  Clock,
  ChevronRight,
} from 'lucide-react'

export default function Sidebar() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Live navigation
  const navigationItems = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/dashboard/inbox', icon: Inbox, label: 'Inbox' },
    { href: '/dashboard/buildings', icon: Building2, label: 'Buildings' },
    { href: '/dashboard/communications', icon: MessageSquare, label: 'Communications' },
  ]

  // Coming soon navigation
  const comingSoonItems = [
    { href: '/dashboard/major-works', icon: Wrench, label: 'Major Works' },
    {
      label: 'Finances',
      icon: DollarSign,
      children: [
        { href: '/dashboard/finances/service-charges', label: 'Service Charges' },
        { href: '/dashboard/finances/budgeting', label: 'Budgeting' },
        { href: '/dashboard/finances/accounts', label: 'Accounts' },
      ],
    },
  ]

  return (
    <aside className="min-h-screen w-64 bg-gradient-to-b from-teal-700 to-teal-800 text-white flex flex-col py-6 px-4 shadow-xl">
      {/* Logo Section */}
      <div className="mb-8 px-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif">BlocIQ</h1>
            <p className="text-xs text-teal-200 opacity-75">Property Intelligence</p>
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

        {/* Coming Soon Section */}
        <div className="pt-4 border-t border-teal-600 mt-4">
          <div className="px-4 py-2">
            <p className="text-xs text-teal-200 opacity-75 mb-2">Coming Soon</p>
          </div>
          {/* Major Works */}
          <a
            href="/dashboard/major-works"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium opacity-60 cursor-not-allowed"
            tabIndex={-1}
            aria-disabled="true"
          >
            <Wrench className="h-5 w-5" />
            <span>Major Works</span>
            <Clock className="h-3 w-3 ml-auto" />
          </a>
          {/* Finances Parent */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium opacity-60 cursor-not-allowed">
            <DollarSign className="h-5 w-5" />
            <span>Finances</span>
            <Clock className="h-3 w-3 ml-auto" />
          </div>
          {/* Finances Subitems */}
          <div className="ml-8 space-y-1">
            <a
              href="/dashboard/finances/service-charges"
              className="flex items-center gap-2 px-2 py-1 rounded text-xs opacity-60 cursor-not-allowed"
              tabIndex={-1}
              aria-disabled="true"
            >
              <ChevronRight className="h-3 w-3" /> Service Charges
            </a>
            <a
              href="/dashboard/finances/budgeting"
              className="flex items-center gap-2 px-2 py-1 rounded text-xs opacity-60 cursor-not-allowed"
              tabIndex={-1}
              aria-disabled="true"
            >
              <ChevronRight className="h-3 w-3" /> Budgeting
            </a>
            <a
              href="/dashboard/finances/accounts"
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
      <div className="border-t border-teal-600 pt-4 mt-6">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-all duration-200 w-full text-left group"
        >
          <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
