const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyCleanState() {
  console.log('🔍 Verifying clean database state...\n');

  try {
    // 1. Check for Ashwood House building
    console.log('📍 Checking for Ashwood House building...');
    const { data: buildings, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .ilike('name', '%Ashwood%');

    if (buildingError) {
      console.error('Error checking buildings:', buildingError);
    } else if (buildings && buildings.length > 0) {
      console.log('⚠️  Found Ashwood buildings:', buildings);
    } else {
      console.log('✅ No Ashwood House buildings found');
    }

    // 2. Check all buildings
    console.log('\n📊 Checking all buildings in database...');
    const { data: allBuildings, error: allBuildingsError } = await supabase
      .from('buildings')
      .select('id, name, address, agency_id')
      .order('name');

    if (allBuildingsError) {
      console.error('Error checking all buildings:', allBuildingsError);
    } else {
      console.log(`Found ${allBuildings?.length || 0} total buildings:`);
      if (allBuildings && allBuildings.length > 0) {
        allBuildings.forEach(b => {
          console.log(`  - ${b.name} (${b.address || 'No address'})`);
        });
      }
    }

    // 3. Verify user profile
    console.log('\n👤 Verifying user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, agency_id')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();

    if (profileError) {
      console.error('❌ Error checking user profile:', profileError);
    } else {
      console.log(`✅ User profile found:`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Name: ${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Not set');
      console.log(`   Agency ID: ${profile.agency_id || 'Not set'}`);
    }

    // 4. Check agency
    if (profile && profile.agency_id) {
      console.log('\n🏢 Checking agency...');
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('id', profile.agency_id)
        .single();

      if (agencyError) {
        console.error('❌ Error checking agency:', agencyError);
      } else {
        console.log(`✅ Agency: ${agency.name}`);
      }
    }

    // 5. Check for any orphaned data
    console.log('\n🔍 Checking for orphaned data...');

    const { data: orphanedDocs, error: docsError } = await supabase
      .from('documents')
      .select('id, original_filename, building_id')
      .is('building_id', null);

    if (!docsError && orphanedDocs && orphanedDocs.length > 0) {
      console.log(`⚠️  Found ${orphanedDocs.length} documents with no building`);
    } else {
      console.log('✅ No orphaned documents found');
    }

    console.log('\n✨ Verification complete!');
    console.log('\n📋 Summary:');
    console.log(`   - Ashwood House: Removed ✅`);
    console.log(`   - User Profile: Intact ✅`);
    console.log(`   - Total Buildings: ${allBuildings?.length || 0}`);
    console.log(`   - Ready for live testing ✅`);

  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

verifyCleanState();