import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
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
  const supabase = createClient(cookies())
  const buildingId = parseInt(params.id, 10)

  if (isNaN(buildingId)) {
    return <p className="text-red-500">Invalid building ID.</p>
  }

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) redirect('/login')

  // Load compliance asset definitions
  const { data: assets, error: assetError } = await supabase
    .from('compliance_assets')
    .select('id, name')
    .order('name', { ascending: true })

  if (assetError || !assets) {
    console.error('Error loading compliance assets:', assetError)
    return <p className="text-red-500">Error loading compliance asset list.</p>
  }

  // Load current building compliance status
  const { data: statuses, error: statusError } = await supabase
    .from('building_compliance_assets')
    .select('asset_id, status')
    .eq('building_id', buildingId)

  if (statusError || !statuses) {
    console.error('Error loading building statuses:', statusError)
    return <p className="text-red-500">Error loading building compliance data.</p>
  }

  const statusMap = Object.fromEntries(statuses.map((item) => [item.asset_id, item.status]))

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Compliance Tracker</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => {
          const status = statusMap[asset.id] || 'Not Tracked'
          const badgeVariant =
            status === 'Compliant'
              ? 'default'
              : status === 'Overdue'
              ? 'destructive'
              : status === 'Missing'
              ? 'warning'
              : 'outline'

          return (
            <div key={asset.id} className="p-4 border rounded-xl shadow-sm space-y-2 bg-white">
              <div className="font-medium">{asset.name}</div>
              <Badge variant={badgeVariant}>{status}</Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
} 