const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function runMigration() {
  console.log('🚀 Starting database migration...')
  
  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'add_last_updated_column.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Migration SQL loaded successfully')
    console.log('🔧 Executing migration...')
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      return
    }
    
    console.log('✅ Migration completed successfully!')
    console.log('📊 Migration result:', data)
    
    // Verify the column was added
    console.log('🔍 Verifying column addition...')
    const { data: columns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'building_compliance_assets')
      .eq('column_name', 'last_updated')
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError)
      return
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ Column verification successful:')
      console.log('   Column:', columns[0])
    } else {
      console.log('⚠️ Column not found in verification query')
    }
    
  } catch (error) {
    console.error('❌ Migration script error:', error)
  }
}

// Run the migration
runMigration() 