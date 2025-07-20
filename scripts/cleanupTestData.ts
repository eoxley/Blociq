import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CleanupResults {
  buildings: number
  units: number
  leaseholders: number
  emails: number
  compliance_documents: number
  compliance_assets: number
  building_documents: number
  building_todos: number
  property_events: number
  storage_files: number
}

async function cleanupTestData(): Promise<CleanupResults> {
  const results: CleanupResults = {
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

  try {
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

    results.emails = (incomingEmailsDeleted || 0) + (sentEmailsDeleted || 0)
    console.log(`   Deleted ${results.emails} test emails`)

    // 2. Clean Compliance Data
    console.log('📋 Cleaning up test compliance data...')
    
    const { count: complianceDocsDeleted } = await supabase
      .from("compliance_documents")
      .delete()
      .ilike("file_name", "%test%")
      .select('*', { count: 'exact', head: true })

    results.compliance_documents = complianceDocsDeleted || 0
    console.log(`   Deleted ${results.compliance_documents} test compliance documents`)

    // 3. Delete Building To-Dos
    console.log('✅ Cleaning up test todos...')
    
    const { count: todosDeleted } = await supabase
      .from("building_todos")
      .delete()
      .ilike("title", "%test%")
      .select('*', { count: 'exact', head: true })

    results.building_todos = todosDeleted || 0
    console.log(`   Deleted ${results.building_todos} test todos`)

    // 4. Delete Property Events
    console.log('📅 Cleaning up test property events...')
    
    const { count: eventsDeleted } = await supabase
      .from("property_events")
      .delete()
      .ilike("title", "%test%")
      .select('*', { count: 'exact', head: true })

    results.property_events = eventsDeleted || 0
    console.log(`   Deleted ${results.property_events} test property events`)

    // 5. Find and Delete Test Buildings (with cascade)
    console.log('🏢 Finding test buildings...')
    
    const { data: testBuildings } = await supabase
      .from("buildings")
      .select("id, name")
      .or("name.ilike.%test%,name.ilike.%demo%,name.ilike.%example%")

    if (testBuildings && testBuildings.length > 0) {
      console.log(`   Found ${testBuildings.length} test buildings to delete:`)
      testBuildings.forEach(b => console.log(`     - ${b.name} (ID: ${b.id})`))
      
      for (const building of testBuildings) {
        console.log(`   🗑️ Deleting building: ${building.name} (ID: ${building.id})`)
        
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
          
          results.leaseholders += leaseholdersDeleted || 0
          console.log(`     Deleted ${leaseholdersDeleted || 0} leaseholders`)
          
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
          
          results.units += unitsDeleted || 0
          console.log(`     Deleted ${unitsDeleted || 0} units`)
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
        
        results.buildings++
        console.log(`     ✅ Building ${building.name} deleted successfully`)
      }
    } else {
      console.log('   No test buildings found')
    }

    // 6. Clean up any remaining test data in other tables
    console.log('🧽 Final cleanup sweep...')
    
    // Clean up any test building documents
    const { count: buildingDocsDeleted } = await supabase
      .from("building_documents")
      .delete()
      .ilike("file_name", "%test%")
      .select('*', { count: 'exact', head: true })

    results.building_documents = buildingDocsDeleted || 0
    console.log(`   Deleted ${results.building_documents} test building documents`)

    // Clean up any test compliance assets
    const { count: complianceAssetsDeleted } = await supabase
      .from("building_compliance_assets")
      .delete()
      .ilike("asset_name", "%test%")
      .select('*', { count: 'exact', head: true })

    results.compliance_assets = complianceAssetsDeleted || 0
    console.log(`   Deleted ${results.compliance_assets} test compliance assets`)

    console.log('✅ Test data cleanup complete!')
    
    const totalItems = Object.values(results).reduce((sum, count) => sum + count, 0)
    console.log(`📊 Total items removed: ${totalItems}`)
    
    return results

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  }
}

async function auditTestData() {
  console.log('🔍 Auditing test data...')
  
  const testDataCount = {
    buildings: 0,
    units: 0,
    emails: 0,
    compliance_documents: 0,
    building_todos: 0,
    property_events: 0
  }

  try {
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

    console.log('📊 Test data audit results:')
    console.log(`   Buildings: ${testDataCount.buildings}`)
    console.log(`   Emails: ${testDataCount.emails}`)
    console.log(`   Compliance Documents: ${testDataCount.compliance_documents}`)
    console.log(`   Todos: ${testDataCount.building_todos}`)
    console.log(`   Property Events: ${testDataCount.property_events}`)
    
    const total = Object.values(testDataCount).reduce((sum, count) => sum + count, 0)
    console.log(`   Total: ${total} items`)

    return testDataCount

  } catch (error) {
    console.error('❌ Error during audit:', error)
    throw error
  }
}

// Main execution
async function main() {
  const command = process.argv[2]

  if (!command || (command !== 'audit' && command !== 'cleanup')) {
    console.log('Usage: npm run cleanup:audit or npm run cleanup:cleanup')
    console.log('  audit   - Count test data without deleting')
    console.log('  cleanup - Remove all test data')
    process.exit(1)
  }

  try {
    if (command === 'audit') {
      await auditTestData()
    } else if (command === 'cleanup') {
      console.log('⚠️  WARNING: This will permanently delete all test data!')
      console.log('Press Ctrl+C to cancel or any key to continue...')
      
      // Wait for user confirmation
      await new Promise(resolve => {
        process.stdin.once('data', () => {
          resolve(true)
        })
      })
      
      const results = await cleanupTestData()
      console.log('\n🎉 Cleanup completed successfully!')
      console.log('📊 Results:', results)
    }
  } catch (error) {
    console.error('❌ Operation failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { cleanupTestData, auditTestData } 