#!/usr/bin/env node

/**
 * Find Auth User
 * This script finds the correct user ID in auth.users table
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

async function findAuthUser() {
  console.log('🔍 Finding user in auth.users table...\n');

  try {
    // Try to get all users from auth.users
    console.log('1. Getting all users from auth.users...');
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, created_at')
      .limit(10);

    if (authError) {
      console.log('   ❌ Error accessing auth.users:', authError.message);
      return;
    }

    console.log(`   📊 Found ${authUsers.length} users in auth.users:`);
    authUsers.forEach((user, index) => {
      console.log(`      ${index + 1}. ${user.email} (ID: ${user.id})`);
    });

    // Look for eleanor.oxley@blociq.co.uk
    const eleanorUser = authUsers.find(u => u.email === 'eleanor.oxley@blociq.co.uk');
    
    if (eleanorUser) {
      console.log(`\n✅ Found eleanor.oxley@blociq.co.uk in auth.users:`);
      console.log(`   ID: ${eleanorUser.id}`);
      console.log(`   Email: ${eleanorUser.email}`);
      console.log(`   Created: ${eleanorUser.created_at}`);
      
      // Now try to create agency membership with this ID
      console.log('\n2. Creating agency membership with correct ID...');
      
      // Get default agency
      const { data: defaultAgency } = await supabase
        .from('agencies')
        .select('id')
        .eq('slug', 'default')
        .single();

      if (defaultAgency) {
        const { error: membershipError } = await supabase
          .from('agency_members')
          .insert({
            agency_id: defaultAgency.id,
            user_id: eleanorUser.id,
            role: 'admin',
            invitation_status: 'accepted'
          });

        if (membershipError) {
          console.log('   ❌ Error creating membership:', membershipError.message);
        } else {
          console.log('   ✅ Agency membership created successfully!');
        }
      } else {
        console.log('   ❌ No default agency found');
      }
    } else {
      console.log('\n❌ eleanor.oxley@blociq.co.uk not found in auth.users');
      console.log('   This means the user needs to be created in auth.users first');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the search
findAuthUser();
