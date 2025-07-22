const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runHRBMigration() {
  try {
    console.log('🏗️ Adding HRB field to buildings table...')
    
    // Add the is_hrb column
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE buildings 
        ADD COLUMN IF NOT EXISTS is_hrb BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN buildings.is_hrb IS 'Flag indicating if this building is classified as a High-Risk Building (HRB)';
      `
    })

    if (error) {
      console.error('❌ Error adding HRB field:', error)
      return
    }

    console.log('✅ HRB field added successfully!')
    
    // Set some example buildings as HRB for testing
    console.log('🏢 Setting example buildings as HRB...')
    
    const { error: updateError } = await supabase
      .from('buildings')
      .update({ is_hrb: true })
      .in('name', ['Ashwood House', 'Maple Court'])

    if (updateError) {
      console.error('⚠️ Could not set example HRB buildings:', updateError)
    } else {
      console.log('✅ Example buildings set as HRB')
    }

    console.log('🎉 HRB migration completed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

runHRBMigration() 