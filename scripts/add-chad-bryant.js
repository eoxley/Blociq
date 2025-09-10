require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addChadBryant() {
  try {
    console.log('👤 Looking for Chad Bryant...');
    
    // Step 1: Find Chad Bryant in users table
    const { data: chad, error: chadError } = await supabase
      .from('users')
      .select('id, email, full_name, first_name, last_name')
      .or('email.ilike.%chad%bryant%,full_name.ilike.%chad%bryant%,first_name.ilike.%chad%,last_name.ilike.%bryant%')
      .limit(5);
    
    if (chadError) {
      console.error('❌ Error searching for Chad:', chadError);
      return;
    }
    
    if (!chad || chad.length === 0) {
      console.log('❌ Chad Bryant not found in users table');
      console.log('Available users:');
      
      // Show all users for reference
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, email, full_name, first_name, last_name')
        .limit(10);
      
      if (!allUsersError && allUsers) {
        allUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.full_name || user.email} (${user.email})`);
        });
      }
      return;
    }
    
    console.log('✅ Found potential matches for Chad Bryant:');
    chad.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.full_name || 'No name'} (${user.email})`);
      console.log(`      ID: ${user.id}`);
      console.log(`      First: ${user.first_name || 'N/A'}, Last: ${user.last_name || 'N/A'}`);
    });
    
    // Use the first match (you can modify this if needed)
    const chadUser = chad[0];
    console.log(`\n👤 Using: ${chadUser.full_name || chadUser.email} (ID: ${chadUser.id})`);
    
    // Step 2: Get Eleanor's agency (BlocIQ)
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('id, name, slug')
      .eq('slug', 'blociq')
      .single();
    
    if (agencyError || !agency) {
      console.error('❌ Could not find BlocIQ agency:', agencyError?.message);
      return;
    }
    
    console.log(`✅ Found agency: ${agency.name} (ID: ${agency.id})`);
    
    // Step 3: Check if Chad is already a member
    const { data: existingMembership, error: membershipError } = await supabase
      .from('agency_members')
      .select('*')
      .eq('agency_id', agency.id)
      .eq('user_id', chadUser.id)
      .single();
    
    if (membershipError && membershipError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking existing membership:', membershipError);
      return;
    }
    
    if (existingMembership) {
      console.log('ℹ️ Chad is already a member of this agency');
      console.log(`   Role: ${existingMembership.role}`);
      console.log(`   Status: ${existingMembership.invitation_status}`);
      return;
    }
    
    // Step 4: Add Chad to the agency
    console.log('👥 Adding Chad to BlocIQ agency...');
    const { error: addMembershipError } = await supabase
      .from('agency_members')
      .insert({
        agency_id: agency.id,
        user_id: chadUser.id,
        role: 'manager', // You can change this to 'admin' or 'viewer' as needed
        invitation_status: 'accepted'
      });
    
    if (addMembershipError) {
      console.error('❌ Error adding Chad to agency:', addMembershipError);
      return;
    }
    
    console.log('✅ Successfully added Chad to BlocIQ agency!');
    console.log(`   Role: manager`);
    console.log(`   Status: accepted`);
    
    // Step 5: Verify the addition
    console.log('\n🔍 Verifying Chad\'s access...');
    const { data: chadAgency, error: verifyError } = await supabase
      .from('agency_members')
      .select(`
        agency_id,
        role,
        invitation_status,
        joined_at,
        agencies!agency_id (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', chadUser.id)
      .eq('invitation_status', 'accepted')
      .single();
    
    if (verifyError || !chadAgency) {
      console.log('⚠️ Could not verify Chad\'s agency membership');
    } else {
      console.log('✅ Verification successful:');
      console.log(`   Agency: ${chadAgency.agencies.name}`);
      console.log(`   Role: ${chadAgency.role}`);
      console.log(`   Status: ${chadAgency.invitation_status}`);
    }
    
    // Step 6: Show what Chad now has access to
    console.log('\n🏠 Chad now has access to:');
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address, unit_count')
      .eq('agency_id', agency.id);
    
    if (buildingsError) {
      console.log('   Could not fetch buildings list');
    } else {
      buildings?.forEach((building, index) => {
        console.log(`   ${index + 1}. ${building.name}`);
        console.log(`      Address: ${building.address || 'Not set'}`);
        console.log(`      Units: ${building.unit_count || 0}`);
      });
    }
    
    console.log('\n🎉 Chad Bryant is now set up!');
    console.log('He can now access the BlocIQ agency and all its buildings including Ashwood House.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addChadBryant();
