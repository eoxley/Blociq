import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Building2, AlertTriangle, RefreshCw } from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingCommandCentre from './BuildingCommandCentre'
import ErrorBoundary from '@/components/ErrorBoundary'

export default async function BuildingDetailPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  try {
    const { buildingId } = await params
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    // Validate buildingId immediately
    if (!buildingId || buildingId.trim().length === 0) {
      console.error('❌ No building ID provided or invalid building ID')
      return (
        <ErrorBoundary>
          <LayoutWithSidebar>
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
              <div className="max-w-md mx-auto text-center p-8">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                    Invalid Building
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
        </ErrorBoundary>
      )
    }

    console.log('🔍 Fetching building details for ID:', buildingId)
    
    // Secure the route using Supabase Auth
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      redirect('/login')
    }

    // Try to fetch building by ID with enhanced error handling
    let building = null
    let buildingError = null

    try {
      // First, try as integer ID
      if (/^\d+$/.test(buildingId)) {
        const { data, error } = await supabase
          .from('buildings')
          .select('*')
          .eq('id', parseInt(buildingId))
          .single()
        
        building = data
        buildingError = error
      } else {
        // If not an integer, try as UUID (in case there's a UUID column)
        const { data, error } = await supabase
          .from('buildings')
          .select('*')
          .eq('id', buildingId)
          .single()
        
        building = data
        buildingError = error
      }
    } catch (error) {
      console.error('❌ Unexpected error fetching building:', error)
      buildingError = error instanceof Error ? error : new Error('Unknown error occurred')
    }

    if (buildingError) {
      console.error('❌ Error fetching building:', buildingError)
      return (
        <ErrorBoundary>
          <LayoutWithSidebar>
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
              <div className="max-w-md mx-auto text-center p-8">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                    Could Not Load Building
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
        </ErrorBoundary>
      )
    }

    if (!building) {
      console.error('❌ Building not found for ID:', buildingId)
      return (
        <ErrorBoundary>
          <LayoutWithSidebar>
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
              <div className="max-w-md mx-auto text-center p-8">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                    Building Not Found
                  </h2>
                  <p className="text-gray-600 mb-6">
                    The building you're looking for doesn't exist or you don't have permission to view it.
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
        </ErrorBoundary>
      )
    }

    console.log('✅ Building found:', building.name)

    // Initialize empty data structures to prevent undefined errors
    const buildingData: any = {
      building: building || {},
      buildingSetup: {},
      complianceSummary: { total: 0, compliant: 0, dueSoon: 0, overdue: 0 },
      complianceAssets: [],
      units: [],
      recentEmails: [],
      complianceDocs: [],
      buildingDocs: [],
      events: [],
      todos: []
    }

    // Try to fetch additional data with individual error handling
    try {
      const { data: buildingSetup } = await supabase
        .from('building_setup')
        .select('*')
        .eq('building_id', building.id)
        .single()
      
      if (buildingSetup) {
        buildingData.buildingSetup = buildingSetup
      }
    } catch (error) {
      console.warn('⚠️ Error fetching building setup:', error)
    }

    try {
      const { data: complianceAssets } = await supabase
        .from('building_compliance_assets')
        .select(`
          *,
          compliance_assets (
            name,
            category
          )
        `)
        .eq('building_id', building.id)

      if (complianceAssets) {
        buildingData.complianceAssets = complianceAssets
        
        // Calculate compliance summary
        const now = new Date()
        buildingData.complianceSummary = {
          total: complianceAssets.length,
          compliant: complianceAssets.filter(asset => asset?.status === 'compliant').length,
          dueSoon: complianceAssets.filter(asset => {
            if (!asset?.next_due_date) return false
            try {
              const dueDate = new Date(asset.next_due_date)
              const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              return daysUntilDue <= 30 && daysUntilDue > 0
            } catch (error) {
              return false
            }
          }).length,
          overdue: complianceAssets.filter(asset => {
            if (!asset?.next_due_date) return false
            try {
              const dueDate = new Date(asset.next_due_date)
              return dueDate < now
            } catch (error) {
              return false
            }
          }).length
        }
        
        console.log('✅ Compliance assets loaded:', complianceAssets.length, 'assets')
      }
    } catch (error) {
      console.warn('⚠️ Error fetching compliance assets:', error)
    }

    try {
      const { data: units } = await supabase
        .from('units')
        .select(`
          *,
          leaseholders (
            id,
            name,
            email,
            phone
          ),
          leases (
            id,
            start_date,
            expiry_date,
            doc_type,
            is_headlease
          )
        `)
        .eq('building_id', building.id)
        .order('unit_number')

      if (units) {
        buildingData.units = units
      }
    } catch (error) {
      console.warn('⚠️ Error fetching units:', error)
    }

    try {
      const { data: recentEmails } = await supabase
        .from('incoming_emails')
        .select('*')
        .eq('building_id', building.id)
        .order('received_at', { ascending: false })
        .limit(5)

      if (recentEmails) {
        buildingData.recentEmails = recentEmails
      }
    } catch (error) {
      console.warn('⚠️ Error fetching recent emails:', error)
    }

    try {
      const { data: complianceDocs } = await supabase
        .from('compliance_documents')
        .select('*')
        .eq('building_id', building.id)
        .order('extracted_date', { ascending: false })
        .limit(5)

      if (complianceDocs) {
        buildingData.complianceDocs = complianceDocs
      }
    } catch (error) {
      console.warn('⚠️ Error fetching compliance docs:', error)
    }

    try {
      const { data: buildingDocs } = await supabase
        .from('building_documents')
        .select('*')
        .eq('building_id', building.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (buildingDocs) {
        buildingData.buildingDocs = buildingDocs
      }
    } catch (error) {
      console.warn('⚠️ Error fetching building docs:', error)
    }

    try {
      const { data: events } = await supabase
        .from('property_events')
        .select('*')
        .eq('building_id', building.id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5)

      if (events) {
        buildingData.events = events
      }
    } catch (error) {
      console.warn('⚠️ Error fetching events:', error)
    }

    try {
      const { data: todos } = await supabase
        .from('building_todos')
        .select('*')
        .eq('building_id', building.id)
        .order('due_date', { ascending: true })
        .limit(10)

      if (todos) {
        buildingData.todos = todos
      }
    } catch (error) {
      console.warn('⚠️ Error fetching todos:', error)
    }

    console.log('✅ Building data prepared successfully for:', building.name)

    return (
      <ErrorBoundary>
        <LayoutWithSidebar>
          <div className="space-y-6">
            {/* Clean Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {building.name || 'Building Details'}
              </h1>
              {building.address && (
                <p className="text-gray-600 text-lg">{building.address}</p>
              )}
            </div>

            {/* Building Command Centre Component */}
            <BuildingCommandCentre buildingData={buildingData} />
          </div>
        </LayoutWithSidebar>
      </ErrorBoundary>
    )
  } catch (error) {
    console.error('❌ Unexpected error in building detail page:', error)
    return (
      <ErrorBoundary>
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="max-w-md mx-auto text-center p-8">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                  Something Went Wrong
                </h2>
                <p className="text-gray-600 mb-6">
                  We encountered an unexpected error while loading the building information. Please try again later.
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
      </ErrorBoundary>
    )
  }
} 