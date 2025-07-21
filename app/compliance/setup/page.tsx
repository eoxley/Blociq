import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ComplianceSetupWizard from './ComplianceSetupWizard'

export default async function ComplianceSetupPage() {
  try {
    const supabase = createClient(cookies())
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) redirect('/login')

    // Fetch all buildings
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address, unit_count')
      .order('name', { ascending: true })

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError)
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold text-[#333333]">Compliance Setup</h1>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600">Could not load buildings.</p>
            <p className="text-red-500 text-sm mt-2">Error: {buildingsError.message}</p>
          </div>
        </div>
      )
    }

    // Fetch all compliance assets
    const { data: assets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('*')
      .order('category', { ascending: true })

    if (assetsError) {
      console.error('Error fetching compliance assets:', assetsError)
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold text-[#333333]">Compliance Setup</h1>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600">Could not load compliance assets.</p>
            <p className="text-red-500 text-sm mt-2">Error: {assetsError.message}</p>
          </div>
        </div>
      )
    }

    // Fetch existing building compliance data
    const { data: existingCompliance, error: complianceError } = await supabase
      .from('building_compliance_assets')
      .select('*')

    if (complianceError) {
      console.error('Error fetching existing compliance:', complianceError)
    }

    const setupData = {
      buildings: buildings || [],
      assets: assets || [],
      existingCompliance: existingCompliance || []
    }

    return <ComplianceSetupWizard setupData={setupData} />

  } catch (err) {
    console.error('Compliance setup page crash:', err)
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-[#333333]">Compliance Setup</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-600">An unexpected error occurred.</p>
          <p className="text-red-500 text-sm mt-2">Error details: {err instanceof Error ? err.message : String(err)}</p>
        </div>
      </div>
    )
  }
} 