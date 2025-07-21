'use client'

import React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
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
  Shield,
} from 'lucide-react'
import BlocIQLogo from './BlocIQLogo'

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
    { href: '/compliance', icon: Shield, label: 'Compliance' },
    { href: '/communications', icon: MessageSquare, label: 'Communications' },
    { href: '/ai-documents', icon: Brain, label: 'AI Documents' },
    { href: '/major-works', icon: Wrench, label: 'Major Works' },
  ]

  return (
    <aside className="min-h-screen w-64 bg-gradient-to-br from-teal-600 via-blue-600 to-purple-600 text-white flex flex-col py-6 px-4 shadow-2xl relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full"></div>
      <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Logo Section */}
        <div className="mb-8 px-4">
          <Link href="/home" className="flex items-center gap-3 mb-2 hover:opacity-80 transition-all duration-300 group">
            <div className="w-16 h-16 bg-gradient-to-br from-white/20 to-white/30 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform duration-300">
              <BlocIQLogo className="h-9 w-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#0d9488] to-[#14b8a6] bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BlocIQ</h1>
              <p className="text-xs text-white/80">Property Intelligence</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-3">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (pathname && pathname.startsWith(item.href + '/'))
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden ${
                  isActive 
                    ? 'bg-gradient-to-r from-white/25 to-white/15 text-white font-semibold shadow-lg backdrop-blur-sm border border-white/20' 
                    : 'hover:bg-white/15 text-white/90 hover:text-white hover:shadow-md backdrop-blur-sm'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-white to-white/50 rounded-r-full"></div>
                )}
                
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-br from-white/30 to-white/20 shadow-lg' 
                    : 'bg-white/10 group-hover:bg-white/20 group-hover:shadow-md'
                }`}>
                  <Icon className={`h-5 w-5 transition-all duration-300 ${
                    isActive ? 'scale-110 text-white' : 'group-hover:scale-110 text-white/90 group-hover:text-white'
                  }`} />
                </div>
                <span className="font-medium">{item.label}</span>
                
                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </a>
            )
          })}

          {/* Coming Soon Section */}
          <div className="pt-6 border-t border-white/20 mt-6">
            <div className="px-4 py-2">
              <p className="text-xs text-white/75 mb-3 font-medium">Coming Soon</p>
            </div>
            
            {/* Finances Parent */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium opacity-60 cursor-not-allowed bg-white/5 backdrop-blur-sm">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-green-300">£</span>
              </div>
              <span>Finances</span>
              <Clock className="h-4 w-4 ml-auto text-white/50" />
            </div>
            
            {/* Finances Subitems */}
            <div className="ml-8 space-y-1 mt-2">
              <a
                href="/finances/service-charges"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs opacity-60 cursor-not-allowed hover:bg-white/5 transition-colors"
                tabIndex={-1}
                aria-disabled="true"
              >
                <ChevronRight className="h-3 w-3 text-white/50" /> 
                <span>Service Charges</span>
              </a>
              <a
                href="/finances/budgeting"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs opacity-60 cursor-not-allowed hover:bg-white/5 transition-colors"
                tabIndex={-1}
                aria-disabled="true"
              >
                <ChevronRight className="h-3 w-3 text-white/50" /> 
                <span>Budgeting</span>
              </a>
              <a
                href="/finances/accounts"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs opacity-60 cursor-not-allowed hover:bg-white/5 transition-colors"
                tabIndex={-1}
                aria-disabled="true"
              >
                <ChevronRight className="h-3 w-3 text-white/50" /> 
                <span>Accounts</span>
              </a>
            </div>
            
            {/* Client Portal */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium opacity-60 cursor-not-allowed bg-white/5 backdrop-blur-sm mt-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg flex items-center justify-center">
                <span className="text-lg">👥</span>
              </div>
              <span>Client Portal</span>
              <Clock className="h-4 w-4 ml-auto text-white/50" />
            </div>
          </div>
        </nav>

        {/* Logout Section */}
        <div className="border-t border-white/20 pt-4 mt-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-all duration-300 w-full text-left group backdrop-blur-sm"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-lg flex items-center justify-center group-hover:from-red-500/30 group-hover:to-red-600/30 transition-all duration-300">
              <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform text-red-200 group-hover:text-red-100" />
            </div>
            <span className="text-white/90 group-hover:text-white">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
