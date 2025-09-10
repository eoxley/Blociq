require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAgencySummary() {
  try {
    console.log('📊 Agency Summary for Eleanor and Ashwood House\n');
    
    // Get Eleanor's info
    const { data: eleanor, error: eleanorError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();
    
    if (eleanorError || !eleanor) {
      console.error('❌ Could not find Eleanor:', eleanorError?.message);
      return;
    }
    
    console.log('👤 Eleanor Oxley:');
    console.log(`   Email: ${eleanor.email}`);
    console.log(`   User ID: ${eleanor.id}`);
    console.log(`   Full Name: ${eleanor.full_name || 'Not set'}`);
    
    // Get Eleanor's agency
    const { data: eleanorAgency, error: agencyError } = await supabase
      .from('agency_members')
      .select(`
        agency_id,
        role,
        agencies!agency_id (
          id,
          name,
          slug,
          status
        )
      `)
      .eq('user_id', eleanor.id)
      .eq('invitation_status', 'accepted')
      .single();
    
    if (agencyError || !eleanorAgency) {
      console.log('   Agency: Not assigned to any agency');
    } else {
      console.log('   Agency:', eleanorAgency.agencies.name);
      console.log('   Agency ID:', eleanorAgency.agencies.id);
      console.log('   Agency Slug:', eleanorAgency.agencies.slug);
      console.log('   Role:', eleanorAgency.role);
    }
    
    // Get Ashwood House info
    console.log('\n🏠 Ashwood House:');
    const { data: ashwood, error: ashwoodError } = await supabase
      .from('buildings')
      .select(`
        id,
        name,
        address,
        agency_id,
        unit_count,
        agencies!agency_id (
          id,
          name,
          slug
        )
      `)
      .eq('name', 'Ashwood House')
      .single();
    
    if (ashwoodError || !ashwood) {
      console.log('   Status: Not found in database');
    } else {
      console.log(`   Name: ${ashwood.name}`);
      console.log(`   ID: ${ashwood.id}`);
      console.log(`   Address: ${ashwood.address || 'Not set'}`);
      console.log(`   Unit Count: ${ashwood.unit_count || 0}`);
      console.log(`   Agency: ${ashwood.agencies?.name || 'Not assigned'}`);
      console.log(`   Agency ID: ${ashwood.agency_id || 'Not assigned'}`);
    }
    
    // Show all agencies
    console.log('\n📋 All Available Agencies:');
    const { data: allAgencies, error: allAgenciesError } = await supabase
      .from('agencies')
      .select('id, name, slug, status')
      .order('name');
    
    if (allAgenciesError) {
      console.error('❌ Error fetching agencies:', allAgenciesError);
    } else {
      allAgencies?.forEach((agency, index) => {
        console.log(`   ${index + 1}. ${agency.name} (${agency.slug}) - ${agency.status}`);
        console.log(`      ID: ${agency.id}`);
      });
    }
    
    // Show agency members
    if (eleanorAgency) {
      console.log(`\n👥 Members of ${eleanorAgency.agencies.name}:`);
      const { data: members, error: membersError } = await supabase
        .from('agency_members')
        .select(`
          user_id,
          role,
          invitation_status,
          joined_at,
          users!user_id (
            id,
            email,
            full_name
          )
        `)
        .eq('agency_id', eleanorAgency.agencies.id)
        .eq('invitation_status', 'accepted');
      
      if (membersError) {
        console.error('❌ Error fetching members:', membersError);
      } else {
        members?.forEach((member, index) => {
          console.log(`   ${index + 1}. ${member.users?.full_name || member.users?.email || 'Unknown'}`);
          console.log(`      Email: ${member.users?.email || 'Unknown'}`);
          console.log(`      Role: ${member.role}`);
          console.log(`      Joined: ${new Date(member.joined_at).toLocaleDateString()}`);
        });
      }
    }
    
    console.log('\n📝 Manual Steps to Add a Colleague:');
    console.log('1. The colleague needs to sign up with their email address');
    console.log('2. Once they sign up, they will have a user ID in both auth.users and users tables');
    console.log('3. Then you can add them to the agency using this SQL:');
    console.log('');
    console.log('   INSERT INTO agency_members (agency_id, user_id, role, invitation_status)');
    console.log(`   VALUES ('${eleanorAgency?.agencies?.id || 'AGENCY_ID'}', 'COLLEAGUE_USER_ID', 'manager', 'accepted');`);
    console.log('');
    console.log('4. Or use the Supabase dashboard to add them to the agency_members table');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getAgencySummary();
