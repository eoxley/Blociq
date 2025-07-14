import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import UnitDetailClient from './UnitDetailClient'

export default async function UnitDetailPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params
  const supabase = createServerComponentClient({ cookies })

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch unit details
  const { data: unit, error: unitError } = await supabase
    .from('units')
    .select('*')
    .eq('id', unitId)
    .single()
  if (unitError || !unit) {
    redirect('/buildings')
  }

  // Fetch leaseholder(s)
  const { data: leaseholders } = await supabase
    .from('leaseholders')
    .select('*')
    .eq('unit_id', unitId)

  // Fetch lease
  const { data: lease } = await supabase
    .from('leases')
    .select('*')
    .eq('unit_id', unitId)
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  // Fetch recent correspondence (emails)
  const { data: emails } = await supabase
    .from('incoming_emails')
    .select('id, subject, body_preview, created_at')
    .eq('unit', unit.unit_number)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <UnitDetailClient 
      unit={unit} 
      leaseholders={leaseholders || []} 
      lease={lease || null} 
      emails={emails || []} 
    />
  )
} 