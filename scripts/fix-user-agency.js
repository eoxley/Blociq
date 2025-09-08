require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUserAgency() {
  try {
    console.log('🔧 Fixing user agency membership...');
    
    // First, let's check what agencies exist
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('*');
    
    if (agenciesError) {
      console.error('❌ Error fetching agencies:', agenciesError);
      return;
    }
    
    console.log('✅ Found agencies:', agencies?.length || 0);
    agencies?.forEach(agency => {
      console.log(`  - ${agency.name} (${agency.id}) - ${agency.slug}`);
    });
    
    // Check if there's a default agency
    let defaultAgency = agencies?.find(a => a.slug === 'default');
    
    if (!defaultAgency) {
      console.log('📝 Creating default agency...');
      const { data: newAgency, error: createError } = await supabase
        .from('agencies')
        .insert({
          name: 'Default Agency',
          slug: 'default',
          status: 'active'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating default agency:', createError);
        return;
      }
      
      defaultAgency = newAgency;
      console.log('✅ Created default agency:', defaultAgency.name);
    } else {
      console.log('✅ Found existing default agency:', defaultAgency.name);
    }
    
    // Now let's check if there are any users without agency memberships
    console.log('\n👥 Checking for users without agency memberships...');
    
    // Get all users from the users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .limit(10);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log('✅ Found users:', users?.length || 0);
    
    // Check each user's agency membership
    for (const user of users || []) {
      console.log(`\n🔍 Checking user: ${user.email} (${user.id})`);
      
      const { data: memberships, error: membershipError } = await supabase
        .from('agency_members')
        .select('*')
        .eq('user_id', user.id);
      
      if (membershipError) {
        console.error('❌ Error checking memberships:', membershipError);
        continue;
      }
      
      if (memberships?.length === 0) {
        console.log('📝 User has no agency membership, adding to default agency...');
        
        const { error: addError } = await supabase
          .from('agency_members')
          .insert({
            agency_id: defaultAgency.id,
            user_id: user.id,
            role: 'owner',
            invitation_status: 'accepted'
          });
        
        if (addError) {
          console.error('❌ Error adding user to agency:', addError);
        } else {
          console.log('✅ Added user to default agency');
        }
      } else {
        console.log('✅ User already has agency memberships:', memberships.length);
        memberships.forEach(membership => {
          console.log(`  - Agency: ${membership.agency_id} (${membership.role})`);
        });
      }
    }
    
    // Check buildings
    console.log('\n🏠 Checking buildings...');
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, agency_id');
    
    if (buildingsError) {
      console.error('❌ Error fetching buildings:', buildingsError);
    } else {
      console.log('✅ Found buildings:', buildings?.length || 0);
      buildings?.forEach(building => {
        console.log(`  - ${building.name} (${building.id}) - Agency: ${building.agency_id}`);
      });
      
      // Check for Ashwood House specifically
      const ashwood = buildings?.find(b => b.name.toLowerCase().includes('ashwood'));
      if (ashwood) {
        console.log('✅ Found Ashwood House:', ashwood.name);
      } else {
        console.log('❌ Ashwood House not found');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixUserAgency();
