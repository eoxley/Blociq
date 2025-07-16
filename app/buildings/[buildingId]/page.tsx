import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingDetailClient from './BuildingDetailClient'

export default async function BuildingDetailPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  const { buildingId } = await params
  const supabase = createServerComponentClient({ cookies })
  
  // Secure the route using Supabase Auth
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch building data
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', buildingId)
    .single()

  if (buildingError || !building) {
    redirect('/buildings')
  }

  // Fetch recent emails for this building
  const { data: recentEmails, error: emailsError } = await supabase
    .from('incoming_emails')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (emailsError) {
    console.error('Error fetching emails:', emailsError)
  }

  return (
    <LayoutWithSidebar>
      <BuildingDetailClient 
        building={building} 
        recentEmails={recentEmails || []}
      />
    </LayoutWithSidebar>
  )
} 