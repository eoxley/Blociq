require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Environment check:');
console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('SUPABASE_KEY:', supabaseKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAgencyMembership() {
  try {
    console.log('\n🔍 Checking agency membership...');
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Not authenticated:', authError?.message);
      return;
    }
    
    console.log('✅ User authenticated:', user.email);
    console.log('👤 User ID:', user.id);
    
    // Check agencies table
    console.log('\n🏢 Checking agencies table...');
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('*')
      .limit(5);
    
    if (agenciesError) {
      console.error('❌ Error fetching agencies:', agenciesError);
    } else {
      console.log('✅ Agencies found:', agencies?.length || 0);
      agencies?.forEach(agency => {
        console.log(`  - ${agency.name} (${agency.id}) - ${agency.slug}`);
      });
    }
    
    // Check agency_members table
    console.log('\n👥 Checking agency_members table...');
    const { data: memberships, error: membershipsError } = await supabase
      .from('agency_members')
      .select(`
        agency_id,
        user_id,
        role,
        invitation_status,
        joined_at,
        agencies:agency_id (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', user.id);
    
    if (membershipsError) {
      console.error('❌ Error fetching agency memberships:', membershipsError);
    } else {
      console.log('✅ Agency memberships found:', memberships?.length || 0);
      memberships?.forEach(membership => {
        console.log(`  - ${membership.agencies?.name || 'Unknown'} (${membership.role}) - ${membership.invitation_status}`);
      });
    }
    
    // Check buildings table
    console.log('\n🏠 Checking buildings table...');
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, agency_id')
      .limit(10);
    
    if (buildingsError) {
      console.error('❌ Error fetching buildings:', buildingsError);
    } else {
      console.log('✅ Buildings found:', buildings?.length || 0);
      buildings?.forEach(building => {
        console.log(`  - ${building.name} (${building.id}) - Agency: ${building.agency_id}`);
      });
    }
    
    // Check if Ashwood House exists
    console.log('\n🔍 Looking for Ashwood House...');
    const { data: ashwood, error: ashwoodError } = await supabase
      .from('buildings')
      .select('*')
      .ilike('name', '%ashwood%');
    
    if (ashwoodError) {
      console.error('❌ Error searching for Ashwood House:', ashwoodError);
    } else {
      console.log('✅ Ashwood House search results:', ashwood?.length || 0);
      ashwood?.forEach(building => {
        console.log(`  - ${building.name} (${building.id}) - Agency: ${building.agency_id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAgencyMembership();
