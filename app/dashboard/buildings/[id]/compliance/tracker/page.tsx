import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'

interface ComplianceAsset {
  id: string
  name: string
}

interface BuildingComplianceAsset {
  asset_id: string
  status: string
}

export default async function ComplianceTrackerPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies })

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) redirect('/login')

  const buildingId = params.id

  // Fetch all compliance assets
  const { data: assets, error: assetError } = await supabase
    .from('compliance_assets')
    .select('id, name')

  if (assetError) {
    console.error('Asset fetch error:', assetError.message)
    throw new Error('Unable to load compliance assets')
  }

  // Fetch saved compliance status per building
  const { data: buildingAssets, error: statusError } = await supabase
    .from('building_compliance_assets')
    .select('asset_id, status')
    .eq('building_id', buildingId)

  if (statusError) {
    console.error('Status fetch error:', statusError.message)
    throw new Error('Unable to load building compliance statuses')
  }

  const assetStatusMap = Object.fromEntries(
    (buildingAssets || []).map((ba: BuildingComplianceAsset) => [ba.asset_id, ba.status])
  )

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Compliance Tracker</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(assets || []).map((asset: ComplianceAsset) => {
          const status = assetStatusMap[asset.id] || 'Not Selected'
          return (
            <div
              key={asset.id}
              className="border rounded-xl p-4 shadow-sm bg-white space-y-2"
            >
              <div className="font-medium">{asset.name}</div>
              <Badge variant={
                status === 'Compliant' ? 'default' :
                status === 'Overdue' ? 'destructive' :
                status === 'Missing' ? 'warning' : 'outline'
              }>
                {status}
              </Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
} 