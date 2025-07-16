import ComplianceClient from './ComplianceClient'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UK_COMPLIANCE_ITEMS, ComplianceAsset } from '@/lib/complianceUtils'

export default async function CompliancePage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  try {
    // Fetch building assets for compliance tracking
    const { data: buildingAssets, error } = await supabase
      .from('building_assets')
      .select(`
        *,
        compliance_items (
          id,
          item_type,
          category,
          frequency,
          required_if
        )
      `)

    if (error) {
      console.error('Error fetching building assets:', error)
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Compliance</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">Error loading compliance data: {error.message}</p>
            <p className="text-red-500 text-sm mt-2">Please try refreshing the page or contact support if the issue persists.</p>
          </div>
        </div>
      )
    }

    // Transform the data to match the ComplianceAsset interface
    const transformedAssets: ComplianceAsset[] = UK_COMPLIANCE_ITEMS.map(item => {
      const buildingAsset = buildingAssets?.find(ba => ba.compliance_item_id === item.id)
      
      return {
        id: item.id.toString(),
        name: item.name,
        description: item.description,
        required_if: item.required_if,
        default_frequency: item.default_frequency,
        category: item.category,
        applies: buildingAsset?.applies || false,
        last_checked: buildingAsset?.last_checked || '',
        next_due: buildingAsset?.next_due || ''
      }
    })

    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Compliance</h1>
        <ComplianceClient complianceAssets={transformedAssets} />
      </div>
    )
  } catch (error) {
    console.error('Unexpected error in compliance page:', error)
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Compliance</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">An unexpected error occurred while loading compliance data.</p>
          <p className="text-red-500 text-sm mt-2">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      </div>
    )
  }
} 