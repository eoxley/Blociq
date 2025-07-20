import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import { groupBy } from 'lodash'

interface ComplianceAsset {
  id: string
  name: string
  description: string
  category: string
  required_if: string
  default_frequency: string
}

export default async function CompliancePage({ params }: { params: Promise<{ buildingId: string }> }) {
  try {
    const { buildingId } = await params
    const supabase = createClient(cookies())

    if (!buildingId) {
      return (
        <LayoutWithSidebar>
          <div className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold text-dark">Compliance</h1>
            <div className="bg-error/10 border border-error/20 rounded-lg p-4">
              <p className="text-error">Missing building ID.</p>
              <p className="text-error/80 text-sm mt-2">Please provide a valid building ID in the URL.</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session) redirect('/login')

    // Fetch building data
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .maybeSingle()

    if (buildingError) {
      console.error('Building fetch error:', buildingError.message)
      return (
        <LayoutWithSidebar>
          <div className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold text-dark">Compliance</h1>
            <div className="bg-error/10 border border-error/20 rounded-lg p-4">
              <p className="text-error">Could not load building information.</p>
              <p className="text-error/80 text-sm mt-2">Error: {buildingError.message}</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    if (!building) {
      return (
        <LayoutWithSidebar>
          <div className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold text-dark">Compliance</h1>
            <div className="bg-error/10 border border-error/20 rounded-lg p-4">
              <p className="text-error">Building not found.</p>
              <p className="text-error/80 text-sm mt-2">Building ID: {buildingId}</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    // Fetch all compliance assets
    const { data: assets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('*')
      .order('category', { ascending: true }) as { data: ComplianceAsset[] | null, error: any }

    if (assetsError) {
      console.error('Compliance assets fetch error:', assetsError.message)
      return (
        <LayoutWithSidebar>
          <div className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold text-dark">Compliance</h1>
            <div className="bg-error/10 border border-error/20 rounded-lg p-4">
              <p className="text-error">Could not load compliance assets.</p>
              <p className="text-error/80 text-sm mt-2">Error: {assetsError.message}</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    // Fetch building compliance status
    const { data: buildingAssets, error: buildingAssetsError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .eq('building_id', parseInt(buildingId, 10))

    if (buildingAssetsError) {
      console.error('Building compliance assets fetch error:', buildingAssetsError.message)
    }

    // Create status map and dates map
    const statusMap: Record<string, string> = {}
    const statusDatesMap: Record<string, string> = {}
    buildingAssets?.forEach((buildingAsset) => {
      statusMap[buildingAsset.asset_id] = buildingAsset.status || 'Not Tracked'
      statusDatesMap[buildingAsset.asset_id] = buildingAsset.next_due_date || ''
    })

    // Group compliance assets by category
    const groupedAssets = groupBy(assets, 'category')

    return (
      <LayoutWithSidebar>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-dark">Compliance</h1>
            <p className="text-lg text-neutral">Building: <strong className="text-dark">{building.name}</strong></p>
          </div>

          {Object.entries(groupedAssets).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-1">{category}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(items as ComplianceAsset[]).map((asset: ComplianceAsset) => {
                  const status = statusMap[asset.id] || 'Not Tracked'
                  const badgeVariant =
                    status === 'Compliant'
                      ? 'default'
                      : status === 'Overdue'
                      ? 'destructive'
                      : status === 'Missing'
                      ? 'outline'
                      : 'outline'

                  return (
                    <div
                      key={asset.id}
                      className="bg-white border p-4 rounded-xl space-y-2 shadow-sm"
                    >
                      <div className="font-medium">{asset.name}</div>
                      <Badge variant={badgeVariant}>{status}</Badge>
                      <p className="text-xs text-muted-foreground">{asset.description}</p>
                      
                      <form
                        action="/api/compliance-assets/set-due-date"
                        method="post"
                        className="space-y-1 text-xs"
                      >
                        <input type="hidden" name="building_id" value={buildingId} />
                        <input type="hidden" name="asset_id" value={asset.id} />
                        <label className="block font-medium">Next Due Date</label>
                        <input
                          type="date"
                          name="next_due_date"
                          defaultValue={statusDatesMap[asset.id] || ''}
                          className="border rounded px-2 py-1 text-sm w-full"
                        />
                        <button
                          type="submit"
                          className="text-blue-600 hover:underline mt-1"
                        >
                          Save Date
                        </button>
                      </form>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </LayoutWithSidebar>
    )
  } catch (err) {
    console.error('Compliance page crash:', err)
    return (
      <LayoutWithSidebar>
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold text-dark">Compliance</h1>
          <div className="bg-error/10 border border-error/20 rounded-lg p-4">
            <p className="text-error">An unexpected error occurred.</p>
            <p className="text-error/80 text-sm mt-2">Error details: {err instanceof Error ? err.message : String(err)}</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }
} 