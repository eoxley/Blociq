import React from 'react'
import { createClient } from '@supabase/supabase-js'
import { Shield } from 'lucide-react'
import ComplianceSetupClient from './ComplianceSetupClient'

export default async function ComplianceSetupPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  console.log("🔍 === COMPLIANCE SETUP PAGE START ===")
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
      )
    }

    if (buildingResult.error) {
      console.error("❌ Building query response error:", buildingResult.error)
      return (
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
      )
    }

    if (!buildingResult.data) {
      console.error("❌ No building found for ID:", buildingId)
      return (
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
      )
    }

    const building = buildingResult.data
    console.log("✅ Building found:", building)

    // 5. Fetch all compliance assets (master list)
    console.log("🔍 Fetching all compliance assets...")
    let allAssetsResult
    try {
      allAssetsResult = await supabase
        .from("compliance_assets")
        .select("id, name, category, description, recommended_frequency")
        .order("category")
        .order("name")
      
      console.log("✅ All assets query completed")
      console.log("All assets result:", allAssetsResult)
    } catch (err) {
      console.error("❌ All assets query error:", err)
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
              Assets Query Error
            </h1>
            <p className="text-gray-600 text-center mb-6">
              Failed to fetch compliance assets.
            </p>
          </div>
        </div>
      )
    }

    if (allAssetsResult.error) {
      console.error("❌ All assets query response error:", allAssetsResult.error)
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
              Assets Query Response Error
            </h1>
            <p className="text-gray-600 text-center mb-6">
              Supabase returned an error for assets query.
            </p>
          </div>
        </div>
      )
    }

    const allAssets = allAssetsResult.data || []
    console.log("✅ All assets found:", allAssets.length, "items")

    // 6. Fetch existing selected assets for this building
    console.log("🔍 Fetching existing selected assets for building:", building.id)
    let existingAssetsResult
    try {
      existingAssetsResult = await supabase
        .from("building_compliance_assets")
        .select("asset_id, status")
        .eq("building_id", building.id)
        .eq("status", "pending")
      
      console.log("✅ Existing assets query completed")
      console.log("Existing assets result:", existingAssetsResult)
    } catch (err) {
      console.error("❌ Existing assets query error:", err)
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
              Existing Assets Query Error
            </h1>
            <p className="text-gray-600 text-center mb-6">
              Failed to fetch existing compliance assets.
            </p>
          </div>
        </div>
      )
    }

    if (existingAssetsResult.error) {
      console.error("❌ Existing assets query response error:", existingAssetsResult.error)
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
              Existing Assets Query Response Error
            </h1>
            <p className="text-gray-600 text-center mb-6">
              Supabase returned an error for existing assets query.
            </p>
          </div>
        </div>
      )
    }

    const existingAssets = existingAssetsResult.data || []
    const existingAssetIds = new Set(existingAssets.map(asset => asset.asset_id))
    console.log("✅ Existing assets found:", existingAssets.length, "items")

    // 7. Group assets by category and mark existing selections
    const groupedAssets = allAssets.reduce((acc: any, asset: any) => {
      const category = asset.category || 'Other'
      if (!acc[category]) {
        acc[category] = []
      }
      
      // Mark if this asset is already selected for this building
      const isSelected = existingAssetIds.has(asset.id)
      
      acc[category].push({
        ...asset,
        isSelected
      })
      
      return acc
    }, {})

    console.log("✅ Assets grouped by category:", Object.keys(groupedAssets))

        // 8. Render the main compliance setup page with BlocIQ branding
    console.log("✅ All queries successful - rendering page")
    console.log("=== COMPLIANCE SETUP PAGE END ===")

    return (
      <ComplianceSetupClient 
        building={building}
        groupedAssets={groupedAssets}
        buildingId={buildingId}
      />
    )

  } catch (error) {
    // 10. Catch-all error handler
    console.error("❌ === UNHANDLED ERROR IN COMPLIANCE SETUP PAGE ===")
    console.error("Error:", error)
    console.error("Error type:", typeof error)
    console.error("Error constructor:", error?.constructor?.name)
    console.error("Error message:", error instanceof Error ? error.message : 'No message')
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack')
    console.error("=== END UNHANDLED ERROR ===")

    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
            Unexpected Error
          </h1>
          <p className="text-gray-600 text-center mb-6">
            An unexpected error occurred while loading the compliance setup page.
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
    )
  }
} 