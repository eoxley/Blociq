#!/usr/bin/env node

/**
 * Fix Agency Membership
 * This script fixes the agency membership for eleanor.oxley@blociq.co.uk
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAgencyMembership() {
  console.log('🔧 Fixing agency membership for eleanor.oxley@blociq.co.uk...\n');

  try {
    // Step 1: Get user from auth.users (this is what agency_members references)
    console.log('1. Getting user from auth.users...');
    
    // First try to get from auth.users via RPC
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('*')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();

    let user;
    if (authError || !authUsers) {
      // Fallback: get from users table and use that ID
      console.log('   ⚠️ Not found in auth.users, trying users table...');
      const { data: usersTableUser, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'eleanor.oxley@blociq.co.uk')
        .single();

      if (usersError || !usersTableUser) {
        console.log('   ❌ User not found in either table:', usersError?.message);
        return;
      }

      user = usersTableUser;
      console.log(`   ✅ User found in users table: ${user.email} (ID: ${user.id})`);
    } else {
      user = authUsers;
      console.log(`   ✅ User found in auth.users: ${user.email} (ID: ${user.id})`);
    }

    // Step 2: Check existing agency memberships
    console.log('\n2. Checking existing agency memberships...');
    const { data: existingMemberships, error: membershipsError } = await supabase
      .from('agency_members')
      .select('*, agencies(*)')
      .eq('user_id', user.id);

    if (membershipsError) {
      console.log('   ❌ Error checking memberships:', membershipsError.message);
      return;
    }

    console.log(`   📊 Found ${existingMemberships.length} existing memberships:`);
    existingMemberships.forEach((membership, index) => {
      console.log(`      ${index + 1}. ${membership.agencies?.name} (${membership.role})`);
    });

    // Step 3: Clean up duplicate memberships
    if (existingMemberships.length > 1) {
      console.log('\n3. Cleaning up duplicate memberships...');
      
      // Keep the first one, delete the rest
      const toDelete = existingMemberships.slice(1);
      for (const membership of toDelete) {
        const { error: deleteError } = await supabase
          .from('agency_members')
          .delete()
          .eq('agency_id', membership.agency_id)
          .eq('user_id', membership.user_id);

        if (deleteError) {
          console.log(`   ⚠️ Error deleting membership: ${deleteError.message}`);
        } else {
          console.log(`   ✅ Deleted duplicate membership for ${membership.agencies?.name}`);
        }
      }
    } else if (existingMemberships.length === 0) {
      console.log('\n3. No agency memberships found, creating default...');
      
      // Check if there's a default agency
      let { data: defaultAgency } = await supabase
        .from('agencies')
        .select('id')
        .eq('slug', 'default')
        .single();

      if (!defaultAgency) {
        // Create default agency
        const { data: newAgency, error: agencyError } = await supabase
          .from('agencies')
          .insert({
            name: 'Default Agency',
            slug: 'default',
            status: 'active'
          })
          .select('id')
          .single();

        if (agencyError) {
          console.log('   ❌ Error creating default agency:', agencyError.message);
          return;
        }

        defaultAgency = newAgency;
        console.log('   ✅ Created default agency');
      } else {
        console.log('   ✅ Found existing default agency');
      }

      // Add user to agency
      const { error: membershipError } = await supabase
        .from('agency_members')
        .insert({
          agency_id: defaultAgency.id,
          user_id: user.id,
          role: 'admin',
          invitation_status: 'accepted'
        });

      if (membershipError) {
        console.log('   ❌ Error creating agency membership:', membershipError.message);
        return;
      }

      console.log('   ✅ Created agency membership');
    } else {
      console.log('\n3. Single membership found, no cleanup needed');
    }

    // Step 4: Verify final state
    console.log('\n4. Verifying final state...');
    const { data: finalMemberships, error: finalError } = await supabase
      .from('agency_members')
      .select('*, agencies(*)')
      .eq('user_id', user.id);

    if (finalError) {
      console.log('   ❌ Error verifying memberships:', finalError.message);
      return;
    }

    console.log(`   ✅ Final membership count: ${finalMemberships.length}`);
    finalMemberships.forEach((membership, index) => {
      console.log(`      ${index + 1}. ${membership.agencies?.name} (${membership.role})`);
    });

    console.log('\n🎉 Agency membership fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing agency membership:', error);
  }
}

// Run the fix
fixAgencyMembership();
