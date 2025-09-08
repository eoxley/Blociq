#!/usr/bin/env node

/**
 * Simple Agency Fix
 * This script creates a simple agency membership for eleanor.oxley@blociq.co.uk
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

async function simpleAgencyFix() {
  console.log('🔧 Simple agency fix for eleanor.oxley@blociq.co.uk...\n');

  try {
    // We know the user ID from previous checks
    const userId = 'cd81839a-c28d-4665-a361-b7db95d65526';
    
    console.log(`1. Using user ID: ${userId}`);

    // Step 1: Create or get default agency
    console.log('\n2. Creating/getting default agency...');
    let { data: defaultAgency, error: agencyError } = await supabase
      .from('agencies')
      .select('id')
      .eq('slug', 'default')
      .single();

    if (agencyError || !defaultAgency) {
      // Create default agency
      const { data: newAgency, error: createError } = await supabase
        .from('agencies')
        .insert({
          name: 'Default Agency',
          slug: 'default',
          status: 'active'
        })
        .select('id')
        .single();

      if (createError) {
        console.log('   ❌ Error creating agency:', createError.message);
        return;
      }

      defaultAgency = newAgency;
      console.log('   ✅ Created default agency');
    } else {
      console.log('   ✅ Found existing default agency');
    }

    // Step 2: Check if membership already exists
    console.log('\n3. Checking existing membership...');
    const { data: existingMembership, error: membershipError } = await supabase
      .from('agency_members')
      .select('*')
      .eq('user_id', userId)
      .eq('agency_id', defaultAgency.id)
      .single();

    if (membershipError && membershipError.code !== 'PGRST116') {
      console.log('   ❌ Error checking membership:', membershipError.message);
      return;
    }

    if (existingMembership) {
      console.log('   ✅ Membership already exists');
      return;
    }

    // Step 3: Create membership
    console.log('\n4. Creating agency membership...');
    const { error: createMembershipError } = await supabase
      .from('agency_members')
      .insert({
        agency_id: defaultAgency.id,
        user_id: userId,
        role: 'admin',
        invitation_status: 'accepted'
      });

    if (createMembershipError) {
      console.log('   ❌ Error creating membership:', createMembershipError.message);
      console.log('   Details:', createMembershipError.details);
      console.log('   Hint:', createMembershipError.hint);
      return;
    }

    console.log('   ✅ Created agency membership');

    // Step 4: Verify
    console.log('\n5. Verifying membership...');
    const { data: verifyMembership, error: verifyError } = await supabase
      .from('agency_members')
      .select('*, agencies(*)')
      .eq('user_id', userId)
      .single();

    if (verifyError) {
      console.log('   ❌ Error verifying membership:', verifyError.message);
      return;
    }

    console.log(`   ✅ Verified: ${verifyMembership.agencies?.name} (${verifyMembership.role})`);

    console.log('\n🎉 Agency membership created successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the fix
simpleAgencyFix();
