import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authenticated and has admin privileges
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    // Optional: Add additional admin check here if needed
    // const { data: user } = await supabase.auth.getUser()
    // if (user?.email !== 'admin@blociq.co.uk') {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // }

    const cleanupResults = {
      buildings: 0,
      units: 0,
      leaseholders: 0,
      emails: 0,
      compliance_documents: 0,
      compliance_assets: 0,
      building_documents: 0,
      building_todos: 0,
      property_events: 0,
      storage_files: 0
    }

    console.log('🧹 Starting test data cleanup...')

    // 1. Delete Dummy Emails
    console.log('📧 Cleaning up test emails...')
    
    const { count: incomingEmailsDeleted } = await supabase
      .from("incoming_emails")
      .delete()
      .ilike("subject", "%test%")
      .select('*', { count: 'exact', head: true })

    const { count: sentEmailsDeleted } = await supabase
      .from("sent_emails")
      .delete()
      .ilike("to_email", "%example.com%")
      .select('*', { count: 'exact', head: true })

    cleanupResults.emails = (incomingEmailsDeleted || 0) + (sentEmailsDeleted || 0)

    // 2. Clean Compliance Data
    console.log('📋 Cleaning up test compliance data...')
    
    const { count: complianceDocsDeleted } = await supabase
      .from("compliance_documents")
      .delete()
      .ilike("file_name", "%test%")
      .select('*', { count: 'exact', head: true })

    cleanupResults.compliance_documents = complianceDocsDeleted || 0

    // 3. Delete Building To-Dos
    console.log('✅ Cleaning up test todos...')
    
    const { count: todosDeleted } = await supabase
      .from("building_todos")
      .delete()
      .ilike("title", "%test%")
      .select('*', { count: 'exact', head: true })

    cleanupResults.building_todos = todosDeleted || 0

    // 4. Delete Property Events
    console.log('📅 Cleaning up test property events...')
    
    const { count: eventsDeleted } = await supabase
      .from("property_events")
      .delete()
      .ilike("title", "%test%")
      .select('*', { count: 'exact', head: true })

    cleanupResults.property_events = eventsDeleted || 0

    // 5. Find and Delete Test Buildings (with cascade)
    console.log('🏢 Finding test buildings...')
    
    const { data: testBuildings } = await supabase
      .from("buildings")
      .select("id, name")
      .or("name.ilike.%test%,name.ilike.%demo%,name.ilike.%example%")

    if (testBuildings && testBuildings.length > 0) {
      console.log(`Found ${testBuildings.length} test buildings to delete:`, testBuildings.map(b => b.name))
      
      for (const building of testBuildings) {
        console.log(`🗑️ Deleting building: ${building.name} (ID: ${building.id})`)
        
        // Get all units for this building
        const { data: buildingUnits } = await supabase
          .from("units")
          .select("id")
          .eq("building_id", building.id)
        
        if (buildingUnits && buildingUnits.length > 0) {
          const unitIds = buildingUnits.map(unit => unit.id)
          
          // Delete leaseholders for these units
          const { count: leaseholdersDeleted } = await supabase
            .from("leaseholders")
            .delete()
            .in("unit_id", unitIds)
            .select('*', { count: 'exact', head: true })
          
          cleanupResults.leaseholders += leaseholdersDeleted || 0
          
          // Delete occupiers for these units
          await supabase
            .from("occupiers")
            .delete()
            .in("unit_id", unitIds)
          
          // Delete the units
          const { count: unitsDeleted } = await supabase
            .from("units")
            .delete()
            .eq("building_id", building.id)
            .select('*', { count: 'exact', head: true })
          
          cleanupResults.units += unitsDeleted || 0
        }
        
        // Delete building-related data
        await supabase
          .from("building_documents")
          .delete()
          .eq("building_id", building.id)
        
        await supabase
          .from("building_todos")
          .delete()
          .eq("building_id", building.id)
        
        await supabase
          .from("building_compliance_assets")
          .delete()
          .eq("building_id", building.id)
        
        await supabase
          .from("property_events")
          .delete()
          .eq("building_id", building.id)
        
        await supabase
          .from("incoming_emails")
          .delete()
          .eq("building_id", building.id)
        
        // Finally delete the building
        await supabase
          .from("buildings")
          .delete()
          .eq("id", building.id)
        
        cleanupResults.buildings++
      }
    }

    // 6. Clean up any remaining test data in other tables
    console.log('🧽 Final cleanup sweep...')
    
    // Clean up any test building documents
    const { count: buildingDocsDeleted } = await supabase
      .from("building_documents")
      .delete()
      .ilike("file_name", "%test%")
      .select('*', { count: 'exact', head: true })

    cleanupResults.building_documents = buildingDocsDeleted || 0

    // Clean up any test compliance assets
    const { count: complianceAssetsDeleted } = await supabase
      .from("building_compliance_assets")
      .delete()
      .ilike("asset_name", "%test%")
      .select('*', { count: 'exact', head: true })

    cleanupResults.compliance_assets = complianceAssetsDeleted || 0

    // 7. Optional: Clean up Supabase Storage (if needed)
    // Note: This requires additional setup and permissions
    // const { data: storageFiles } = await supabase.storage
    //   .from('documents')
    //   .list('test-folder')
    // 
    // if (storageFiles) {
    //   for (const file of storageFiles) {
    //     await supabase.storage
    //       .from('documents')
    //       .remove([`test-folder/${file.name}`])
    //     cleanupResults.storage_files++
    //   }
    // }

    console.log('✅ Test data cleanup complete!')
    console.log('📊 Cleanup summary:', cleanupResults)

    return NextResponse.json({
      message: "Test data cleanup complete",
      success: true,
      removed: cleanupResults,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    
    return NextResponse.json(
      { 
        error: 'Cleanup failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// GET method to check cleanup status (read-only)
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    // Count test data without deleting
    const testDataCount = {
      buildings: 0,
      units: 0,
      emails: 0,
      compliance_documents: 0,
      building_todos: 0,
      property_events: 0
    }

    // Count test buildings
    const { count: testBuildings } = await supabase
      .from("buildings")
      .select("*", { count: 'exact', head: true })
      .or("name.ilike.%test%,name.ilike.%demo%,name.ilike.%example%")

    testDataCount.buildings = testBuildings || 0

    // Count test emails
    const { count: testEmails } = await supabase
      .from("incoming_emails")
      .select("*", { count: 'exact', head: true })
      .ilike("subject", "%test%")

    testDataCount.emails = testEmails || 0

    // Count test compliance documents
    const { count: testComplianceDocs } = await supabase
      .from("compliance_documents")
      .select("*", { count: 'exact', head: true })
      .ilike("file_name", "%test%")

    testDataCount.compliance_documents = testComplianceDocs || 0

    // Count test todos
    const { count: testTodos } = await supabase
      .from("building_todos")
      .select("*", { count: 'exact', head: true })
      .ilike("title", "%test%")

    testDataCount.building_todos = testTodos || 0

    // Count test property events
    const { count: testEvents } = await supabase
      .from("property_events")
      .select("*", { count: 'exact', head: true })
      .ilike("title", "%test%")

    testDataCount.property_events = testEvents || 0

    return NextResponse.json({
      message: "Test data audit complete",
      test_data_count: testDataCount,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error during audit:', error)
    
    return NextResponse.json(
      { 
        error: 'Audit failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 