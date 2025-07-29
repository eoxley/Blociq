import React from 'react'
import { createClient } from '@supabase/supabase-js'
import { Calendar, ClipboardCheck, AlertTriangle, Upload, Eye, Shield, Clock, CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { BlocIQButton } from '@/components/ui/blociq-button'
import BlocIQLogo from '@/components/BlocIQLogo'

export default async function BuildingCompliancePage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  console.log("🔍 === BUILDING COMPLIANCE PAGE START ===")
  console.log("Received params:", params)

  try {
    // 1. Resolve params
    const resolvedParams = await params
    console.log("Resolved params:", resolvedParams)

    const buildingId = resolvedParams?.buildingId
    console.log("Building ID:", buildingId)

    if (!buildingId) {
      console.error("❌ Missing building ID")
      return (
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
                Error: Missing Building ID
              </h1>
              <p className="text-gray-600 text-center mb-6">
                No building ID provided in the URL parameters.
              </p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    // 2. Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log("Supabase URL exists:", !!supabaseUrl)
    console.log("Supabase service key exists:", !!supabaseServiceKey)

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase environment variables")
      return (
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
                Configuration Error
              </h1>
              <p className="text-gray-600 text-center mb-6">
                Missing Supabase environment variables.
              </p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    // 3. Create Supabase client
    let supabase
    try {
      console.log("🔧 Creating Supabase client...")
      supabase = createClient(supabaseUrl, supabaseServiceKey)
      console.log("✅ Supabase client created successfully")
    } catch (err) {
      console.error("❌ Error creating Supabase client:", err)
      return (
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
                Database Connection Error
              </h1>
              <p className="text-gray-600 text-center mb-6">
                Failed to create Supabase client.
              </p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    // 4. Fetch building details
    console.log("🔍 Fetching building details for ID:", buildingId)
    let buildingResult
    try {
      buildingResult = await supabase
        .from("buildings")
        .select("id, name, address")
        .eq("id", buildingId)
        .maybeSingle()
      
      console.log("✅ Building query completed")
      console.log("Building result:", buildingResult)
    } catch (err) {
      console.error("❌ Building query error:", err)
      return (
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
                Building Query Error
              </h1>
              <p className="text-gray-600 text-center mb-6">
                Failed to fetch building data.
              </p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    if (buildingResult.error) {
      console.error("❌ Building query response error:", buildingResult.error)
      return (
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
                Building Query Response Error
              </h1>
              <p className="text-gray-600 text-center mb-6">
                Supabase returned an error for building query.
              </p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    if (!buildingResult.data) {
      console.error("❌ No building found for ID:", buildingId)
      return (
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
                Building Not Found
              </h1>
              <p className="text-gray-600 text-center mb-6">
                No building found with ID: {buildingId}
              </p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    const building = buildingResult.data
    console.log("✅ Building found:", building)

    // 5. Fetch compliance assets for the specific building
    console.log("🔍 Fetching compliance assets for building ID:", buildingId)
    let complianceResult
    try {
      complianceResult = await supabase
        .from("building_compliance_assets")
        .select(`
          id,
          status,
          next_due_date,
          last_renewed_date,
          notes,
          compliance_asset:compliance_assets (
            id,
            name,
            category,
            description,
            recommended_frequency
          )
        `)
        .eq("building_id", buildingId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
      
      console.log("✅ Compliance assets query completed")
      console.log("Compliance result:", complianceResult)
      
      if (complianceResult.error) {
        console.error("❌ Supabase compliance query failed:", complianceResult.error)
        throw new Error(`Supabase compliance asset query failed: ${complianceResult.error.message}`)
      }
      
    } catch (err) {
      console.error("⚠️ Compliance page error:", err)
      return (
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
                Compliance Query Response Error
              </h1>
              <p className="text-gray-600 text-center mb-6">
                There was an issue loading compliance data. Please check your Supabase table or contact support.
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3 mt-4">
                <p className="text-sm text-red-700">
                  <strong>Error:</strong> {err instanceof Error ? err.message : 'Unknown error'}
                </p>
              </div>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    const complianceAssets = complianceResult.data || []
    console.log("✅ Compliance assets found:", complianceAssets.length, "items")

    // 6. Group assets by category
    const groupedAssets = complianceAssets.reduce((acc: any, asset: any) => {
      const category = asset.compliance_asset?.category || 'Other'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(asset)
      return acc
    }, {})

    console.log("✅ Assets grouped by category:", Object.keys(groupedAssets))

    // 7. Helper functions
    const formatDate = (dateString: string | null) => {
      if (!dateString) return 'Not set'
      try {
        return new Date(dateString).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      } catch (error) {
        console.error('❌ Error formatting date:', dateString, error)
        return 'Invalid date'
      }
    }

    const getStatusBadge = (nextDueDate: string | null, lastRenewed: string | null) => {
      if (!nextDueDate) {
        if (!lastRenewed) {
          return { variant: 'destructive' as const, text: 'Missing', icon: XCircle }
        }
        return { variant: 'secondary' as const, text: 'No due date', icon: HelpCircle }
      }
      
      try {
        const dueDate = new Date(nextDueDate)
        const today = new Date()
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntilDue < 0) {
          return { variant: 'destructive' as const, text: 'Overdue', icon: AlertTriangle }
        } else if (daysUntilDue <= 30) {
          return { variant: 'warning' as const, text: 'Due Soon', icon: Clock }
        } else {
          return { variant: 'success' as const, text: 'Compliant', icon: CheckCircle }
        }
      } catch (error) {
        console.error('❌ Error calculating status:', error)
        return { variant: 'secondary' as const, text: 'Unknown', icon: HelpCircle }
      }
    }

    const isAIAsset = (assetName: string) => {
      const aiKeywords = ['fire', 'fra', 'gas', 'asbestos', 'lift', 'eicr', 'd&o', 'insurance', 'epc']
      return aiKeywords.some(keyword => 
        assetName.toLowerCase().includes(keyword.toLowerCase())
      )
    }

    // 8. Render the main compliance page with BlocIQ branding
    console.log("✅ All queries successful - rendering page")
    console.log("=== BUILDING COMPLIANCE PAGE END ===")

    return (
      <LayoutWithSidebar>
        <div className="space-y-8">
          {/* Enhanced Header with BlocIQ Gradient Background */}
          <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Shield className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-serif font-bold">Compliance Tracker</h1>
                    <p className="text-white/90 text-lg">{building.name}</p>
                    <p className="text-white/80 text-sm">{building.address}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{complianceAssets.length}</div>
                <div className="text-white/80 text-sm">Active Assets</div>
              </div>
            </div>
          </div>

          {/* Compliance Categories */}
          {Object.keys(groupedAssets).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedAssets).map(([category, assets]: [string, any]) => (
                <BlocIQCard key={category} variant="elevated">
                  <BlocIQCardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                        <ClipboardCheck className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-serif font-semibold text-[#333333]">{category}</h2>
                        <p className="text-sm text-[#64748B]">{assets.length} compliance items</p>
                      </div>
                    </div>
                  </BlocIQCardHeader>
                  
                  <BlocIQCardContent>
                    <div className="space-y-4">
                      {assets.map((asset: any) => {
                        const statusBadge = getStatusBadge(asset.next_due_date, asset.last_renewed_date)
                        const StatusIcon = statusBadge.icon
                        const isAI = isAIAsset(asset.compliance_asset?.name || '')
                        
                        return (
                          <div 
                            key={asset.id} 
                            className="bg-gradient-to-r from-[#F0FDFA] to-emerald-50 rounded-xl p-6 border border-[#E2E8F0] hover:shadow-lg transition-all duration-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <h3 className="text-lg font-serif font-semibold text-[#333333]">
                                    {asset.compliance_asset?.name || 'Unknown Asset'}
                                  </h3>
                                  <BlocIQBadge variant={statusBadge.variant} size="sm">
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {statusBadge.text}
                                  </BlocIQBadge>
                                  {isAI && (
                                    <BlocIQBadge variant="secondary" size="sm">
                                      🧠 AI
                                    </BlocIQBadge>
                                  )}
                                </div>
                                
                                {asset.compliance_asset?.description && (
                                  <p className="text-sm text-[#64748B] mb-4">
                                    {asset.compliance_asset.description}
                                  </p>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-[#64748B]" />
                                    <span className="text-[#64748B]">Last Renewed:</span>
                                    <span className="font-medium text-[#333333]">
                                      {formatDate(asset.last_renewed_date)}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-[#64748B]" />
                                    <span className="text-[#64748B]">Next Due:</span>
                                    <span className={`font-medium ${
                                      statusBadge.variant === 'destructive' ? 'text-red-600' : 'text-[#333333]'
                                    }`}>
                                      {formatDate(asset.next_due_date)}
                                    </span>
                                  </div>
                                  
                                  {asset.compliance_asset?.recommended_frequency && (
                                    <div className="flex items-center gap-2">
                                      <ClipboardCheck className="h-4 w-4 text-[#64748B]" />
                                      <span className="text-[#64748B]">Frequency:</span>
                                      <span className="font-medium text-[#333333]">
                                        {asset.compliance_asset.recommended_frequency}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <BlocIQButton
                                  variant="outline"
                                  size="sm"
                                  className="border-[#008C8F] text-[#008C8F] hover:bg-[#008C8F] hover:text-white"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </BlocIQButton>
                                <BlocIQButton
                                  variant="primary"
                                  size="sm"
                                  className="bg-gradient-to-r from-[#008C8F] to-[#2BBEB4] hover:from-[#007B8A] hover:to-[#2BBEB4] text-white"
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Upload
                                </BlocIQButton>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </BlocIQCardContent>
                </BlocIQCard>
              ))}
            </div>
          ) : (
            /* Empty State with BlocIQ Styling */
            <BlocIQCard variant="elevated">
              <BlocIQCardContent>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#2BBEB4] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                    No Compliance Assets Assigned
                  </h2>
                  <p className="text-[#64748B] mb-6 max-w-md mx-auto">
                    This building doesn't have any compliance tracking set up yet.
                    Please click below to assign relevant compliance assets.
                  </p>
                  <div className="space-y-3">
                    <a
                      href={`/buildings/${buildingId}/compliance/setup`}
                      className="inline-flex items-center justify-center px-6 py-3 text-white font-semibold rounded-xl bg-gradient-to-r from-[#008C8F] to-[#2BBEB4] hover:from-[#007B8A] hover:to-[#2BBEB4] transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Set Up Compliance
                    </a>
                  </div>
                </div>
              </BlocIQCardContent>
            </BlocIQCard>
          )}
        </div>
      </LayoutWithSidebar>
    )

  } catch (error) {
    // 9. Catch-all error handler
    console.error("❌ === UNHANDLED ERROR IN BUILDING COMPLIANCE PAGE ===")
    console.error("Error:", error)
    console.error("Error type:", typeof error)
    console.error("Error constructor:", error?.constructor?.name)
    console.error("Error message:", error instanceof Error ? error.message : 'No message')
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack')
    console.error("=== END UNHANDLED ERROR ===")

    return (
      <LayoutWithSidebar>
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
              Unexpected Error
            </h1>
            <p className="text-gray-600 text-center mb-6">
              An unexpected error occurred while loading the compliance page.
            </p>
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-700">
                <strong>Error Type:</strong> {error?.constructor?.name || 'Unknown'}
              </p>
              <p className="text-sm text-red-700">
                <strong>Message:</strong> {error instanceof Error ? error.message : String(error)}
              </p>
            </div>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }
}