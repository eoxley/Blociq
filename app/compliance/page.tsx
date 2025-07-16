import ComplianceClient from './ComplianceClient'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function CompliancePage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  // Try to fetch compliance assets (replace with your actual table/query)
  const { data: complianceAssets, error } = await supabase
    .from('compliance_assets')
    .select('*')

  if (error) {
    return <div className="p-6 text-red-600">Error loading compliance data: {error.message}</div>
  }

  if (!complianceAssets) {
    return <div className="p-6 text-gray-600">Loading compliance data...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Compliance</h1>
      <ComplianceClient complianceAssets={complianceAssets} />
    </div>
  )
} 