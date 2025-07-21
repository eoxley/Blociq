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
    <aside className="min-h-screen w-64 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white flex flex-col py-6 px-4 shadow-2xl relative border-r border-slate-700/50">
      {/* Extended gradient connection to welcome block */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 opacity-20 blur-xl"></div>
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-blue-500/5 to-purple-500/5"></div>
      <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-teal-500/10 to-blue-500/10 rounded-full blur-sm"></div>
      <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-teal-500/10 rounded-full blur-sm"></div>
      
      <div className="relative z-10 flex flex-col h-full overflow-y-auto scrollbar-thin">
        {/* Logo Section */}
        <div className="mb-6 px-4">
          <Link href="/home" className="flex items-center gap-3 mb-2 hover:opacity-90 transition-all duration-300 group">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg group-hover:scale-105 transition-transform duration-300 border border-teal-400/30">
              <BlocIQLogo className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white drop-shadow-lg">BlocIQ</h1>
              <p className="text-xs text-slate-300 font-medium">Property Intelligence</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 pb-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (pathname && pathname.startsWith(item.href + '/'))
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 group relative overflow-hidden ${
                  isActive 
                    ? 'bg-gradient-to-r from-teal-500/20 to-blue-500/20 text-white font-semibold shadow-lg backdrop-blur-sm border border-teal-500/30' 
                    : 'hover:bg-slate-700/50 text-slate-200 hover:text-white hover:shadow-md backdrop-blur-sm'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-400 to-blue-400 rounded-r-full"></div>
                )}
                
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-br from-teal-500/30 to-blue-500/30 shadow-lg' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50 group-hover:shadow-md'
                }`}>
                  <Icon className={`h-4 w-4 transition-all duration-300 ${
                    isActive ? 'scale-110 text-white' : 'group-hover:scale-110 text-slate-300 group-hover:text-white'
                  }`} />
                </div>
                <span className="font-medium">{item.label}</span>
                
                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </a>
            )
          })}

          {/* Coming Soon Section */}
          <div className="pt-4 border-t border-slate-600/50 mt-4 mb-2">
            <div className="px-3 py-1">
              <p className="text-xs text-slate-300 mb-2 font-medium">Coming Soon</p>
            </div>
            
            {/* Finances Parent */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium opacity-80 cursor-not-allowed bg-slate-700/50 backdrop-blur-sm">
              <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center shadow-lg border border-white/20">
                <span className="text-sm font-bold text-white">£</span>
              </div>
              <span className="text-slate-200">Finances</span>
              <Clock className="h-3 w-3 ml-auto text-slate-400" />
            </div>
            
            {/* Finances Subitems */}
            <div className="ml-6 space-y-0.5 mt-1">
              <a
                href="/finances/service-charge-accounts"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs opacity-80 cursor-not-allowed hover:bg-slate-700/50 transition-colors"
                tabIndex={-1}
                aria-disabled="true"
              >
                <ChevronRight className="h-2 w-2 text-slate-400" /> 
                <span className="text-slate-200">Service Charge Accounts</span>
              </a>
              <a
                href="/finances/service-charge-arrears"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs opacity-80 cursor-not-allowed hover:bg-slate-700/50 transition-colors"
                tabIndex={-1}
                aria-disabled="true"
              >
                <ChevronRight className="h-2 w-2 text-slate-400" /> 
                <span className="text-slate-200">Service Charge Arrears</span>
              </a>
              <a
                href="/finances/budgeting"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs opacity-80 cursor-not-allowed hover:bg-slate-700/50 transition-colors"
                tabIndex={-1}
                aria-disabled="true"
              >
                <ChevronRight className="h-2 w-2 text-slate-400" /> 
                <span className="text-slate-200">Budgeting</span>
              </a>
            </div>
            
            {/* Contractors */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium opacity-80 cursor-not-allowed bg-slate-700/50 backdrop-blur-sm mt-2">
              <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center shadow-lg border border-white/20">
                <span className="text-sm font-bold text-white">🔧</span>
              </div>
              <span className="text-slate-200">Contractors</span>
              <Clock className="h-3 w-3 ml-auto text-slate-400" />
            </div>
            
            {/* Work Orders */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium opacity-80 cursor-not-allowed bg-slate-700/50 backdrop-blur-sm mt-2">
              <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center shadow-lg border border-white/20">
                <span className="text-sm font-bold text-white">📋</span>
              </div>
              <span className="text-slate-200">Work Orders</span>
              <Clock className="h-3 w-3 ml-auto text-slate-400" />
            </div>
            
            {/* Client Portal */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium opacity-80 cursor-not-allowed bg-slate-700/50 backdrop-blur-sm mt-2">
              <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center shadow-lg border border-white/20">
                <span className="text-sm text-white">👥</span>
              </div>
              <span className="text-slate-200">Client Portal</span>
              <Clock className="h-3 w-3 ml-auto text-slate-400" />
            </div>
          </div>
        </nav>

        {/* Logout Section */}
        <div className="border-t border-white/20 pt-3 mt-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-500/50 transition-all duration-300 w-full text-left group backdrop-blur-sm bg-red-500/20 border border-red-400/30 hover:border-red-400/50"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-red-500/50 to-red-600/50 rounded-lg flex items-center justify-center group-hover:from-red-500/60 group-hover:to-red-600/60 transition-all duration-300 shadow-lg border border-red-400/30 group-hover:border-red-400/50">
              <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform text-white" />
            </div>
            <span className="text-white font-semibold">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
