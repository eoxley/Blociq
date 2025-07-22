import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CommunicationsClient from './CommunicationsClient'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

export default async function CommunicationsPage() {
  const supabase = createClient(cookies())
  
  // Protect this route with Supabase Auth
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Simple user data without complex database queries
  const userData = {
    name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Property Manager',
    email: session.user.email || ''
  }

  return (
    <LayoutWithSidebar>
      <div className="max-w-7xl mx-auto p-6">
        <CommunicationsClient userData={userData} />
      </div>
    </LayoutWithSidebar>
  )
} 