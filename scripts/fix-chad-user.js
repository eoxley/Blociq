require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixChadUser() {
  try {
    console.log('🔧 Fixing Chad Bryant\'s user record...');
    
    // Step 1: Find Chad in users table
    const { data: chad, error: chadError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'Chadbryant2401@gmail.com')
      .single();
    
    if (chadError || !chad) {
      console.error('❌ Could not find Chad in users table:', chadError?.message);
      return;
    }
    
    console.log('✅ Found Chad in users table:');
    console.log('   ID:', chad.id);
    console.log('   Email:', chad.email);
    console.log('   Full Name:', chad.full_name);
    console.log('   Created:', chad.created_at);
    
    // Step 2: Check if Chad exists in auth.users
    console.log('\n🔍 Checking auth.users...');
    
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(chad.id);
      
      if (authError) {
        console.log('⚠️ Chad not found in auth.users with current ID, searching by email...');
        
        // Search for Chad by email in auth.users
        const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        });
        
        if (listError) {
          console.error('❌ Error listing users:', listError);
          return;
        }
        
        const chadAuth = allUsers?.users?.find(u => u.email?.toLowerCase() === chad.email.toLowerCase());
        
        if (chadAuth) {
          console.log('✅ Found Chad in auth.users with different ID:', chadAuth.id);
          console.log('   Auth ID:', chadAuth.id);
          console.log('   Users table ID:', chad.id);
          
          // Update the users table to match the auth ID
          const { error: updateError } = await supabase
            .from('users')
            .update({ id: chadAuth.id })
            .eq('email', chad.email);
          
          if (updateError) {
            console.error('❌ Error updating users table:', updateError);
            return;
          }
          
          console.log('✅ Updated users table ID to match auth.users');
          chad.id = chadAuth.id;
        } else {
          console.log('❌ Chad not found in auth.users at all');
          console.log('Chad needs to sign up properly to have an auth.users record');
          return;
        }
      } else {
        console.log('✅ Chad found in auth.users:', authUser.user.id);
        if (authUser.user.id !== chad.id) {
          console.log('⚠️ ID mismatch - updating users table...');
          const { error: updateError } = await supabase
            .from('users')
            .update({ id: authUser.user.id })
            .eq('email', chad.email);
          
          if (updateError) {
            console.error('❌ Error updating users table:', updateError);
            return;
          }
          
          console.log('✅ Updated users table ID to match auth.users');
          chad.id = authUser.user.id;
        }
      }
    } catch (error) {
      console.error('❌ Error checking auth.users:', error);
      return;
    }
    
    // Step 3: Now add Chad to the BlocIQ agency
    console.log('\n👥 Adding Chad to BlocIQ agency...');
    
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('id, name, slug')
      .eq('slug', 'blociq')
      .single();
    
    if (agencyError || !agency) {
      console.error('❌ Could not find BlocIQ agency:', agencyError?.message);
      return;
    }
    
    console.log('✅ Found agency:', agency.name, '(ID:', agency.id, ')');
    
    // Check if Chad is already a member
    const { data: existingMembership, error: membershipError } = await supabase
      .from('agency_members')
      .select('*')
      .eq('agency_id', agency.id)
      .eq('user_id', chad.id)
      .single();
    
    if (membershipError && membershipError.code !== 'PGRST116') {
      console.error('❌ Error checking existing membership:', membershipError);
      return;
    }
    
    if (existingMembership) {
      console.log('ℹ️ Chad is already a member of this agency');
      console.log(`   Role: ${existingMembership.role}`);
      console.log(`   Status: ${existingMembership.invitation_status}`);
    } else {
      const { error: addMembershipError } = await supabase
        .from('agency_members')
        .insert({
          agency_id: agency.id,
          user_id: chad.id,
          role: 'manager',
          invitation_status: 'accepted'
        });
      
      if (addMembershipError) {
        console.error('❌ Error adding Chad to agency:', addMembershipError);
        return;
      }
      
      console.log('✅ Added Chad to BlocIQ agency as manager');
    }
    
    // Step 4: Verify Chad's access
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
      .eq('user_id', chad.id)
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
    
    // Step 5: Show what Chad now has access to
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

fixChadUser();
