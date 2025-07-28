const { createClient } = require('@supabase/supabase-js')

// This script adds the missing assigned_manager column to the building_setup table
async function addAssignedManagerColumn() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log('🔍 Adding assigned_manager column to building_setup table...')
    
    // Add the column
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE building_setup 
        ADD COLUMN IF NOT EXISTS assigned_manager VARCHAR(255);
        
        COMMENT ON COLUMN building_setup.assigned_manager IS 'The assigned manager for this building setup';
      `
    })

    if (error) {
      console.error('❌ Error adding column:', error)
      return
    }

    console.log('✅ Successfully added assigned_manager column to building_setup table')
    
    // Verify the column was added
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'building_setup')
      .eq('column_name', 'assigned_manager')

    if (columnsError) {
      console.error('❌ Error checking column:', columnsError)
      return
    }

    if (columns && columns.length > 0) {
      console.log('✅ Column verified:', columns[0])
    } else {
      console.log('⚠️ Column not found after addition')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

addAssignedManagerColumn() 