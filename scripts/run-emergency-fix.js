require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runEmergencyFix() {
  try {
    console.log('🚨 Running emergency agency fix...');
    
    // First, let's check the current state
    console.log('\n📊 Current state:');
    
    const { data: agencies } = await supabase
      .from('agencies')
      .select('*');
    console.log('Agencies:', agencies?.length || 0);
    
    const { data: memberships } = await supabase
      .from('agency_members')
      .select('*');
    console.log('Agency memberships:', memberships?.length || 0);
    
    const { data: buildings } = await supabase
      .from('buildings')
      .select('id, name, agency_id');
    console.log('Buildings:', buildings?.length || 0);
    
    // Now let's run the emergency fix
    console.log('\n🔧 Applying emergency fix...');
    
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
    } else {
      console.log('✅ Created default agency:', defaultAgency.name);
    }
    
    // Step 2: Get all users and add them to the default agency
    console.log('2. Adding users to default agency...');
    
    // First, get the default agency ID
    const { data: agencies2 } = await supabase
      .from('agencies')
      .select('id')
      .eq('slug', 'default')
      .single();
    
    if (!agencies2) {
      console.error('❌ Could not find default agency');
      return;
    }
    
    const defaultAgencyId = agencies2.id;
    console.log('Default agency ID:', defaultAgencyId);
    
    // Get all users from the users table
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .limit(10);
    
    if (users) {
      for (const user of users) {
        console.log(`Adding user ${user.email} to default agency...`);
        
        const { error: membershipError } = await supabase
          .from('agency_members')
          .insert({
            agency_id: defaultAgencyId,
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
    }
    
    // Step 3: Check final state
    console.log('\n📊 Final state:');
    
    const { data: finalAgencies } = await supabase
      .from('agencies')
      .select('*');
    console.log('Agencies:', finalAgencies?.length || 0);
    finalAgencies?.forEach(agency => {
      console.log(`  - ${agency.name} (${agency.slug})`);
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
    
    console.log('\n✅ Emergency fix completed!');
    
  } catch (error) {
    console.error('❌ Error running emergency fix:', error);
  }
}

runEmergencyFix();
