import React from 'react'
import { createClient } from '@supabase/supabase-js'
import { Building2, Plus, MapPin, Shield, AlertTriangle } from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { BlocIQButton } from '@/components/ui/blociq-button'

export default async function BuildingsPage() {
  console.log("🔍 === BUILDINGS PAGE START ===")

  try {
    // 1. Check environment variables
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
                <Building2 className="h-8 w-8 text-white" />
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

    // 2. Create Supabase client
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
                <Building2 className="h-8 w-8 text-white" />
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

    // 3. Fetch all buildings
    console.log("🔍 Fetching all buildings...")
    let buildingsResult
    try {
      buildingsResult = await supabase
        .from("buildings")
        .select("id, name, address, is_hrb, created_at")
        .order("name")
      
      console.log("✅ Buildings query completed")
      console.log("Buildings result:", buildingsResult)
      
      if (buildingsResult.error) {
        console.error("❌ Supabase buildings query failed:", buildingsResult.error)
        throw new Error(`Supabase buildings query failed: ${buildingsResult.error.message}`)
      }
      
    } catch (err) {
      console.error("⚠️ Buildings page error:", err)
      return (
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
                Buildings Query Error
              </h1>
              <p className="text-gray-600 text-center mb-6">
                There was an issue loading buildings data. Please check your Supabase table or contact support.
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

    const buildings = buildingsResult.data || []
    console.log("✅ Buildings found:", buildings.length, "buildings")
    console.log("=== BUILDINGS PAGE END ===")

    return (
      <LayoutWithSidebar>
        <div className="space-y-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Building2 className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-serif font-bold">Buildings</h1>
                    <p className="text-white/90 text-lg">Manage your property portfolio</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{buildings.length}</div>
                <div className="text-white/80 text-sm">Total Buildings</div>
              </div>
            </div>
          </div>

          {/* Add Building Button */}
          <div className="flex justify-end">
            <BlocIQButton
              variant="primary"
              className="bg-gradient-to-r from-[#008C8F] to-[#2BBEB4] hover:from-[#007B8A] hover:to-[#2BBEB4] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Building
            </BlocIQButton>
          </div>

          {/* Buildings Grid */}
          {buildings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {buildings.map((building) => (
                <BlocIQCard 
                  key={building.id} 
                  variant="elevated"
                  className="hover:shadow-xl transition-all duration-200 cursor-pointer group"
                >
                  <a href={`/buildings/${building.id}`} className="block">
                    <BlocIQCardContent className="p-6">
                      <div className="space-y-4">
                        {/* Building Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-xl font-serif font-semibold text-[#333333] group-hover:text-[#008C8F] transition-colors">
                              {building.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <MapPin className="h-4 w-4 text-[#64748B]" />
                              <p className="text-sm text-[#64748B]">
                                {building.address}
                              </p>
                            </div>
                          </div>
                          {building.is_hrb && (
                            <BlocIQBadge variant="destructive" size="sm">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              High-Risk Building
                            </BlocIQBadge>
                          )}
                        </div>

                        {/* Building Info */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#64748B]">Building ID:</span>
                            <span className="font-mono text-[#333333]">
                              {building.id.slice(0, 8)}...
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#64748B]">Added:</span>
                            <span className="text-[#333333]">
                              {new Date(building.created_at).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                        </div>

                        {/* Action Indicator */}
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#64748B]">Click to view details</span>
                            <div className="w-6 h-6 bg-[#008C8F] rounded-full flex items-center justify-center group-hover:bg-[#2BBEB4] transition-colors">
                              <Building2 className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </BlocIQCardContent>
                  </a>
                </BlocIQCard>
              ))}
            </div>
          ) : (
            /* Empty State */
            <BlocIQCard variant="elevated">
              <BlocIQCardContent>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#2BBEB4] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                    No Buildings Found
                  </h2>
                  <p className="text-[#64748B] mb-6 max-w-md mx-auto">
                    You haven't added any buildings to your portfolio yet. 
                    Click the "Add Building" button to get started.
                  </p>
                  <BlocIQButton
                    variant="primary"
                    className="bg-gradient-to-r from-[#008C8F] to-[#2BBEB4] hover:from-[#007B8A] hover:to-[#2BBEB4] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Building
                  </BlocIQButton>
                </div>
              </BlocIQCardContent>
            </BlocIQCard>
          )}
        </div>
      </LayoutWithSidebar>
    )

  } catch (error) {
    // Catch-all error handler
    console.error("❌ === UNHANDLED ERROR IN BUILDINGS PAGE ===")
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
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
              Unexpected Error
            </h1>
            <p className="text-gray-600 text-center mb-6">
              An unexpected error occurred while loading the buildings page.
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