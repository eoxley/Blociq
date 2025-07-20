import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ComplianceAssetList from '@/components/ComplianceAssetList'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import Link from 'next/link'
import { ArrowLeft, Shield, Settings } from 'lucide-react'

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
    // Temporarily allow access for demonstration purposes
    // if (!sessionData?.session) redirect('/login')

    // Example building data for demonstration
    const exampleBuildings = {
      "1": { id: 1, name: "Test Property" },
      "2": { id: 2, name: "XX Building" },
      "3": { id: 3, name: "Sample Complex" }
    }

    // Example compliance assets
    const exampleComplianceAssets = [
      {
        id: "1",
        building_id: parseInt(buildingId),
        asset_id: "1",
        status: "Compliant",
        last_updated: "2024-01-15",
        notes: "Certificate valid until 2025-01-15",
        compliance_assets: {
          id: "1",
          name: "Fire Safety Certificate",
          description: "Annual fire safety assessment and certification",
          category: "Fire Safety"
        }
      },
      {
        id: "2",
        building_id: parseInt(buildingId),
        asset_id: "2",
        status: "Due Soon",
        last_updated: "2023-12-01",
        notes: "Due for renewal in 30 days",
        compliance_assets: {
          id: "2",
          name: "Gas Safety Certificate",
          description: "Annual gas safety inspection and certification",
          category: "Gas Safety"
        }
      },
      {
        id: "3",
        building_id: parseInt(buildingId),
        asset_id: "3",
        status: "Compliant",
        last_updated: "2024-02-01",
        notes: "EICR completed successfully",
        compliance_assets: {
          id: "3",
          name: "Electrical Safety Certificate",
          description: "Electrical installation condition report",
          category: "Electrical Safety"
        }
      },
      {
        id: "4",
        building_id: parseInt(buildingId),
        asset_id: "4",
        status: "Overdue",
        last_updated: "2023-10-15",
        notes: "Overdue by 45 days",
        compliance_assets: {
          id: "4",
          name: "Lift Maintenance Certificate",
          description: "Annual lift safety inspection and maintenance",
          category: "Lift Safety"
        }
      },
      {
        id: "5",
        building_id: parseInt(buildingId),
        asset_id: "5",
        status: "Compliant",
        last_updated: "2023-08-20",
        notes: "No asbestos found",
        compliance_assets: {
          id: "5",
          name: "Asbestos Survey",
          description: "Asbestos management survey and register",
          category: "Health & Safety"
        }
      },
      {
        id: "6",
        building_id: parseInt(buildingId),
        asset_id: "6",
        status: "Compliant",
        last_updated: "2024-01-10",
        notes: "Quarterly assessment completed",
        compliance_assets: {
          id: "6",
          name: "Water Hygiene Assessment",
          description: "Legionella risk assessment and water hygiene",
          category: "Water Safety"
        }
      },
      {
        id: "7",
        building_id: parseInt(buildingId),
        asset_id: "7",
        status: "Missing",
        last_updated: "",
        notes: "Not yet completed",
        compliance_assets: {
          id: "7",
          name: "Fire Door Survey",
          description: "Fire door inspection and certification",
          category: "Fire Safety"
        }
      },
      {
        id: "8",
        building_id: parseInt(buildingId),
        asset_id: "8",
        status: "Compliant",
        last_updated: "2023-11-30",
        notes: "EPC Rating: C",
        compliance_assets: {
          id: "8",
          name: "Energy Performance Certificate",
          description: "EPC assessment and rating",
          category: "Energy"
        }
      }
    ]

    // Try to get building from database first, then fall back to example data
    let building = null
    let buildingError = null

    try {
      const { data: dbBuilding, error } = await supabase
        .from('buildings')
        .select('id, name')
        .eq('id', buildingId)
        .maybeSingle()
      
      building = dbBuilding
      buildingError = error
    } catch (error) {
      buildingError = error
    }

    // If no building found in database, try example data
    if (buildingError || !building) {
      building = exampleBuildings[buildingId as keyof typeof exampleBuildings]
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

    // Use example compliance assets for demonstration
    const existingAssets = exampleComplianceAssets

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
      <LayoutWithSidebar>
        <div className="p-6 space-y-6 bg-background min-h-screen">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href={`/buildings/${buildingId}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Building
              </Link>
            </div>
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
                  <div className="flex items-center justify-center mb-4">
                    <Shield className="h-12 w-12 text-blue-600" />
                  </div>
                  <div className="text-neutral space-y-4">
                    <h2 className="text-xl font-semibold text-blue-900">No Compliance Setup Found</h2>
                    <p className="text-blue-700">
                      This building has no compliance assets set up. Set up compliance tracking to monitor requirements and deadlines.
                    </p>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                      <Link href="/compliance/setup">
                        <Settings className="h-4 w-4 mr-2" />
                        Go to Setup Wizard
                      </Link>
                    </Button>
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
                <ComplianceAssetList 
                  buildingId={buildingId} 
                  existingAssets={existingAssets || []} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </LayoutWithSidebar>
    )
  } catch (err) {
    console.error('Compliance tracker page crash:', err)
    return (
      <LayoutWithSidebar>
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold text-dark">Compliance Tracker</h1>
          <div className="bg-error/10 border border-error/20 rounded-lg p-4">
            <p className="text-error">An unexpected error occurred.</p>
            <p className="text-error/80 text-sm mt-2">Error details: {err instanceof Error ? err.message : String(err)}</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }
} 