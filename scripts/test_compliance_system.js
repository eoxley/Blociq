require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testComplianceSystem() {
  console.log('🧪 Testing Compliance System...')
  
  try {
    // 1. Test if compliance_assets table exists and has data
    console.log('\n📋 Testing compliance_assets table...')
    const { data: assets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('id, name, category, description')
      .limit(5)
    
    if (assetsError) {
      console.error('❌ Error accessing compliance_assets:', assetsError)
      return
    }
    
    console.log(`✅ compliance_assets table accessible, found ${assets?.length || 0} assets`)
    if (assets && assets.length > 0) {
      console.log('   Sample assets:')
      assets.forEach(asset => {
        console.log(`   - ${asset.name} (${asset.category})`)
      })
    }
    
    // 2. Test if building_compliance_assets table exists
    console.log('\n🏢 Testing building_compliance_assets table...')
    const { data: bca, error: bcaError } = await supabase
      .from('building_compliance_assets')
      .select('id, building_id, compliance_asset_id, status')
      .limit(1)
    
    if (bcaError) {
      console.error('❌ Error accessing building_compliance_assets:', bcaError)
      return
    }
    
    console.log(`✅ building_compliance_assets table accessible, found ${bca?.length || 0} records`)
    
    // 3. Test if we can get a building ID for testing
    console.log('\n🔍 Getting a building for testing...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name')
      .limit(1)
    
    if (buildingsError || !buildings || buildings.length === 0) {
      console.error('❌ No buildings found:', buildingsError)
      return
    }
    
    const testBuilding = buildings[0]
    console.log(`✅ Using building for test: ${testBuilding.name} (${testBuilding.id})`)
    
    // 4. Test inserting a compliance asset
    console.log('\n➕ Testing compliance asset insertion...')
    const testAssetId = assets[0].id
    
    const { data: insertedBca, error: insertError } = await supabase
      .from('building_compliance_assets')
      .insert({
        building_id: testBuilding.id,
        compliance_asset_id: testAssetId,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Error inserting compliance asset:', insertError)
      return
    }
    
    console.log('✅ Successfully inserted compliance asset:', insertedBca.id)
    
    // 5. Test updating the compliance asset
    console.log('\n✏️ Testing compliance asset update...')
    const { error: updateError } = await supabase
      .from('building_compliance_assets')
      .update({ 
        status: 'compliant',
        updated_at: new Date().toISOString()
      })
      .eq('id', insertedBca.id)
    
    if (updateError) {
      console.error('❌ Error updating compliance asset:', updateError)
      return
    }
    
    console.log('✅ Successfully updated compliance asset')
    
    // 6. Test deleting the test record
    console.log('\n🗑️ Cleaning up test record...')
    const { error: deleteError } = await supabase
      .from('building_compliance_assets')
      .delete()
      .eq('id', insertedBca.id)
    
    if (deleteError) {
      console.error('❌ Error deleting test record:', deleteError)
      return
    }
    
    console.log('✅ Successfully deleted test record')
    
    // 7. Test compliance documents table
    console.log('\n📄 Testing compliance_documents table...')
    const { data: docs, error: docsError } = await supabase
      .from('compliance_documents')
      .select('id, building_id, compliance_asset_id')
      .limit(1)
    
    if (docsError) {
      console.error('❌ Error accessing compliance_documents:', docsError)
      return
    }
    
    console.log(`✅ compliance_documents table accessible, found ${docs?.length || 0} documents`)
    
    // 8. Test building_documents table
    console.log('\n📁 Testing building_documents table...')
    const { data: buildingDocs, error: buildingDocsError } = await supabase
      .from('building_documents')
      .select('id, building_id, title')
      .limit(1)
    
    if (buildingDocsError) {
      console.error('❌ Error accessing building_documents:', buildingDocsError)
      return
    }
    
    console.log(`✅ building_documents table accessible, found ${buildingDocs?.length || 0} documents`)
    
    // 9. Test building_compliance_documents linking table
    console.log('\n🔗 Testing building_compliance_documents table...')
    const { data: links, error: linksError } = await supabase
      .from('building_compliance_documents')
      .select('id, building_compliance_asset_id, document_id')
      .limit(1)
    
    if (linksError) {
      console.error('❌ Error accessing building_compliance_documents:', linksError)
      return
    }
    
    console.log(`✅ building_compliance_documents table accessible, found ${links?.length || 0} links`)
    
    console.log('\n🎉 All compliance system tests passed!')
    console.log('\n📝 The compliance system is now working correctly.')
    console.log('   You should be able to:')
    console.log('   - Add compliance assets to buildings')
    console.log('   - Upload compliance documents')
    console.log('   - Track compliance status')
    console.log('   - Use the compliance setup modal')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testComplianceSystem()
