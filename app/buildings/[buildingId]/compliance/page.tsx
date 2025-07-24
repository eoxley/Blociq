import React from 'react'
import { createClient } from '@supabase/supabase-js'
import { Shield, Calendar, AlertTriangle, CheckCircle, Home, RefreshCw } from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'

// Fallback UI component for errors
function ComplianceErrorFallback({ 
  title, 
  message, 
  buildingId, 
  error 
}: { 
  title: string
  message: string
  buildingId?: string
  error?: any
}) {
  console.error('🔴 Compliance page error:', { title, message, buildingId, error })
  
  return (
    <LayoutWithSidebar>
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
              {title}
            </h2>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/buildings'}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Home className="h-4 w-4" />
                View All Buildings
              </button>
            </div>
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  )
}

// Loading state component
function ComplianceLoadingState() {
  return (
    <LayoutWithSidebar>
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-[#2BBEB4] rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
              Loading Compliance Data
            </h2>
            <p className="text-gray-600 mb-6">
              Please wait while we fetch the compliance information...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2BBEB4]"></div>
            </div>
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  )
}

export default async function BuildingCompliancePage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  try {
    // 1. Validate params safely
    const resolvedParams = await params
    const buildingId = resolvedParams?.buildingId

    console.log('🔍 Building compliance page - buildingId:', buildingId)

    // 2. Validate buildingId
    if (!buildingId || typeof buildingId !== 'string' || buildingId.trim().length === 0) {
      console.error('❌ Invalid buildingId:', buildingId)
      return (
        <ComplianceErrorFallback
          title="Invalid Building ID"
          message="The building ID provided is invalid or missing. Please check the URL and try again."
          buildingId={buildingId}
        />
      )
    }

    // 3. Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables')
      return (
        <ComplianceErrorFallback
          title="Configuration Error"
          message="The application is not properly configured. Please contact support."
          buildingId={buildingId}
        />
      )
    }

    // 4. Create Supabase client with service role key
    let supabase
    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey)
      console.log('✅ Supabase client created successfully')
    } catch (error) {
      console.error('❌ Failed to create Supabase client:', error)
      return (
        <ComplianceErrorFallback
          title="Database Connection Error"
          message="Unable to connect to the database. Please try again later."
          buildingId={buildingId}
          error={error}
        />
      )
    }

    // 5. Fetch building details with error handling
    console.log('🔍 Fetching building with UUID:', buildingId)
    
    let building = null
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, address, unit_count')
        .eq('id', buildingId)
        .maybeSingle()

      if (error) {
        console.error('❌ Building query error:', error)
        throw error
      }

      building = data
      console.log('✅ Building query result:', building)

      if (!building) {
        console.error('❌ No building found for ID:', buildingId)
        return (
          <ComplianceErrorFallback
            title="Building Not Found"
            message={`The building with UUID "${buildingId}" doesn't exist or you don't have permission to view it.`}
            buildingId={buildingId}
          />
        )
      }
    } catch (error) {
      console.error('❌ Error fetching building:', error)
      return (
        <ComplianceErrorFallback
          title="Error Loading Building"
          message="We encountered an error while loading the building information. Please try again later."
          buildingId={buildingId}
          error={error}
        />
      )
    }

    // 6. Fetch compliance assets with error handling
    console.log('🔍 Fetching compliance assets for building:', building.id)
    
    let complianceAssets = []
    try {
      const { data, error } = await supabase
        .from('building_compliance_assets')
        .select(`
          id,
          status,
          next_due_date,
          last_renewed_date,
          notes,
          compliance_assets (
            id,
            name,
            category,
            description,
            recommended_frequency
          )
        `)
        .eq('building_id', building.id)
        .eq('status', 'active')

      if (error) {
        console.error('❌ Compliance assets query error:', error)
        throw error
      }

      complianceAssets = data || []
      console.log('✅ Compliance assets query result:', complianceAssets.length, 'assets found')
    } catch (error) {
      console.error('❌ Error fetching compliance assets:', error)
      return (
        <ComplianceErrorFallback
          title="Could Not Load Compliance Data"
          message={`We encountered an error while loading the compliance information for ${building.name}. Please try again later.`}
          buildingId={buildingId}
          error={error}
        />
      )
    }

    // 7. Process and group compliance assets
    let groupedAssets = {}
    try {
      groupedAssets = complianceAssets.reduce((acc: any, asset: any) => {
        const category = asset.compliance_assets?.category || 'Other'
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(asset)
        return acc
      }, {})

      console.log('✅ Grouped assets by category:', Object.keys(groupedAssets))
    } catch (error) {
      console.error('❌ Error processing compliance assets:', error)
      return (
        <ComplianceErrorFallback
          title="Data Processing Error"
          message="We encountered an error while processing the compliance data. Please try again later."
          buildingId={buildingId}
          error={error}
        />
      )
    }

    // 8. Helper functions
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

    const getStatusBadge = (nextDueDate: string | null) => {
      if (!nextDueDate) return { variant: 'secondary' as const, text: 'No due date' }
      
      try {
        const dueDate = new Date(nextDueDate)
        const today = new Date()
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntilDue < 0) {
          return { variant: 'destructive' as const, text: 'Overdue' }
        } else if (daysUntilDue <= 30) {
          return { variant: 'warning' as const, text: 'Due Soon' }
        } else {
          return { variant: 'default' as const, text: 'On Track' }
        }
      } catch (error) {
        console.error('❌ Error calculating status:', error)
        return { variant: 'secondary' as const, text: 'Unknown' }
      }
    }

    // 9. Render the main compliance page
    console.log('✅ Rendering compliance page successfully')
    
    return (
      <LayoutWithSidebar>
        <div className="min-h-screen bg-[#FAFAFA] p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-[#333333] mb-2">
              Compliance Tracker
            </h1>
            <p className="text-[#64748B]">
              {building.name} • {Object.keys(groupedAssets).length} categories • {complianceAssets.length} active assets
            </p>
          </div>

          {/* No assets state */}
          {complianceAssets.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-[#2BBEB4] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                  No Active Compliance Assets
                </h2>
                <p className="text-gray-600 mb-6">
                  No active compliance assets found for {building.name}. You may need to set up compliance tracking first.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.href = `/buildings/${buildingId}/compliance/setup`}
                    className="w-full bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                  >
                    Setup Compliance Tracking
                  </button>
                  <button
                    onClick={() => window.location.href = '/buildings'}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                  >
                    View All Buildings
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Compliance Categories */
            <div className="space-y-6">
              {Object.entries(groupedAssets).map(([category, assets]: [string, any]) => (
                <BlocIQCard key={category} variant="elevated">
                  <BlocIQCardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                        <Shield className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-[#333333]">{category}</h2>
                        <p className="text-sm text-[#64748B]">{assets.length} compliance items</p>
                      </div>
                    </div>
                  </BlocIQCardHeader>
                  
                  <BlocIQCardContent>
                    <div className="space-y-4">
                      {assets.map((asset: any) => {
                        const statusBadge = getStatusBadge(asset.next_due_date)
                        const isOverdue = statusBadge.variant === 'destructive'
                        
                        return (
                          <div 
                            key={asset.id} 
                            className={`p-4 rounded-xl border transition-all duration-200 ${
                              isOverdue 
                                ? 'bg-red-50 border-red-200' 
                                : 'bg-gradient-to-r from-[#F0FDFA] to-emerald-50 border-[#E2E8F0]'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-[#333333]">
                                    {asset.compliance_assets?.name || 'Unknown Asset'}
                                  </h3>
                                  <BlocIQBadge variant={statusBadge.variant} size="sm">
                                    {statusBadge.text}
                                  </BlocIQBadge>
                                </div>
                                
                                {asset.compliance_assets?.description && (
                                  <p className="text-sm text-[#64748B] mb-3">
                                    {asset.compliance_assets.description}
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
                                    <AlertTriangle className="h-4 w-4 text-[#64748B]" />
                                    <span className="text-[#64748B]">Next Due:</span>
                                    <span className={`font-medium ${
                                      isOverdue ? 'text-red-600' : 'text-[#333333]'
                                    }`}>
                                      {formatDate(asset.next_due_date)}
                                    </span>
                                  </div>
                                  
                                  {asset.compliance_assets?.recommended_frequency && (
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-[#64748B]" />
                                      <span className="text-[#64748B]">Frequency:</span>
                                      <span className="font-medium text-[#333333]">
                                        {asset.compliance_assets.recommended_frequency}
                                      </span>
                                    </div>
                                  )}
                                </div>
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
          )}
        </div>
      </LayoutWithSidebar>
    )

  } catch (error) {
    // 10. Catch-all error handler
    console.error('❌ Unhandled error in BuildingCompliancePage:', error)
    
    return (
      <ComplianceErrorFallback
        title="Unexpected Error"
        message="We encountered an unexpected error while loading the compliance page. Please try again later or contact support."
        error={error}
      />
    )
  }
}