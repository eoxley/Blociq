import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Badge } from '@/components/ui/badge'

export default async function ComplianceTrackerPage({ params }: { params: { id: string } }) {
  try {
    const supabase = createClient(cookies())
    const buildingId = parseInt(params?.id, 10)

    if (!buildingId || isNaN(buildingId)) {
      return <div className="p-6 text-red-500">Invalid building ID.</div>
    }

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session) redirect('/login')

    const { data: assets = [], error: assetError } = await supabase
      .from('compliance_assets')
      .select('id, name')
      .order('name', { ascending: true })

    if (assetError) {
      console.error('Asset fetch error:', assetError.message)
      return <div className="p-6 text-red-500">Could not load compliance assets.</div>
    }

    const { data: statuses = [], error: statusError } = await supabase
      .from('building_compliance_assets')
      .select('asset_id, status')
      .eq('building_id', buildingId)

    if (statusError) {
      console.error('Status fetch error:', statusError.message)
      return <div className="p-6 text-red-500">Could not load compliance status.</div>
    }

    const statusMap = Object.fromEntries(statuses.map((s) => [s.asset_id, s.status]))

    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Compliance Tracker</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.length === 0 ? (
            <p className="text-muted-foreground">No compliance items found.</p>
          ) : (
            assets.map((asset) => {
              const status = statusMap[asset.id] || 'Not Tracked'
              const badgeVariant =
                status === 'Compliant'
                  ? 'default'
                  : status === 'Overdue'
                  ? 'destructive'
                  : status === 'Missing'
                  ? 'secondary'
                  : 'outline'

              return (
                <div
                  key={asset.id}
                  className="bg-white border rounded-xl p-4 shadow-sm space-y-2"
                >
                  <div className="font-medium">{asset.name}</div>
                  <Badge variant={badgeVariant}>{status}</Badge>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  } catch (err) {
    console.error('Tracker page failed:', err)
    return <div className="p-6 text-red-500">An unexpected error occurred while loading this page.</div>
  }
} 