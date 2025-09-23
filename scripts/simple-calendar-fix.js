const { createClient } = require('@supabase/supabase-js')

// Create Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyCalendarFix() {
  console.log('🔧 Applying calendar agency isolation fix manually...')

  try {
    // First, check if agency_id column exists
    console.log('1. Checking if agency_id column exists in property_events...')
    const { data: events, error: checkError } = await supabase
      .from('property_events')
      .select('agency_id')
      .limit(1)

    if (checkError && checkError.message.includes('column "agency_id" does not exist')) {
      console.log('❌ agency_id column does not exist. Need to add it via SQL migration.')
      console.log('Please run the migration file manually in your database.')
      return
    }

    // Check current RLS policies
    console.log('2. Checking current data in property_events...')
    const { data: allEvents, error: eventError } = await supabase
      .from('property_events')
      .select('id, title, agency_id, created_by')

    if (eventError) {
      console.error('❌ Error fetching events:', eventError)
      return
    }

    console.log(`📊 Found ${allEvents?.length || 0} events in property_events table`)

    if (allEvents && allEvents.length > 0) {
      const eventsWithoutAgency = allEvents.filter(e => !e.agency_id)
      console.log(`🔍 Events without agency_id: ${eventsWithoutAgency.length}`)

      if (eventsWithoutAgency.length > 0) {
        console.log('Sample events without agency_id:')
        eventsWithoutAgency.slice(0, 3).forEach(e => {
          console.log(`  - ${e.title} (created_by: ${e.created_by})`)
        })
      }
    }

    // Check agencies
    console.log('3. Checking available agencies...')
    const { data: agencies, error: agencyError } = await supabase
      .from('agencies')
      .select('id, name, slug')

    if (agencyError) {
      console.error('❌ Error fetching agencies:', agencyError)
      return
    }

    console.log('📋 Available agencies:')
    agencies?.forEach(a => {
      console.log(`  - ${a.name} (${a.slug}) - ID: ${a.id}`)
    })

    // Check profiles
    console.log('4. Checking user profiles...')
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, agency_id')

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError)
      return
    }

    console.log(`👥 Found ${profiles?.length || 0} user profiles`)
    if (profiles && profiles.length > 0) {
      const profilesWithoutAgency = profiles.filter(p => !p.agency_id)
      console.log(`🔍 Profiles without agency_id: ${profilesWithoutAgency.length}`)
    }

    console.log('✅ Calendar fix diagnosis completed!')
    console.log('\n💡 Next steps:')
    console.log('1. Add agency_id column to property_events table if not exists')
    console.log('2. Update existing events to have agency_id')
    console.log('3. Update RLS policies to filter by agency')

  } catch (error) {
    console.error('❌ Failed to apply calendar fix:', error)
    process.exit(1)
  }
}

applyCalendarFix()