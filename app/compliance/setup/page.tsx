import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import ComplianceSetupWizard from './ComplianceSetupWizard'
import { Button } from '@/components/ui/button'
import { Shield, Settings, Building2, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default async function ComplianceSetupPage() {
  const supabase = createClient(cookies())
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  try {
    // Fetch all buildings
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address, unit_count')
      .order('name', { ascending: true })

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError)
      return (
        <LayoutWithSidebar>
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Error loading buildings: {buildingsError.message}</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    // Fetch all compliance assets (no limit)
    const { data: complianceAssets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (assetsError) {
      console.error('Error fetching compliance assets:', assetsError)
      return (
        <LayoutWithSidebar>
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Error loading compliance assets: {assetsError.message}</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    // Check which buildings already have compliance setup
    const { data: existingCompliance, error: existingError } = await supabase
      .from('building_compliance_assets')
      .select('building_id, asset_id')

    if (existingError) {
      console.error('Error fetching existing compliance:', existingError)
    }

    // Create a map of buildings that already have compliance setup
    const buildingsWithCompliance = new Set<string>()
    existingCompliance?.forEach(item => {
      buildingsWithCompliance.add(String(item.building_id))
    })

    return (
      <LayoutWithSidebar>
        <div className="space-y-8">
          {/* Enhanced Header with Gradient Background */}
          <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold">Compliance Setup Wizard</h1>
                  <p className="text-teal-100 text-lg">Configure compliance tracking for your buildings</p>
                </div>
                <div className="flex items-center gap-4">
                  <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                    <Shield className="h-4 w-4 mr-2" />
                    View Compliance
                  </Button>
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full"></div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-teal-50 to-teal-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-teal-700 group-hover:scale-110 transition-transform duration-300">
                      {buildings?.length || 0}
                    </div>
                    <div className="text-sm text-teal-600 font-medium">Total Buildings</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-blue-700 group-hover:scale-110 transition-transform duration-300">
                      {complianceAssets?.length || 0}
                    </div>
                    <div className="text-sm text-blue-600 font-medium">Compliance Assets</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-green-700 group-hover:scale-110 transition-transform duration-300">
                      {buildingsWithCompliance.length}
                    </div>
                    <div className="text-sm text-green-600 font-medium">With Compliance</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Setup Wizard */}
          <div className="max-w-4xl mx-auto">
            <ComplianceSetupWizard 
              buildings={buildings || []}
              complianceAssets={(complianceAssets as any[]) || []}
              buildingsWithCompliance={Array.from(buildingsWithCompliance)}
            />
          </div>
        </div>
      </LayoutWithSidebar>
    )
  } catch (error) {
    console.error('Error in compliance setup page:', error)
    return (
      <LayoutWithSidebar>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">An unexpected error occurred. Please try refreshing the page.</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }
} 