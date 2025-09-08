require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SERVICE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixWithServiceRole() {
  try {
    console.log('🔧 Fixing with service role (bypasses RLS)...');
    
    // Step 1: Create default agency
    console.log('1. Creating default agency...');
    const { data: defaultAgency, error: agencyError } = await supabase
      .from('agencies')
      .insert({
        name: 'Default Agency',
        slug: 'default',
        status: 'active'
      })
      .select()
      .single();
    
    if (agencyError) {
      console.log('Agency might already exist:', agencyError.message);
      
      // Try to get existing default agency
      const { data: existingAgency } = await supabase
        .from('agencies')
        .select('*')
        .eq('slug', 'default')
        .single();
      
      if (existingAgency) {
        console.log('✅ Found existing default agency:', existingAgency.name);
      } else {
        console.error('❌ Could not create or find default agency');
        return;
      }
    } else {
      console.log('✅ Created default agency:', defaultAgency.name);
    }
    
    // Step 2: Get the default agency ID
    const { data: agencies } = await supabase
      .from('agencies')
      .select('id, name, slug')
      .eq('slug', 'default')
      .single();
    
    if (!agencies) {
      console.error('❌ Could not find default agency');
      return;
    }
    
    console.log('Default agency:', agencies.name, '(', agencies.id, ')');
    
    // Step 3: Get all users and add them to the default agency
    console.log('2. Adding users to default agency...');
    
    // Get all users from the users table
    const { data: users } = await supabase
      .from('users')
      .select('id, email, full_name')
      .limit(10);
    
    if (users && users.length > 0) {
      for (const user of users) {
        console.log(`Adding user ${user.email} to default agency...`);
        
        const { error: membershipError } = await supabase
          .from('agency_members')
          .insert({
            agency_id: agencies.id,
            user_id: user.id,
            role: 'owner',
            invitation_status: 'accepted'
          });
        
        if (membershipError) {
          console.log('Membership might already exist:', membershipError.message);
        } else {
          console.log('✅ Added user to agency');
        }
      }
    } else {
      console.log('No users found in users table');
    }
    
    // Step 4: Check if there are any buildings and assign them to the default agency
    console.log('3. Checking buildings...');
    const { data: buildings } = await supabase
      .from('buildings')
      .select('id, name, agency_id');
    
    if (buildings && buildings.length > 0) {
      console.log('Found buildings:', buildings.length);
      
      for (const building of buildings) {
        if (!building.agency_id) {
          console.log(`Assigning building ${building.name} to default agency...`);
          
          const { error: updateError } = await supabase
            .from('buildings')
            .update({ agency_id: agencies.id })
            .eq('id', building.id);
          
          if (updateError) {
            console.error('Error updating building:', updateError.message);
          } else {
            console.log('✅ Updated building agency');
          }
        } else {
          console.log(`Building ${building.name} already has agency: ${building.agency_id}`);
        }
      }
    } else {
      console.log('No buildings found');
    }
    
    // Step 5: Check final state
    console.log('\n📊 Final state:');
    
    const { data: finalAgencies } = await supabase
      .from('agencies')
      .select('*');
    console.log('Agencies:', finalAgencies?.length || 0);
    finalAgencies?.forEach(agency => {
      console.log(`  - ${agency.name} (${agency.slug}) - ${agency.id}`);
    });
    
    const { data: finalMemberships } = await supabase
      .from('agency_members')
      .select(`
        agency_id,
        user_id,
        role,
        agencies:agency_id (name)
      `);
    console.log('Agency memberships:', finalMemberships?.length || 0);
    finalMemberships?.forEach(membership => {
      console.log(`  - User ${membership.user_id} in ${membership.agencies?.name} (${membership.role})`);
    });
    
    const { data: finalBuildings } = await supabase
      .from('buildings')
      .select('id, name, agency_id');
    console.log('Buildings:', finalBuildings?.length || 0);
    finalBuildings?.forEach(building => {
      console.log(`  - ${building.name} (Agency: ${building.agency_id})`);
    });
    
    console.log('\n✅ Fix completed!');
    console.log('\nNext steps:');
    console.log('1. Refresh your browser');
    console.log('2. Check if agency name appears');
    console.log('3. Check if Ashwood House appears in buildings');
    
  } catch (error) {
    console.error('❌ Error running fix:', error);
  }
}

fixWithServiceRole();
