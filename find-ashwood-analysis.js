/**
 * Find Ashwood House Lease Analysis Data
 * Locates existing analysis data and links it to the lease record
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

async function findAshwoodAnalysis() {
  console.log('🔍 Searching for Ashwood House lease analysis data...')

  try {
    // 1. Get Ashwood House building
    const { data: building } = await supabase
      .from('buildings')
      .select('*')
      .ilike('name', '%ashwood%')
      .single()

    if (!building) {
      console.log('❌ Ashwood House building not found')
      return
    }

    console.log('✅ Found building:', building.name, building.id)

    // 2. Check document_jobs table for lease analysis
    console.log('📄 Searching document_jobs table...')
    const { data: docJobs, error: docError } = await supabase
      .from('document_jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (docJobs) {
      console.log(`📊 Found ${docJobs.length} document jobs`)

      // Look for jobs with "ashwood" or "5" in filename or summary
      const ashwoodJobs = docJobs.filter(job =>
        job.filename?.toLowerCase().includes('ashwood') ||
        job.filename?.toLowerCase().includes('5') ||
        job.summary?.toLowerCase().includes('ashwood') ||
        job.summary?.toLowerCase().includes('flat 5') ||
        job.summary_json?.basic_property_details?.property_address?.toLowerCase().includes('ashwood')
      )

      console.log(`🏠 Found ${ashwoodJobs.length} potential Ashwood House jobs`)

      if (ashwoodJobs.length > 0) {
        ashwoodJobs.forEach((job, index) => {
          console.log(`\n📋 Job ${index + 1}:`)
          console.log(`   ID: ${job.id}`)
          console.log(`   Filename: ${job.filename || 'No filename'}`)
          console.log(`   Type: ${job.document_type || 'Unknown'}`)
          console.log(`   Status: ${job.status || 'Unknown'}`)
          console.log(`   Created: ${job.created_at}`)
          console.log(`   Summary: ${job.summary ? job.summary.substring(0, 100) + '...' : 'No summary'}`)

          if (job.summary_json) {
            console.log(`   Analysis available: Yes`)
            const analysis = job.summary_json
            if (analysis.basic_property_details) {
              console.log(`     Property address: ${analysis.basic_property_details.property_address || 'Not found'}`)
              console.log(`     Parties: ${analysis.basic_property_details.parties?.join(', ') || 'Not found'}`)
              console.log(`     Lease term: ${analysis.basic_property_details.lease_term || 'Not found'}`)
            }
          } else {
            console.log(`   Analysis available: No`)
          }
        })

        // 3. Check if any of these jobs are already linked to the lease
        const { data: lease } = await supabase
          .from('leases')
          .select('*')
          .eq('building_id', building.id)
          .single()

        if (lease) {
          console.log(`\n📜 Current lease record:`)
          console.log(`   Leaseholder: ${lease.leaseholder_name}`)
          console.log(`   Unit: ${lease.unit_number}`)
          console.log(`   Document Job ID: ${lease.document_job_id || 'Not set'}`)
          console.log(`   Analysis JSON: ${lease.analysis_json ? 'Available' : 'Missing'}`)

          // 4. Try to link the best matching job to the lease
          const bestMatch = ashwoodJobs.find(job =>
            job.summary_json?.basic_property_details?.property_address?.toLowerCase().includes('flat 5') ||
            job.filename?.toLowerCase().includes('5') ||
            job.summary?.toLowerCase().includes('flat 5')
          ) || ashwoodJobs[0]

          if (bestMatch && !lease.analysis_json) {
            console.log(`\n🔗 Linking job ${bestMatch.id} to lease...`)

            const { error: updateError } = await supabase
              .from('leases')
              .update({
                document_job_id: bestMatch.id,
                analysis_json: bestMatch.summary_json,
                updated_at: new Date().toISOString()
              })
              .eq('id', lease.id)

            if (updateError) {
              console.error('❌ Error linking analysis:', updateError.message)
            } else {
              console.log('✅ Successfully linked lease analysis!')
              console.log(`   Linked job: ${bestMatch.filename}`)
              console.log(`   Analysis sections: ${bestMatch.summary_json?.detailed_sections?.length || 0}`)
            }
          } else if (lease.analysis_json) {
            console.log('ℹ️ Lease already has analysis data')
          }
        }
      }
    }

    // 5. Final verification
    const { data: updatedLease } = await supabase
      .from('leases')
      .select('*')
      .eq('building_id', building.id)
      .single()

    if (updatedLease) {
      console.log(`\n📊 Final lease status:`)
      console.log(`   Analysis JSON: ${updatedLease.analysis_json ? '✅ Available' : '❌ Missing'}`)
      console.log(`   Document Job ID: ${updatedLease.document_job_id || '❌ Not set'}`)

      if (updatedLease.analysis_json) {
        const analysis = updatedLease.analysis_json
        console.log(`   Property details: ${!!analysis.basic_property_details}`)
        console.log(`   Detailed sections: ${analysis.detailed_sections?.length || 0}`)
        console.log(`   Financial info: ${!!(analysis.basic_property_details?.ground_rent || analysis.basic_property_details?.service_charge)}`)
      }
    }

    console.log('\n✅ Ashwood House analysis search completed!')

  } catch (error) {
    console.error('❌ Error searching for analysis:', error.message)
  }
}

// Run the search
if (require.main === module) {
  findAshwoodAnalysis()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

module.exports = { findAshwoodAnalysis }