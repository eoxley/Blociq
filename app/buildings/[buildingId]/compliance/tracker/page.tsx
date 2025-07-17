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
          <h1 className="text-2xl font-semibold text-dark">Compliance Tracker</h1>
          <div className="bg-error/10 border border-error/20 rounded-lg p-4">
            <p className="text-error">Missing building ID.</p>
            <p className="text-error/80 text-sm mt-2">Please provide a valid building ID in the URL.</p>
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
          <h1 className="text-2xl font-semibold text-dark">Compliance Tracker</h1>
          <div className="bg-error/10 border border-error/20 rounded-lg p-4">
            <p className="text-error">Could not load building information.</p>
            <p className="text-error/80 text-sm mt-2">Error: {buildingError.message}</p>
          </div>
        </div>
      )
    }

    if (!building) {
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold text-dark">Compliance Tracker</h1>
          <div className="bg-error/10 border border-error/20 rounded-lg p-4">
            <p className="text-error">Building not found.</p>
            <p className="text-error/80 text-sm mt-2">Building ID: {buildingId}</p>
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
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-dark">Compliance Tracker</h1>
          <p className="text-lg text-neutral">Building: <strong className="text-dark">{building.name}</strong></p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{totalAssets}</div>
              <div className="text-sm text-neutral">Total Assets</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-success">{compliantAssets}</div>
              <div className="text-sm text-neutral">Compliant</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-error">{overdueAssets}</div>
              <div className="text-sm text-neutral">Overdue</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-secondary">{complianceRate}%</div>
              <div className="text-sm text-neutral">Compliance Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tracker" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-grey border-0">
            <TabsTrigger value="tracker" className="data-[state=active]:bg-primary data-[state=active]:text-white">Compliance Tracker</TabsTrigger>
            <TabsTrigger value="setup" className="data-[state=active]:bg-primary data-[state=active]:text-white">Setup Assets</TabsTrigger>
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
                    <Card key={asset.id} className="border-0 shadow-soft hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base text-dark">{complianceAsset.name}</CardTitle>
                          <Badge variant={getStatusBadgeVariant(asset.status)}>
                            {asset.status || 'Not Started'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-sm text-neutral">
                          <p>{complianceAsset.description}</p>
                          <div className="flex items-center justify-between">
                            <span>Category: {complianceAsset.category}</span>
                            <span>Updated: {formatDate(asset.last_updated)}</span>
                          </div>
                          {asset.notes && (
                            <p className="text-xs bg-grey p-2 rounded">
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
              <Card className="border-0 shadow-soft">
                <CardContent className="p-8 text-center">
                  <div className="text-neutral space-y-2">
                    <p className="text-lg font-medium">No compliance assets configured</p>
                    <p className="text-sm">Use the Setup Assets tab to configure compliance requirements for this building.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-4">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="text-dark">Available Compliance Assets</CardTitle>
                <p className="text-sm text-neutral">
                  Toggle which compliance assets apply to this building. Required assets are marked as mandatory.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {UK_COMPLIANCE_ITEMS.map((item) => {
                    const isApplied = existingAssetMap.has(item.name)
                    const existingAsset = existingAssetMap.get(item.name)
                    
                    return (
                      <div key={item.id} className={`p-4 rounded-lg border transition-colors ${
                        isApplied 
                          ? 'bg-primary/5 border-primary/20' 
                          : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            {/* Toggle Switch */}
                            <div className="relative">
                              <input
                                type="checkbox"
                                id={`toggle-${item.id}`}
                                className="sr-only"
                                defaultChecked={isApplied}
                                disabled
                              />
                              <label
                                htmlFor={`toggle-${item.id}`}
                                className={`block w-12 h-6 rounded-full transition-colors cursor-pointer ${
                                  isApplied 
                                    ? 'bg-primary' 
                                    : 'bg-slate-300'
                                }`}
                              >
                                <span className={`block w-4 h-4 bg-white rounded-full transition-transform transform ${
                                  isApplied ? 'translate-x-6' : 'translate-x-1'
                                } mt-1`} />
                              </label>
                            </div>
                            
                            {/* Asset Info */}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-dark">{item.name}</h3>
                                <Badge variant={item.required_if === 'always' ? 'destructive' : 'outline'}>
                                  {item.required_if === 'always' ? 'Required' : 'Optional'}
                                </Badge>
                              </div>
                              <p className="text-sm text-neutral mb-2">{item.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-neutral">
                                <span>Category: {item.category}</span>
                                <span>Frequency: {item.default_frequency}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Status Indicator */}
                          {isApplied && (
                            <div className="ml-4">
                              <Badge variant="default" className="bg-primary text-white">
                                Applied
                              </Badge>
                              {existingAsset?.status && (
                                <div className="text-xs text-neutral mt-1">
                                  Status: {existingAsset.status}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
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
        <h1 className="text-2xl font-semibold text-dark">Compliance Tracker</h1>
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-error">An unexpected error occurred.</p>
          <p className="text-error/80 text-sm mt-2">Error details: {err instanceof Error ? err.message : String(err)}</p>
        </div>
      </div>
    )
  }
} 