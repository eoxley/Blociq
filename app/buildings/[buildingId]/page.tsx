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
  Phone,
  ArrowRight,
  User,
  Search,
  Eye
} from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { BlocIQButton } from '@/components/ui/blociq-button'
import SearchableUnitsTable from '@/components/SearchableUnitsTable'
import BuildingInfoClient from '@/components/BuildingInfoClient'
import LeaseholdersTable from '@/components/LeaseholdersTable'

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
    let unitsResult
    try {
      // Use the actual building ID from the building result
      const actualBuildingId = building.id
      console.log("🔍 Using building ID for units query:", actualBuildingId)
      
      unitsResult = await supabase
        .from("units")
        .select(`
          id,
          unit_number,
          floor,
          type,
          leaseholder_id,
          leaseholders (
            id,
            name,
            email
          )
        `)
        .eq("building_id", actualBuildingId)
        .order("unit_number")
        
      console.log("🔍 Units query result:", unitsResult)
      
    } catch (error) {
      console.error("❌ Error fetching units:", error)
      unitsResult = { data: [], error: null }
    }

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
    console.log("🔍 Units query result:", unitsResult)
    console.log("🔍 Units data:", unitsResult.data)

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

    // Extract all leaseholders from units
    const allLeaseholders = units.flatMap(unit => 
      (unit.leaseholders || []).map(leaseholder => ({
        ...leaseholder,
        unit_number: unit.unit_number
      }))
    )

    console.log("✅ Data processing completed")
    console.log("=== BUILDING DETAIL PAGE END ===")

    return (
      <LayoutWithSidebar>
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          {/* Hero Header - Enhanced Landing Page Style */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-12 text-white shadow-2xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            
            <div className="relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                    <Building2 className="h-9 w-9 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{building.name}</h1>
                    <p className="text-white/90 text-xl">{building.address}</p>
                    <div className="flex items-center gap-3 mt-3">
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
            </div>
          </div>

          {/* Building Information - Enhanced Landing Page Style */}
          <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Building Information</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Key details and operational information for {building.name}
              </p>
            </div>
            
            <BuildingInfoClient building={building} />
          </section>

          {/* Compliance Status - Enhanced Landing Page Style */}
          <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Compliance Tracker</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Monitor and track compliance status across all building requirements
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
              {complianceSummary.total > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-200">
                    <div className="text-3xl font-bold text-green-600 mb-2">{complianceSummary.compliant}</div>
                    <div className="text-lg text-green-700 font-medium">Compliant</div>
                  </div>
                  <div className="text-center p-6 bg-red-50 rounded-2xl border border-red-200">
                    <div className="text-3xl font-bold text-red-600 mb-2">{complianceSummary.overdue}</div>
                    <div className="text-lg text-red-700 font-medium">Overdue</div>
                  </div>
                  <div className="text-center p-6 bg-yellow-50 rounded-2xl border border-yellow-200">
                    <div className="text-3xl font-bold text-yellow-600 mb-2">{complianceSummary.missing}</div>
                    <div className="text-lg text-yellow-700 font-medium">Missing</div>
                  </div>
                  <div className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="text-3xl font-bold text-gray-600 mb-2">{complianceSummary.total}</div>
                    <div className="text-lg text-gray-700 font-medium">Total</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 mb-4">No compliance assets assigned yet</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Set up compliance tracking to monitor building requirements and deadlines
                  </p>
                  <a 
                    href={`/buildings/${buildingId}/compliance/setup`}
                    className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    Set Up Compliance
                  </a>
                </div>
              )}
              
              <div className="text-center mt-8 pt-6 border-t border-gray-200">
                <a 
                  href={`/buildings/${buildingId}/compliance`}
                  className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-semibold text-lg"
                >
                  View All Compliance Items
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </section>

          {/* Units & Leaseholders - Enhanced Landing Page Style */}
          <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Units & Leaseholders</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Manage individual units and leaseholder information for {building.name}
              </p>
            </div>
            
            <div className="space-y-8">
              {/* Units Table */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <SearchableUnitsTable units={units} buildingId={buildingId} />
                
                <div className="text-center mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-lg text-gray-600 font-medium">{units.length} units total</span>
                    <a 
                      href={`/buildings/${buildingId}/units`}
                      className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-semibold text-lg"
                    >
                      View All Units
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Leaseholders Table */}
              <LeaseholdersTable buildingId={buildingId} />
            </div>
          </section>



          {/* Latest Documents - Enhanced Landing Page Style */}
          <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest Documents</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Recent documents and files uploaded for {building.name}
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
              {documents.length > 0 ? (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-6 border border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900">{doc.file_name}</p>
                          <p className="text-gray-600">
                            {doc.type} • {new Date(doc.created_at).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                      <BlocIQBadge variant="secondary" size="sm">{doc.uploaded_by}</BlocIQBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 mb-4">No documents uploaded yet</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Upload building documents, certificates, and important files for easy access
                  </p>
                  <a 
                    href={`/buildings/${buildingId}/documents`}
                    className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    Upload Documents
                  </a>
                </div>
              )}
              
              <div className="text-center mt-8 pt-6 border-t border-gray-200">
                <span className="text-lg text-gray-600 font-medium">{documents.length} recent documents</span>
              </div>
            </div>
          </section>

          {/* Tasks - Enhanced Landing Page Style */}
          <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <CheckSquare className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Building Tasks</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Track and manage tasks and maintenance activities for {building.name}
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
              {tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-6 border border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                          <CheckSquare className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900">{task.task}</p>
                          <p className="text-gray-600">
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
                <div className="text-center py-12">
                  <CheckSquare className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 mb-4">No tasks created yet</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Create tasks to track maintenance, repairs, and other building activities
                  </p>
                  <a 
                    href={`/buildings/${buildingId}/tasks`}
                    className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    Create Task
                  </a>
                </div>
              )}
              
              <div className="text-center mt-8 pt-6 border-t border-gray-200">
                <span className="text-lg text-gray-600 font-medium">{tasks.length} tasks</span>
              </div>
            </div>
          </section>

          {/* Major Works - Enhanced Landing Page Style */}
          {majorWorks.length > 0 && (
            <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Hammer className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Major Works</h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Track major works projects and Section 20 consultations for {building.name}
                </p>
              </div>
              
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <div className="space-y-4">
                  {majorWorks.map((work) => (
                    <div key={work.id} className="flex items-center justify-between p-6 border border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                          <Hammer className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900">{work.title}</p>
                          <p className="text-gray-600">
                            {work.consultation_stage} • {work.start_date ? new Date(work.start_date).toLocaleDateString('en-GB') : 'No start date'}
                          </p>
                        </div>
                      </div>
                      <BlocIQBadge variant="secondary" size="sm">{work.status}</BlocIQBadge>
                    </div>
                  ))}
                </div>
                
                <div className="text-center mt-8 pt-6 border-t border-gray-200">
                  <span className="text-lg text-gray-600 font-medium">{majorWorks.length} major works projects</span>
                </div>
              </div>
            </section>
          )}

          {/* Diary Entries - Enhanced Landing Page Style */}
          {diaryEntries.length > 0 && (
            <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest Diary Entries</h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Recent diary entries and notes for {building.name}
                </p>
              </div>
              
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <div className="space-y-4">
                  {diaryEntries.map((entry) => (
                    <div key={entry.id} className="p-6 border border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg text-gray-600 font-medium">
                          {new Date(entry.created_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed text-lg">{entry.entry_text}</p>
                    </div>
                  ))}
                </div>
                
                <div className="text-center mt-8 pt-6 border-t border-gray-200">
                  <span className="text-lg text-gray-600 font-medium">{diaryEntries.length} diary entries</span>
                </div>
              </div>
            </section>
          )}

          {/* AI Summary - Enhanced Landing Page Style */}
          <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
            <div className="bg-white rounded-2xl p-12 shadow-xl border border-gray-100 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                <Brain className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">AI Building Summary</h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                Get an AI-powered summary of {building.name}'s key information, compliance status, and intelligent recommendations.
              </p>
              <BlocIQButton
                variant="primary"
                className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                <Brain className="h-6 w-6 mr-3" />
                Summarise This Building
              </BlocIQButton>
            </div>
          </section>
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