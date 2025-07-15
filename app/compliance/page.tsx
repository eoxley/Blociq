import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ComplianceClient from './ComplianceClient'
import LayoutWithSidebar from '../../components/LayoutWithSidebar'

interface ComplianceAsset {
  id: string
  name: string
  description: string
  required_if: 'always' | 'if present' | 'if HRB'
  default_frequency: string
}

export default async function CompliancePage() {
  const supabase = createServerComponentClient({ cookies })
  
  // Protect this route with Supabase Auth
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch all compliance assets
  const { data: complianceAssets, error } = await supabase
    .from('compliance_assets')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching compliance assets:', error)
  }

  return (
    <LayoutWithSidebar>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">Compliance Management</h1>
          <p className="text-gray-600">Track and manage regulatory compliance requirements</p>
        </div>

        <ComplianceClient complianceAssets={complianceAssets || []} />
      </div>
    </LayoutWithSidebar>
  )
}
