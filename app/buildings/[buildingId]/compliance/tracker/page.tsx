import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UK_COMPLIANCE_ITEMS } from '@/lib/complianceUtils'

export default async function ComplianceTrackerPage({ params }: { params: Promise<{ buildingId: string }> }) {
  try {
    const { buildingId } = await params
    const supabase = createClient(cookies())

    if (!buildingId) {
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Compliance Tracker</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">Missing building ID.</p>
            <p className="text-red-500 text-sm mt-2">Please provide a valid building ID in the URL.</p>
          </div>
        </div>
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
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Compliance Tracker</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">Could not load building information.</p>
            <p className="text-red-500 text-sm mt-2">Error: {buildingError.message}</p>
          </div>
        </div>
      )
    }

    if (!building) {
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Compliance Tracker</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">Building not found.</p>
            <p className="text-red-500 text-sm mt-2">Building ID: {buildingId}</p>
          </div>
        </div>
      )
    }

    // Fetch existing compliance assets for this building
    const { data: existingAssets, error: assetsError } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets (
          id,
          name,
          description,
          category
        )
      `)
      .eq('building_id', parseInt(buildingId, 10))

    if (assetsError) {
      console.error('Compliance assets fetch error:', assetsError.message)
    }

    // Create a map of existing assets for quick lookup
    const existingAssetMap = new Map()
    if (existingAssets) {
      existingAssets.forEach(asset => {
        const complianceAsset = Array.isArray(asset.compliance_assets) 
          ? asset.compliance_assets[0] 
          : asset.compliance_assets
        if (complianceAsset) {
          existingAssetMap.set(complianceAsset.name, {
            ...asset,
            complianceAsset
          })
        }
      })
    }

    // Helper function to get status badge variant
    const getStatusBadgeVariant = (status: string): "default" | "destructive" | "warning" | "outline" => {
      switch (status?.toLowerCase()) {
        case 'compliant':
          return 'default'
        case 'overdue':
          return 'destructive'
        case 'due soon':
        case 'missing':
          return 'warning'
        default:
          return 'outline'
      }
    }

    // Helper function to format date
    const formatDate = (dateString: string | null): string => {
      if (!dateString) return 'Not set'
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }

    // Calculate compliance statistics
    const totalAssets = existingAssets?.length || 0
    const compliantAssets = existingAssets?.filter(asset => 
      asset.status?.toLowerCase() === 'compliant'
    ).length || 0
    const overdueAssets = existingAssets?.filter(asset => 
      asset.status?.toLowerCase() === 'overdue'
    ).length || 0
    const missingAssets = existingAssets?.filter(asset => 
      asset.status?.toLowerCase() === 'missing'
    ).length || 0

    const complianceRate = totalAssets > 0 ? Math.round((compliantAssets / totalAssets) * 100) : 0

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Compliance Tracker</h1>
          <p className="text-lg text-gray-600">Building: <strong>{building.name}</strong></p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{totalAssets}</div>
              <div className="text-sm text-gray-600">Total Assets</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{compliantAssets}</div>
              <div className="text-sm text-gray-600">Compliant</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{overdueAssets}</div>
              <div className="text-sm text-gray-600">Overdue</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{complianceRate}%</div>
              <div className="text-sm text-gray-600">Compliance Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tracker" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tracker">Compliance Tracker</TabsTrigger>
            <TabsTrigger value="setup">Setup Assets</TabsTrigger>
          </TabsList>

          {/* Tracker Tab */}
          <TabsContent value="tracker" className="space-y-4">
            {existingAssets && existingAssets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {existingAssets.map((asset) => {
                  const complianceAsset = Array.isArray(asset.compliance_assets) 
                    ? asset.compliance_assets[0] 
                    : asset.compliance_assets
                  
                  if (!complianceAsset) return null

                  return (
                    <Card key={asset.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{complianceAsset.name}</CardTitle>
                          <Badge variant={getStatusBadgeVariant(asset.status)}>
                            {asset.status || 'Not Started'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>{complianceAsset.description}</p>
                          <div className="flex items-center justify-between">
                            <span>Category: {complianceAsset.category}</span>
                            <span>Updated: {formatDate(asset.last_updated)}</span>
                          </div>
                          {asset.notes && (
                            <p className="text-xs bg-gray-50 p-2 rounded">
                              <strong>Notes:</strong> {asset.notes}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500 space-y-2">
                    <p className="text-lg font-medium">No compliance assets configured</p>
                    <p className="text-sm">Use the Setup Assets tab to configure compliance requirements for this building.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Compliance Assets</CardTitle>
                <p className="text-sm text-gray-600">
                  Select which compliance assets apply to this building. Required assets are marked as mandatory.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {UK_COMPLIANCE_ITEMS.map((item) => {
                    const isApplied = existingAssetMap.has(item.name)
                    const existingAsset = existingAssetMap.get(item.name)
                    
                    return (
                      <Card key={item.id} className={`border-2 ${isApplied ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{item.name}</CardTitle>
                            <Badge variant={item.required_if === 'always' ? 'destructive' : 'outline'}>
                              {item.required_if === 'always' ? 'Required' : 'Optional'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2 text-sm text-gray-600">
                            <p>{item.description}</p>
                            <div className="flex items-center justify-between">
                              <span>Category: {item.category}</span>
                              <span>Frequency: {item.default_frequency}</span>
                            </div>
                            {isApplied && (
                              <div className="mt-2 p-2 bg-green-100 rounded text-xs">
                                <strong>Applied</strong> - Status: {existingAsset.status || 'Not Started'}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  } catch (err) {
    console.error('Compliance tracker page crash:', err)
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Compliance Tracker</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">An unexpected error occurred.</p>
          <p className="text-red-500 text-sm mt-2">Error details: {err instanceof Error ? err.message : String(err)}</p>
        </div>
      </div>
    )
  }
} 