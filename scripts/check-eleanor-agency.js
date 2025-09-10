require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEleanorAgency() {
  try {
    console.log('🔍 Checking Eleanor\'s agency membership...');
    
    // Find Eleanor's user record
    const { data: eleanor, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();
    
    if (userError || !eleanor) {
      console.error('❌ Could not find Eleanor\'s user record:', userError?.message);
      return;
    }
    
    console.log('✅ Found Eleanor:', eleanor.full_name, `(${eleanor.email})`);
    console.log('   User ID:', eleanor.id);
    
    // Check Eleanor's agency memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('agency_members')
      .select(`
        agency_id,
        role,
        invitation_status,
        joined_at,
        agencies!agency_id (
          id,
          name,
          slug,
          status
        )
      `)
      .eq('user_id', eleanor.id);
    
    if (membershipError) {
      console.error('❌ Error fetching agency memberships:', membershipError);
      return;
    }
    
    if (!memberships || memberships.length === 0) {
      console.log('⚠️ Eleanor has no agency memberships');
      return;
    }
    
    console.log('\n🏢 Eleanor\'s Agency Memberships:');
    memberships.forEach((membership, index) => {
      console.log(`  ${index + 1}. Agency: ${membership.agencies.name}`);
      console.log(`     ID: ${membership.agency_id}`);
      console.log(`     Slug: ${membership.agencies.slug}`);
      console.log(`     Role: ${membership.role}`);
      console.log(`     Status: ${membership.invitation_status}`);
      console.log(`     Joined: ${new Date(membership.joined_at).toLocaleDateString()}`);
      console.log('');
    });
    
    // Check if Ashwood House exists and its agency
    console.log('🏠 Checking Ashwood House...');
    const { data: ashwood, error: ashwoodError } = await supabase
      .from('buildings')
      .select(`
        id,
        name,
        agency_id,
        address,
        agencies!agency_id (
          id,
          name,
          slug
        )
      `)
      .eq('name', 'Ashwood House')
      .single();
    
    if (ashwoodError || !ashwood) {
      console.log('⚠️ Ashwood House not found or error:', ashwoodError?.message);
    } else {
      console.log('✅ Found Ashwood House:');
      console.log(`   ID: ${ashwood.id}`);
      console.log(`   Name: ${ashwood.name}`);
      console.log(`   Address: ${ashwood.address || 'Not set'}`);
      console.log(`   Agency ID: ${ashwood.agency_id}`);
      console.log(`   Agency: ${ashwood.agencies?.name || 'Unknown'}`);
      console.log(`   Agency Slug: ${ashwood.agencies?.slug || 'Unknown'}`);
    }
    
    // Show all agencies for reference
    console.log('\n📋 All Available Agencies:');
    const { data: allAgencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('id, name, slug, status')
      .order('name');
    
    if (agenciesError) {
      console.error('❌ Error fetching agencies:', agenciesError);
    } else {
      allAgencies?.forEach((agency, index) => {
        console.log(`  ${index + 1}. ${agency.name} (${agency.slug}) - ${agency.status}`);
        console.log(`     ID: ${agency.id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkEleanorAgency();
