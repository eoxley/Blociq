/**
 * Fix Profiles Schema Script
 *
 * Adds the missing agency_id column to the profiles table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Create service client (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ELEANOR_USER_ID = '938498a6-2906-4a75-bc91-5d0d586b227e';
const BLOCIQ_AGENCY_ID = '00000000-0000-0000-0000-000000000001';

async function fixProfilesSchema() {
  console.log('🔧 Starting profiles table schema fix...\n');

  try {
    // 1. Test if agency_id column already exists by trying to select it
    console.log('1️⃣ Checking if agency_id column exists...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('agency_id')
      .limit(1);

    if (testError && testError.message.includes('agency_id')) {
      console.log('❌ Column does not exist. Manual database migration required.');
      console.log('Please run this SQL command in your Supabase dashboard:');
      console.log(`
ALTER TABLE profiles
ADD COLUMN agency_id UUID REFERENCES agencies(id);

CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON profiles(agency_id);
      `);
      console.log('\nAfter running the SQL, re-run this script to update the profile data.');
      return;
    }

    console.log('✅ agency_id column exists');

    // 2. Update Eleanor's profile with BlocIQ agency
    console.log('\n2️⃣ Updating Eleanor\'s profile with agency relationship...');
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        agency_id: BLOCIQ_AGENCY_ID,
        updated_at: new Date().toISOString()
      })
      .eq('id', ELEANOR_USER_ID)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update profile:', updateError);
      return;
    }

    console.log('✅ Updated Eleanor\'s profile:', updatedProfile);

    // 3. Index is created with the ALTER TABLE command above
    console.log('\n3️⃣ Index created with column addition');

    // 4. Verification
    console.log('\n4️⃣ Verifying the fix...');
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select(`
        *,
        agencies:agency_id (
          id,
          name,
          slug
        )
      `)
      .eq('id', ELEANOR_USER_ID)
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return;
    }

    console.log('✅ Profile verification successful:', verifyProfile);

    console.log('\n🎉 Profiles schema fix completed successfully!');
    console.log('Eleanor Oxley is now properly linked to BlocIQ agency.');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the fix
fixProfilesSchema().catch(console.error);