require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColleagueToAgency() {
  try {
    console.log('👥 Adding colleague to Eleanor\'s agency...');
    
    // Step 1: Find Eleanor's user record
    const { data: eleanor, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();
    
    if (userError || !eleanor) {
      console.error('❌ Could not find Eleanor\'s user record:', userError?.message);
      return;
    }
    
    console.log('✅ Found Eleanor:', eleanor.full_name, `(${eleanor.email})`);
    
    // Step 2: Get Eleanor's agency
    const { data: memberships, error: membershipError } = await supabase
      .from('agency_members')
      .select(`
        agency_id,
        role,
        agencies!agency_id (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', eleanor.id)
      .eq('invitation_status', 'accepted')
      .single();
    
    if (membershipError || !memberships) {
      console.error('❌ Could not find Eleanor\'s agency membership:', membershipError?.message);
      return;
    }
    
    const eleanorAgency = memberships.agencies;
    console.log('✅ Eleanor\'s Agency:', eleanorAgency.name, `(${eleanorAgency.slug})`);
    console.log('   Agency ID:', eleanorAgency.id);
    
    // Step 3: Get colleague email from user input
    const colleagueEmail = process.argv[2];
    if (!colleagueEmail) {
      console.log('❌ Please provide colleague email as argument:');
      console.log('   node scripts/add-colleague-to-agency.js colleague@email.com');
      return;
    }
    
    console.log('👤 Adding colleague:', colleagueEmail);
    
    // Step 4: Check if colleague user exists
    let colleague;
    const { data: existingColleague, error: colleagueError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', colleagueEmail)
      .single();
    
    if (colleagueError || !existingColleague) {
      console.log('⚠️ Colleague user not found, creating user record...');
      
      // Create user record (they'll need to sign up properly later)
      const { data: newColleague, error: createError } = await supabase
        .from('users')
        .insert({
          email: colleagueEmail,
          full_name: colleagueEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          first_name: colleagueEmail.split('@')[0].split('.')[0],
          last_name: colleagueEmail.split('@')[0].split('.').slice(1).join(' ').replace(/\b\w/g, l => l.toUpperCase())
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating colleague user:', createError);
        return;
      }
      
      console.log('✅ Created colleague user:', newColleague.full_name);
      colleague = newColleague;
    } else {
      console.log('✅ Found existing colleague:', existingColleague.full_name);
      colleague = existingColleague;
    }
    
    // Step 5: Add colleague to Eleanor's agency
    const { error: addMembershipError } = await supabase
      .from('agency_members')
      .insert({
        agency_id: eleanorAgency.id,
        user_id: colleague.id,
        role: 'manager', // You can change this to 'admin' or 'viewer' as needed
        invitation_status: 'accepted'
      });
    
    if (addMembershipError) {
      if (addMembershipError.code === '23505') { // Unique constraint violation
        console.log('ℹ️ Colleague is already a member of this agency');
      } else {
        console.error('❌ Error adding colleague to agency:', addMembershipError);
        return;
      }
    } else {
      console.log('✅ Added colleague to agency successfully');
    }
    
    // Step 6: Check if Ashwood House exists and link it to the agency
    console.log('\n🏠 Checking Ashwood House...');
    const { data: ashwood, error: ashwoodError } = await supabase
      .from('buildings')
      .select('id, name, agency_id, address')
      .eq('name', 'Ashwood House')
      .single();
    
    if (ashwoodError || !ashwood) {
      console.log('⚠️ Ashwood House not found, creating it...');
      
      // Create Ashwood House
      const { data: newAshwood, error: createAshwoodError } = await supabase
        .from('buildings')
        .insert({
          name: 'Ashwood House',
          address: '123 Ashwood Gardens, London SW19 8QR', // You can update this
          agency_id: eleanorAgency.id,
          unit_count: 0, // Will be updated when units are added
          is_hrb: false,
          building_type: 'residential'
        })
        .select()
        .single();
      
      if (createAshwoodError) {
        console.error('❌ Error creating Ashwood House:', createAshwoodError);
        return;
      }
      
      console.log('✅ Created Ashwood House:', newAshwood.name);
      console.log('   ID:', newAshwood.id);
      console.log('   Agency ID:', newAshwood.agency_id);
    } else {
      console.log('✅ Found Ashwood House:', ashwood.name);
      console.log('   ID:', ashwood.id);
      console.log('   Current Agency ID:', ashwood.agency_id);
      
      // Update Ashwood House to Eleanor's agency if it's not already
      if (ashwood.agency_id !== eleanorAgency.id) {
        console.log('🔄 Updating Ashwood House agency...');
        
        const { error: updateAshwoodError } = await supabase
          .from('buildings')
          .update({ agency_id: eleanorAgency.id })
          .eq('id', ashwood.id);
        
        if (updateAshwoodError) {
          console.error('❌ Error updating Ashwood House agency:', updateAshwoodError);
          return;
        }
        
        console.log('✅ Updated Ashwood House to Eleanor\'s agency');
      } else {
        console.log('ℹ️ Ashwood House is already linked to Eleanor\'s agency');
      }
    }
    
    // Step 7: Summary
    console.log('\n🎉 Summary:');
    console.log(`✅ Colleague ${colleagueEmail} added to agency: ${eleanorAgency.name}`);
    console.log(`✅ Ashwood House linked to agency: ${eleanorAgency.name}`);
    console.log(`✅ Agency ID: ${eleanorAgency.id}`);
    console.log(`✅ Agency Slug: ${eleanorAgency.slug}`);
    
    console.log('\n📋 Next steps:');
    console.log('1. The colleague should sign up with their email address');
    console.log('2. They will automatically have access to the agency and Ashwood House');
    console.log('3. You can adjust their role in the agency_members table if needed');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addColleagueToAgency();
