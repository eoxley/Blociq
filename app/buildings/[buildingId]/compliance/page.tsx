import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Shield, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'

export default async function BuildingCompliancePage({ 
  params 
}: { 
  params: { buildingId: string } 
}) {
  const buildingId = params.buildingId

  // Validate buildingId immediately
  if (!buildingId || buildingId.trim().length === 0) {
    return (
      <LayoutWithSidebar>
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                Error: Missing Building ID
              </h2>
              <p className="text-gray-600 mb-6">
                The building ID provided is invalid or missing. Please check the URL and try again.
              </p>
              <button
                onClick={() => window.location.href = '/buildings'}
                className="w-full bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                View All Buildings
              </button>
            </div>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }

  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // Secure the route using Supabase Auth
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  try {
    // Fetch building details first
    let building = null
    console.log('🔍 Attempting to fetch building with ID:', buildingId, 'Type:', typeof buildingId)
    
    try {
      if (/^\d+$/.test(buildingId)) {
        // If it's a numeric ID, try as integer
        console.log('🔢 Treating as integer ID:', parseInt(buildingId))
        const { data, error } = await supabase
          .from('buildings')
          .select('*')
          .eq('id', parseInt(buildingId))
          .maybeSingle()

        if (error) {
          console.error('❌ Integer query error:', error)
          throw error
        }
        building = data
        console.log('✅ Integer query result:', building)
      } else {
        // If it's not numeric, try as UUID
        console.log('🔑 Treating as UUID:', buildingId)
        const { data, error } = await supabase
          .from('buildings')
          .select('*')
          .eq('id', buildingId)
          .maybeSingle()

        if (error) {
          console.error('❌ UUID query error:', error)
          throw error
        }
        building = data
        console.log('✅ UUID query result:', building)
      }
      
      if (!building) {
        console.error('❌ No building found for ID:', buildingId)
        return (
          <LayoutWithSidebar>
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
              <div className="max-w-md mx-auto text-center p-8">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                    Building Not Found
                  </h2>
                  <p className="text-gray-600 mb-6">
                    The building with ID "{buildingId}" doesn't exist or you don't have permission to view it.
                  </p>
                  <button
                    onClick={() => window.location.href = '/buildings'}
                    className="w-full bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                  >
                    View All Buildings
                  </button>
                </div>
              </div>
            </div>
          </LayoutWithSidebar>
        )
      }
    } catch (error) {
      console.error('❌ Error fetching building:', error)
      return (
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="max-w-md mx-auto text-center p-8">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                  Error Loading Building
                </h2>
                <p className="text-gray-600 mb-6">
                  We encountered an error while loading the building information. Please try again later.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                  >
                    Try Again
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
          </div>
        </LayoutWithSidebar>
      )
    }

    // Fetch compliance assets with safe query
    const { data, error } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        status,
        next_due_date,
        last_renewed_date,
        compliance_assets (
          name,
          category,
          description,
          recommended_frequency
        )
      `)
      .eq('building_id', building.id)
      .eq('status', 'active')

    if (error) {
      console.error('❌ Supabase fetch error:', error)
      return (
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="max-w-md mx-auto text-center p-8">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                  Could Not Load Compliance Data
                </h2>
                <p className="text-gray-600 mb-6">
                  We encountered an error while loading the compliance information for {building.name}. Please try again later.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    if (!data || data.length === 0) {
      return (
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="max-w-md mx-auto text-center p-8">
              <div className="bg-white rounded-2xl shadow-lg p-8">
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
          </div>
        </LayoutWithSidebar>
      )
    }

         // Group compliance assets by category
     const groupedAssets = data.reduce((acc: any, asset: any) => {
       const category = asset.compliance_assets?.category || 'Other'
       if (!acc[category]) {
         acc[category] = []
       }
       acc[category].push(asset)
       return acc
     }, {})

    // Helper function to format dates
    const formatDate = (dateString: string | null) => {
      if (!dateString) return 'Not set'
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    }

    // Helper function to get status badge
    const getStatusBadge = (nextDueDate: string | null) => {
      if (!nextDueDate) return { variant: 'secondary' as const, text: 'No due date' }
      
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
    }

    return (
      <LayoutWithSidebar>
        <div className="min-h-screen bg-[#FAFAFA] p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-[#333333] mb-2">
              Compliance Tracker
            </h1>
            <p className="text-[#64748B]">
              {building.name} • {Object.keys(groupedAssets).length} categories • {data.length} active assets
            </p>
          </div>

          {/* Compliance Categories */}
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
        </div>
      </LayoutWithSidebar>
    )

  } catch (err) {
    console.error('❌ Unhandled error:', err)
    return (
      <LayoutWithSidebar>
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                Unexpected Error Loading Compliance Page
              </h2>
              <p className="text-gray-600 mb-6">
                We encountered an unexpected error. Please try again later or contact support.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                >
                  Try Again
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
        </div>
      </LayoutWithSidebar>
    )
  }
}