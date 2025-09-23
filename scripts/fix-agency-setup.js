/**
 * Fix Agency Setup Script
 *
 * This script diagnoses and fixes user agency assignments and building linkages
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

const ASHWOOD_BUILDING_ID = '2beeec1d-a94e-4058-b881-213d74cc6830';
const USER_ID = '938498a6-2906-4a75-bc91-5d0d586b227e'; // From the logs

async function diagnoseAndFix() {
  console.log('🔍 Starting agency setup diagnosis...\n');

  // 1. Check current user state
  console.log('1️⃣ Checking current user state...');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', USER_ID)
    .single();

  console.log('User data:', user);
  console.log('User error:', userError);

  // 2. Check profiles table
  console.log('\n2️⃣ Checking profiles table...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', USER_ID)
    .single();

  console.log('Profile data:', profile);
  console.log('Profile error:', profileError);

  // 3. Check existing agencies
  console.log('\n3️⃣ Checking existing agencies...');
  const { data: agencies, error: agenciesError } = await supabase
    .from('agencies')
    .select('*')
    .order('created_at', { ascending: true });

  console.log('Agencies:', agencies);
  console.log('Agencies error:', agenciesError);

  // 4. Check agency memberships
  console.log('\n4️⃣ Checking agency memberships...');
  const { data: memberships, error: membershipsError } = await supabase
    .from('agency_members')
    .select(`
      *,
      agencies:agency_id (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', USER_ID);

  console.log('Memberships:', memberships);
  console.log('Memberships error:', membershipsError);

  // 5. Check Ashwood House
  console.log('\n5️⃣ Checking Ashwood House building...');
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', ASHWOOD_BUILDING_ID)
    .single();

  console.log('Building data:', building);
  console.log('Building error:', buildingError);

  // NOW FIX THE ISSUES
  console.log('\n🔧 Starting fixes...\n');

  let agencyId = null;

  // Create or find BlocIQ agency
  if (!agencies || agencies.length === 0) {
    console.log('6️⃣ Creating BlocIQ agency...');
    const { data: newAgency, error: createAgencyError } = await supabase
      .from('agencies')
      .insert({
        name: 'BlocIQ Property Management',
        slug: 'blociq-property-management',
        description: 'Primary property management agency',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createAgencyError) {
      console.error('❌ Failed to create agency:', createAgencyError);
      return;
    }

    agencyId = newAgency.id;
    console.log('✅ Created agency:', newAgency);
  } else {
    agencyId = agencies[0].id;
    console.log('✅ Using existing agency:', agencies[0]);
  }

  // Create or update user profile
  console.log('\n7️⃣ Fixing user profile...');
  if (!profile) {
    // Create profile
    const { data: newProfile, error: createProfileError } = await supabase
      .from('profiles')
      .insert({
        id: USER_ID,
        user_id: USER_ID,
        agency_id: agencyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createProfileError) {
      console.error('❌ Failed to create profile:', createProfileError);
    } else {
      console.log('✅ Created profile:', newProfile);
    }
  } else if (!profile.agency_id) {
    // Update existing profile
    const { data: updatedProfile, error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        agency_id: agencyId,
        user_id: USER_ID,
        updated_at: new Date().toISOString()
      })
      .eq('id', USER_ID)
      .select()
      .single();

    if (updateProfileError) {
      console.error('❌ Failed to update profile:', updateProfileError);
    } else {
      console.log('✅ Updated profile:', updatedProfile);
    }
  }

  // Create or update user in users table
  console.log('\n8️⃣ Fixing users table...');
  if (!user) {
    // Create user entry
    const { data: newUser, error: createUserError } = await supabase
      .from('users')
      .insert({
        id: USER_ID,
        agency_id: agencyId,
        email: 'user@blociq.co.uk', // You can update this
        first_name: 'BlocIQ',
        last_name: 'User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createUserError) {
      console.error('❌ Failed to create user:', createUserError);
    } else {
      console.log('✅ Created user:', newUser);
    }
  } else if (!user.agency_id) {
    // Update existing user
    const { data: updatedUser, error: updateUserError } = await supabase
      .from('users')
      .update({
        agency_id: agencyId,
        updated_at: new Date().toISOString()
      })
      .eq('id', USER_ID)
      .select()
      .single();

    if (updateUserError) {
      console.error('❌ Failed to update user:', updateUserError);
    } else {
      console.log('✅ Updated user:', updatedUser);
    }
  }

  // Create agency membership
  console.log('\n9️⃣ Creating/updating agency membership...');
  if (!memberships || memberships.length === 0) {
    const { data: newMembership, error: membershipError } = await supabase
      .from('agency_members')
      .insert({
        user_id: USER_ID,
        agency_id: agencyId,
        role: 'admin',
        invitation_status: 'accepted',
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (membershipError) {
      console.error('❌ Failed to create membership:', membershipError);
    } else {
      console.log('✅ Created membership:', newMembership);
    }
  } else {
    console.log('✅ Membership already exists');
  }

  // Fix Ashwood House agency assignment
  console.log('\n🔟 Fixing Ashwood House agency assignment...');
  if (building && !building.agency_id) {
    const { data: updatedBuilding, error: updateBuildingError } = await supabase
      .from('buildings')
      .update({
        agency_id: agencyId,
        updated_at: new Date().toISOString()
      })
      .eq('id', ASHWOOD_BUILDING_ID)
      .select()
      .single();

    if (updateBuildingError) {
      console.error('❌ Failed to update building:', updateBuildingError);
    } else {
      console.log('✅ Updated building agency assignment:', updatedBuilding);
    }
  } else if (building) {
    console.log('✅ Building already has agency assignment');
  } else {
    console.log('⚠️ Building not found - you may need to check the building ID');
  }

  // Final verification
  console.log('\n✅ Verification...');
  const { data: finalProfile } = await supabase
    .from('profiles')
    .select(`
      *,
      agencies:agency_id (
        id,
        name,
        slug
      )
    `)
    .eq('id', USER_ID)
    .single();

  const { data: finalBuilding } = await supabase
    .from('buildings')
    .select(`
      id,
      name,
      agency_id,
      agencies:agency_id (
        id,
        name
      )
    `)
    .eq('id', ASHWOOD_BUILDING_ID)
    .single();

  console.log('Final profile state:', finalProfile);
  console.log('Final building state:', finalBuilding);

  console.log('\n🎉 Agency setup fix completed!');
}

// Run the diagnosis and fix
diagnoseAndFix().catch(console.error);