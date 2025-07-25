import React from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  Building2, 
  MapPin, 
  Shield, 
  AlertTriangle, 
  Users, 
  FileText, 
  CheckSquare, 
  Hammer, 
  BookOpen, 
  Brain,
  Calendar,
  Key,
  Car,
  Zap,
  Phone
} from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { BlocIQButton } from '@/components/ui/blociq-button'

export default async function BuildingDetailPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  console.log("🔍 === BUILDING DETAIL PAGE START ===")
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
                <Building2 className="h-8 w-8 text-white" />
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

    // 4. Fetch building details
    console.log("🔍 Fetching building details for ID:", buildingId)
    let buildingResult
    try {
      buildingResult = await supabase
        .from("buildings")
        .select("*")
        .eq("id", buildingId)
        .maybeSingle()
      
      console.log("✅ Building query completed")
      console.log("Building result:", buildingResult)
      
      if (buildingResult.error) {
        console.error("❌ Supabase building query failed:", buildingResult.error)
        throw new Error(`Supabase building query failed: ${buildingResult.error.message}`)
      }
      
    } catch (err) {
      console.error("⚠️ Building detail page error:", err)
      return (
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
                Building Query Error
              </h1>
              <p className="text-gray-600 text-center mb-6">
                There was an issue loading building data. Please check your Supabase table or contact support.
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

    if (!buildingResult.data) {
      console.error("❌ No building found for ID:", buildingId)
      return (
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-8 w-8 text-white" />
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

    // 5. Fetch related data
    console.log("🔍 Fetching related data for building:", building.id)
    
    // Fetch units and leaseholders
    const unitsResult = await supabase
      .from("units")
      .select(`
        id,
        unit_number,
        floor,
        type,
        leaseholder_email,
        leaseholders (
          id,
          name,
          email
        )
      `)
      .eq("building_id", building.id)
      .order("unit_number")

    // Fetch compliance summary
    const complianceResult = await supabase
      .from("building_compliance_assets")
      .select(`
        id,
        status,
        compliance_asset:compliance_assets (
          name,
          category
        )
      `)
      .eq("building_id", building.id)

    // Fetch latest documents
    const documentsResult = await supabase
      .from("building_documents")
      .select("*")
      .eq("building_id", building.id)
      .order("created_at", { ascending: false })
      .limit(3)

    // Fetch tasks
    const tasksResult = await supabase
      .from("building_tasks")
      .select("*")
      .eq("building_id", building.id)
      .order("due_date")
      .limit(5)

    // Fetch major works
    const majorWorksResult = await supabase
      .from("major_works")
      .select("*")
      .eq("building_id", building.id)
      .order("start_date", { ascending: false })
      .limit(3)

    // Fetch latest diary entries
    const diaryResult = await supabase
      .from("diary_entries")
      .select("*")
      .eq("building_id", building.id)
      .order("created_at", { ascending: false })
      .limit(3)

    console.log("✅ All related data queries completed")

    // Process data
    const units = unitsResult.data || []
    const complianceAssets = complianceResult.data || []
    const documents = documentsResult.data || []
    const tasks = tasksResult.data || []
    const majorWorks = majorWorksResult.data || []
    const diaryEntries = diaryResult.data || []

    // Calculate compliance summary
    const complianceSummary = {
      total: complianceAssets.length,
      compliant: complianceAssets.filter(asset => asset.status === 'Compliant').length,
      overdue: complianceAssets.filter(asset => asset.status === 'Overdue').length,
      missing: complianceAssets.filter(asset => asset.status === 'Missing').length
    }

    console.log("✅ Data processing completed")
    console.log("=== BUILDING DETAIL PAGE END ===")

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
                    <h1 className="text-3xl font-serif font-bold">{building.name}</h1>
                    <p className="text-white/90 text-lg">{building.address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {building.is_hrb && (
                        <BlocIQBadge variant="destructive" size="sm" className="bg-red-500/20 text-white border-red-300">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          High-Risk Building
                        </BlocIQBadge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{units.length}</div>
                <div className="text-white/80 text-sm">Units</div>
              </div>
            </div>
          </div>

          {/* Building Information */}
          <BlocIQCard variant="elevated">
            <BlocIQCardHeader>
              <h2 className="text-2xl font-serif font-semibold text-[#333333]">Building Information</h2>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {building.notes && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[#64748B]" />
                      <span className="text-sm font-medium text-[#64748B]">Notes</span>
                    </div>
                    <p className="text-[#333333]">{building.notes}</p>
                  </div>
                )}
                
                {building.key_access_notes && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-[#64748B]" />
                      <span className="text-sm font-medium text-[#64748B]">Key Access</span>
                    </div>
                    <p className="text-[#333333]">{building.key_access_notes}</p>
                  </div>
                )}
                
                {building.parking_notes && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-[#64748B]" />
                      <span className="text-sm font-medium text-[#64748B]">Parking</span>
                    </div>
                    <p className="text-[#333333]">{building.parking_notes}</p>
                  </div>
                )}
                
                {building.entry_code && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[#64748B]" />
                      <span className="text-sm font-medium text-[#64748B]">Entry Code</span>
                    </div>
                    <p className="text-[#333333] font-mono">{building.entry_code}</p>
                  </div>
                )}
                
                {building.fire_panel_location && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[#64748B]" />
                      <span className="text-sm font-medium text-[#64748B]">Fire Panel</span>
                    </div>
                    <p className="text-[#333333]">{building.fire_panel_location}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#64748B]" />
                    <span className="text-sm font-medium text-[#64748B]">Added</span>
                  </div>
                  <p className="text-[#333333]">
                    {new Date(building.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>
            </BlocIQCardContent>
          </BlocIQCard>

          {/* Compliance Status */}
          <BlocIQCard variant="elevated">
            <BlocIQCardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-semibold text-[#333333]">Compliance Tracker</h2>
                <a 
                  href={`/buildings/${buildingId}/compliance`}
                  className="text-[#008C8F] hover:text-[#2BBEB4] font-medium"
                >
                  View All →
                </a>
              </div>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              {complianceSummary.total > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="text-2xl font-bold text-green-600">{complianceSummary.compliant}</div>
                    <div className="text-sm text-green-700">Compliant</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <div className="text-2xl font-bold text-red-600">{complianceSummary.overdue}</div>
                    <div className="text-sm text-red-700">Overdue</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-xl">
                    <div className="text-2xl font-bold text-yellow-600">{complianceSummary.missing}</div>
                    <div className="text-sm text-yellow-700">Missing</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-600">{complianceSummary.total}</div>
                    <div className="text-sm text-gray-700">Total</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-[#64748B] mb-4">No compliance assets assigned yet</p>
                  <a 
                    href={`/buildings/${buildingId}/compliance/setup`}
                    className="inline-flex items-center px-4 py-2 bg-[#008C8F] text-white rounded-lg hover:bg-[#2BBEB4] transition-colors"
                  >
                    Set Up Compliance
                  </a>
                </div>
              )}
            </BlocIQCardContent>
          </BlocIQCard>

          {/* Units & Leaseholders */}
          <BlocIQCard variant="elevated">
            <BlocIQCardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-semibold text-[#333333]">Units & Leaseholders</h2>
                <span className="text-sm text-[#64748B]">{units.length} units</span>
              </div>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              {units.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {units.map((unit) => (
                    <div key={unit.id} className="p-4 border border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-[#333333]">Unit {unit.unit_number}</h3>
                        <BlocIQBadge variant="secondary" size="sm">{unit.type}</BlocIQBadge>
                      </div>
                      <p className="text-sm text-[#64748B] mb-2">Floor {unit.floor}</p>
                      {unit.leaseholders && unit.leaseholders.length > 0 ? (
                        <div className="space-y-1">
                          {unit.leaseholders.map((leaseholder) => (
                            <div key={leaseholder.id} className="text-sm">
                              <span className="font-medium text-[#333333]">{leaseholder.name}</span>
                              <br />
                              <span className="text-[#64748B]">{leaseholder.email}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#64748B]">No leaseholder assigned</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-[#64748B]">No units added yet</p>
                </div>
              )}
            </BlocIQCardContent>
          </BlocIQCard>

          {/* Latest Documents */}
          <BlocIQCard variant="elevated">
            <BlocIQCardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-semibold text-[#333333]">Latest Documents</h2>
                <span className="text-sm text-[#64748B]">{documents.length} recent</span>
              </div>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-[#64748B]" />
                        <div>
                          <p className="font-medium text-[#333333]">{doc.file_name}</p>
                          <p className="text-sm text-[#64748B]">
                            {doc.type} • {new Date(doc.created_at).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                      <BlocIQBadge variant="secondary" size="sm">{doc.uploaded_by}</BlocIQBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-[#64748B]">No documents uploaded yet</p>
                </div>
              )}
            </BlocIQCardContent>
          </BlocIQCard>

          {/* Tasks */}
          <BlocIQCard variant="elevated">
            <BlocIQCardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-semibold text-[#333333]">Building Tasks</h2>
                <span className="text-sm text-[#64748B]">{tasks.length} tasks</span>
              </div>
            </BlocIQCardHeader>
            <BlocIQCardContent>
              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckSquare className="h-5 w-5 text-[#64748B]" />
                        <div>
                          <p className="font-medium text-[#333333]">{task.task}</p>
                          <p className="text-sm text-[#64748B]">
                            Due: {task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB') : 'No due date'}
                          </p>
                        </div>
                      </div>
                      <BlocIQBadge 
                        variant={
                          task.status === 'Complete' ? 'success' : 
                          task.status === 'In Progress' ? 'warning' : 'secondary'
                        } 
                        size="sm"
                      >
                        {task.status}
                      </BlocIQBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-[#64748B]">No tasks created yet</p>
                </div>
              )}
            </BlocIQCardContent>
          </BlocIQCard>

          {/* Major Works */}
          {majorWorks.length > 0 && (
            <BlocIQCard variant="elevated">
              <BlocIQCardHeader>
                <h2 className="text-2xl font-serif font-semibold text-[#333333]">Major Works</h2>
              </BlocIQCardHeader>
              <BlocIQCardContent>
                <div className="space-y-3">
                  {majorWorks.map((work) => (
                    <div key={work.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Hammer className="h-5 w-5 text-[#64748B]" />
                        <div>
                          <p className="font-medium text-[#333333]">{work.title}</p>
                          <p className="text-sm text-[#64748B]">
                            {work.consultation_stage} • {work.start_date ? new Date(work.start_date).toLocaleDateString('en-GB') : 'No start date'}
                          </p>
                        </div>
                      </div>
                      <BlocIQBadge variant="secondary" size="sm">{work.status}</BlocIQBadge>
                    </div>
                  ))}
                </div>
              </BlocIQCardContent>
            </BlocIQCard>
          )}

          {/* Diary Entries */}
          {diaryEntries.length > 0 && (
            <BlocIQCard variant="elevated">
              <BlocIQCardHeader>
                <h2 className="text-2xl font-serif font-semibold text-[#333333]">Latest Diary Entries</h2>
              </BlocIQCardHeader>
              <BlocIQCardContent>
                <div className="space-y-3">
                  {diaryEntries.map((entry) => (
                    <div key={entry.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <BookOpen className="h-5 w-5 text-[#64748B]" />
                        <span className="text-sm text-[#64748B]">
                          {new Date(entry.created_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <p className="text-[#333333]">{entry.entry_text}</p>
                    </div>
                  ))}
                </div>
              </BlocIQCardContent>
            </BlocIQCard>
          )}

          {/* AI Summary Button */}
          <BlocIQCard variant="elevated">
            <BlocIQCardContent>
              <div className="text-center py-6">
                <h3 className="text-xl font-serif font-semibold text-[#333333] mb-4">
                  AI Building Summary
                </h3>
                <p className="text-[#64748B] mb-6">
                  Get an AI-powered summary of this building's key information, compliance status, and recommendations.
                </p>
                <BlocIQButton
                  variant="primary"
                  className="bg-gradient-to-r from-[#008C8F] to-[#2BBEB4] hover:from-[#007B8A] hover:to-[#2BBEB4] text-white"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Summarise This Building
                </BlocIQButton>
              </div>
            </BlocIQCardContent>
          </BlocIQCard>
        </div>
      </LayoutWithSidebar>
    )

  } catch (error) {
    // Catch-all error handler
    console.error("❌ === UNHANDLED ERROR IN BUILDING DETAIL PAGE ===")
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
              An unexpected error occurred while loading the building details.
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