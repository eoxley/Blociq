import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import ComplianceTrackerClient from './ComplianceTrackerClient'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ComplianceTrackerPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  try {
    const { buildingId } = await params
    
    const supabase = createServerComponentClient({ cookies })
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect('/login')
    }

    // Fetch building data
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single()

    if (buildingError || !building) {
      console.error('Building not found:', buildingError)
      redirect('/buildings')
    }

    // For now, use a simplified approach - just fetch basic compliance assets
    const { data: complianceAssets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('id, name, description, category')
      .order('name', { ascending: true })

    if (assetsError) {
      console.error('Error fetching compliance assets:', assetsError)
    }

    // Transform to the expected format
    const transformedAssets = (complianceAssets || []).map(asset => ({
      asset_type: asset.id,
      title: asset.name,
      required: asset.category === 'Safety',
      last_doc_date: null,
      expiry_date: null,
      status: 'missing' as const,
      category: asset.category || 'General',
      frequency: 'Annual'
    }))

    return (
      <LayoutWithSidebar>
        <ComplianceTrackerClient 
          building={building} 
          complianceAssets={transformedAssets}
        />
      </LayoutWithSidebar>
    )
  } catch (error) {
    console.error('Compliance tracker page error:', error)
    return (
      <LayoutWithSidebar>
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Compliance Tracker</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">An error occurred while loading the compliance tracker.</p>
            <p className="text-red-600 text-sm mt-2">Please try refreshing the page or contact support if the issue persists.</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }
} 