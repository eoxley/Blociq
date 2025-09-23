const { createClient } = require('@supabase/supabase-js')

// Create Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addAgencyColumn() {
  console.log('🔧 Adding agency_id column to property_events table...')

  try {
    // Use raw SQL to add the column
    const { data, error } = await supabase
      .from('property_events')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Error accessing property_events:', error)
      return
    }

    console.log('✅ Successfully accessed property_events table')
    console.log('💡 The agency_id column needs to be added via database migration')
    console.log('📝 SQL to run:')
    console.log('ALTER TABLE property_events ADD COLUMN agency_id UUID REFERENCES agencies(id);')

  } catch (error) {
    console.error('❌ Failed to check property_events:', error)
  }
}

addAgencyColumn()