const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function fixComplianceTable() {
  console.log('🔧 Fixing building_compliance_assets table...')
  
  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Step 1: Try to add the column directly
    console.log('🔍 Attempting to add last_updated column...')
    
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE building_compliance_assets 
        ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `
    })
    
    if (addError) {
      console.error('❌ Error adding column:', addError.message)
      
      // If the column already exists, this error will occur
      if (addError.message.includes('already exists') || addError.message.includes('duplicate')) {
        console.log('✅ Column already exists, proceeding with verification...')
      } else {
        console.log('💡 Please run this SQL manually in your Supabase dashboard:')
        console.log(`
          ALTER TABLE building_compliance_assets 
          ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `)
        return
      }
    } else {
      console.log('✅ Column added successfully!')
    }
    
    // Step 2: Update existing records
    console.log('🔄 Updating existing records...')
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE building_compliance_assets 
        SET last_updated = NOW() 
        WHERE last_updated IS NULL;
      `
    })
    
    if (updateError) {
      console.error('❌ Error updating records:', updateError.message)
    } else {
      console.log('✅ Records updated successfully!')
    }
    
    // Step 3: Verify the fix by testing a query
    console.log('🔍 Verifying the fix...')
    const { data: testData, error: testError } = await supabase
      .from('building_compliance_assets')
      .select('id, last_updated')
      .limit(1)
    
    if (testError) {
      console.error('❌ Verification failed:', testError.message)
      console.log('💡 The column may still be missing. Please run this SQL manually:')
      console.log(`
        ALTER TABLE building_compliance_assets 
        ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        UPDATE building_compliance_assets 
        SET last_updated = NOW() 
        WHERE last_updated IS NULL;
      `)
    } else {
      console.log('✅ Verification successful!')
      console.log('📊 Sample data:', testData)
      console.log('🎉 The building_compliance_assets table is now fixed!')
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message)
    console.log('💡 Please run this SQL manually in your Supabase dashboard:')
    console.log(`
      ALTER TABLE building_compliance_assets 
      ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      
      UPDATE building_compliance_assets 
      SET last_updated = NOW() 
      WHERE last_updated IS NULL;
    `)
  }
}

// Run the fix
fixComplianceTable() 