'use client'

import React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { 
  Home, 
  Inbox, 
  Building2, 
  Shield, 
  LogOut, 
  Sparkles,
  Calendar,
  FileText,
  Mail,
  Settings,
  DollarSign,
  Clock
} from 'lucide-react'

export default function Sidebar() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navigationItems = [
    { href: '/home', icon: Home, label: 'Home' },
    { href: '/inbox', icon: Inbox, label: 'Inbox' },
    { href: '/buildings', icon: Building2, label: 'Buildings' },
    { href: '/compliance', icon: Shield, label: 'Compliance' },
    { href: '/compliance/documents', icon: FileText, label: 'Compliance Docs' },
    { href: '/documents', icon: FileText, label: 'Documents' },
    { href: '/mail-templates', icon: Mail, label: 'Mail Templates' },
    { href: '/mail-merge', icon: Calendar, label: 'Mail Merge' },
    { href: '/ai-draft', icon: Sparkles, label: 'AI Draft' },
    { href: '/ai-reply', icon: Sparkles, label: 'AI Reply' },
    { href: '/account', icon: Settings, label: 'Account' },
  ]

  const comingSoonItems = [
    { href: '#', icon: DollarSign, label: 'Finance', comingSoon: true },
  ]

  return (
    <aside className="min-h-screen w-64 bg-gradient-to-b from-teal-700 to-teal-800 text-white flex flex-col py-6 px-4 shadow-xl">
      {/* Logo Section */}
      <div className="mb-8 px-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
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
          {comingSoonItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium opacity-60 cursor-not-allowed"
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
                <Clock className="h-3 w-3 ml-auto" />
              </div>
            )
          })}
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
