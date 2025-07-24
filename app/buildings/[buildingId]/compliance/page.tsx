import React from 'react'
import { createClient } from '@supabase/supabase-js'

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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-xl font-bold text-red-600 mb-4">Error: Missing Building ID</h1>
            <p className="text-gray-600">No building ID provided in the URL parameters.</p>
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-xl font-bold text-red-600 mb-4">Configuration Error</h1>
            <p className="text-gray-600">Missing Supabase environment variables.</p>
            <p className="text-sm text-gray-500 mt-2">URL: {!!supabaseUrl}, Key: {!!supabaseServiceKey}</p>
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-xl font-bold text-red-600 mb-4">Database Connection Error</h1>
            <p className="text-gray-600">Failed to create Supabase client.</p>
            <p className="text-sm text-gray-500 mt-2">Error: {err instanceof Error ? err.message : String(err)}</p>
          </div>
        </div>
      )
    }

    // 4. Test building query
    console.log("🔍 Testing building query for ID:", buildingId)
    let buildingResult
    try {
      buildingResult = await supabase
        .from("buildings")
        .select("id, name")
        .eq("id", buildingId)
        .maybeSingle()
      
      console.log("✅ Building query completed")
      console.log("Building result:", buildingResult)
    } catch (err) {
      console.error("❌ Building query error:", err)
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-xl font-bold text-red-600 mb-4">Building Query Error</h1>
            <p className="text-gray-600">Failed to fetch building data.</p>
            <p className="text-sm text-gray-500 mt-2">Error: {err instanceof Error ? err.message : String(err)}</p>
          </div>
        </div>
      )
    }

    if (buildingResult.error) {
      console.error("❌ Building query response error:", buildingResult.error)
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-xl font-bold text-red-600 mb-4">Building Query Response Error</h1>
            <p className="text-gray-600">Supabase returned an error for building query.</p>
            <p className="text-sm text-gray-500 mt-2">Error: {buildingResult.error.message}</p>
          </div>
        </div>
      )
    }

    if (!buildingResult.data) {
      console.error("❌ No building found for ID:", buildingId)
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-xl font-bold text-red-600 mb-4">Building Not Found</h1>
            <p className="text-gray-600">No building found with ID: {buildingId}</p>
          </div>
        </div>
      )
    }

    console.log("✅ Building found:", buildingResult.data)

    // 5. Test compliance assets query
    console.log("🔍 Testing compliance assets query...")
    let complianceResult
    try {
      complianceResult = await supabase
        .from("building_compliance_assets")
        .select("id")
        .eq("building_id", buildingId)
        .limit(1)
      
      console.log("✅ Compliance assets query completed")
      console.log("Compliance result:", complianceResult)
    } catch (err) {
      console.error("❌ Compliance assets query error:", err)
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-xl font-bold text-red-600 mb-4">Compliance Query Error</h1>
            <p className="text-gray-600">Failed to fetch compliance assets data.</p>
            <p className="text-sm text-gray-500 mt-2">Error: {err instanceof Error ? err.message : String(err)}</p>
          </div>
        </div>
      )
    }

    if (complianceResult.error) {
      console.error("❌ Compliance assets query response error:", complianceResult.error)
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-xl font-bold text-red-600 mb-4">Compliance Query Response Error</h1>
            <p className="text-gray-600">Supabase returned an error for compliance assets query.</p>
            <p className="text-sm text-gray-500 mt-2">Error: {complianceResult.error.message}</p>
          </div>
        </div>
      )
    }

    console.log("✅ Compliance assets found:", complianceResult.data?.length || 0, "items")

    // 6. Success - render minimal page
    console.log("✅ All queries successful - rendering page")
    console.log("=== BUILDING COMPLIANCE PAGE END ===")

    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Compliance Page - Debug Mode</h1>
            
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <h2 className="font-semibold text-green-800">✅ Success</h2>
                <p className="text-green-700">All database queries completed successfully</p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <h2 className="font-semibold text-blue-800">📊 Data Summary</h2>
                <ul className="text-blue-700 space-y-1">
                  <li><strong>Building ID:</strong> {buildingId}</li>
                  <li><strong>Building Name:</strong> {buildingResult.data.name}</li>
                  <li><strong>Compliance Assets:</strong> {complianceResult.data?.length || 0} found</li>
                </ul>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                <h2 className="font-semibold text-gray-800">🔧 Technical Details</h2>
                <ul className="text-gray-700 space-y-1 text-sm">
                  <li><strong>Supabase URL:</strong> {supabaseUrl ? 'Configured' : 'Missing'}</li>
                  <li><strong>Service Key:</strong> {supabaseServiceKey ? 'Configured' : 'Missing'}</li>
                  <li><strong>Building Query:</strong> Success</li>
                  <li><strong>Compliance Query:</strong> Success</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    )

  } catch (error) {
    // 7. Catch-all error handler
    console.error("❌ === UNHANDLED ERROR IN BUILDING COMPLIANCE PAGE ===")
    console.error("Error:", error)
    console.error("Error type:", typeof error)
    console.error("Error constructor:", error?.constructor?.name)
    console.error("Error message:", error instanceof Error ? error.message : 'No message')
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack')
    console.error("=== END UNHANDLED ERROR ===")

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">Unexpected Error</h1>
          <p className="text-gray-600 mb-4">An unexpected error occurred while loading the page.</p>
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