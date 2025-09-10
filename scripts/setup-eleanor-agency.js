require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupEleanorAgency() {
  try {
    console.log('🏢 Setting up Eleanor\'s agency...');
    
    // Step 1: Check existing agencies
    const { data: existingAgencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('id, name, slug, status')
      .order('name');
    
    if (agenciesError) {
      console.error('❌ Error fetching agencies:', agenciesError);
      return;
    }
    
    console.log('📋 Existing agencies:');
    existingAgencies?.forEach((agency, index) => {
      console.log(`  ${index + 1}. ${agency.name} (${agency.slug}) - ${agency.status}`);
      console.log(`     ID: ${agency.id}`);
    });
    
    // Step 2: Find Eleanor's user record
    const { data: eleanor, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();
    
    if (userError || !eleanor) {
      console.error('❌ Could not find Eleanor\'s user record:', userError?.message);
      return;
    }
    
    console.log('\n✅ Found Eleanor:', eleanor.full_name || 'Eleanor Oxley', `(${eleanor.email})`);
    console.log('   User ID:', eleanor.id);
    
    // Step 3: Check if there's a default agency or create one
    let targetAgency = existingAgencies?.find(a => a.slug === 'default' || a.slug === 'blociq');
    
    if (!targetAgency) {
      console.log('\n📝 Creating BlocIQ agency...');
      const { data: newAgency, error: createAgencyError } = await supabase
        .from('agencies')
        .insert({
          name: 'BlocIQ',
          slug: 'blociq',
          status: 'active',
          domain: 'blociq.co.uk'
        })
        .select()
        .single();
      
      if (createAgencyError) {
        console.error('❌ Error creating agency:', createAgencyError);
        return;
      }
      
      targetAgency = newAgency;
      console.log('✅ Created agency:', targetAgency.name);
    } else {
      console.log('\n✅ Using existing agency:', targetAgency.name);
    }
    
    // Step 4: Add Eleanor to the agency as owner
    console.log('\n👤 Adding Eleanor to agency...');
    const { error: addMembershipError } = await supabase
      .from('agency_members')
      .insert({
        agency_id: targetAgency.id,
        user_id: eleanor.id,
        role: 'owner',
        invitation_status: 'accepted'
      });
    
    if (addMembershipError) {
      if (addMembershipError.code === '23505') { // Unique constraint violation
        console.log('ℹ️ Eleanor is already a member of this agency');
      } else {
        console.error('❌ Error adding Eleanor to agency:', addMembershipError);
        return;
      }
    } else {
      console.log('✅ Added Eleanor to agency as owner');
    }
    
    // Step 5: Check if Ashwood House exists and link it
    console.log('\n🏠 Checking Ashwood House...');
    const { data: ashwood, error: ashwoodError } = await supabase
      .from('buildings')
      .select('id, name, agency_id, address')
      .eq('name', 'Ashwood House')
      .single();
    
    if (ashwoodError || !ashwood) {
      console.log('📝 Creating Ashwood House...');
      const { data: newAshwood, error: createAshwoodError } = await supabase
        .from('buildings')
        .insert({
          name: 'Ashwood House',
          address: '123 Ashwood Gardens, London SW19 8QR',
          agency_id: targetAgency.id,
          unit_count: 0,
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
    } else {
      console.log('✅ Found Ashwood House:', ashwood.name);
      console.log('   ID:', ashwood.id);
      console.log('   Current Agency ID:', ashwood.agency_id);
      
      // Update to Eleanor's agency if different
      if (ashwood.agency_id !== targetAgency.id) {
        console.log('🔄 Updating Ashwood House agency...');
        const { error: updateError } = await supabase
          .from('buildings')
          .update({ agency_id: targetAgency.id })
          .eq('id', ashwood.id);
        
        if (updateError) {
          console.error('❌ Error updating Ashwood House:', updateError);
          return;
        }
        
        console.log('✅ Updated Ashwood House to Eleanor\'s agency');
      } else {
        console.log('ℹ️ Ashwood House is already linked to Eleanor\'s agency');
      }
    }
    
    // Step 6: Final summary
    console.log('\n🎉 Setup Complete!');
    console.log(`✅ Agency: ${targetAgency.name} (${targetAgency.slug})`);
    console.log(`✅ Agency ID: ${targetAgency.id}`);
    console.log(`✅ Eleanor is owner of the agency`);
    console.log(`✅ Ashwood House is linked to the agency`);
    
    console.log('\n📋 Next steps:');
    console.log('1. Run: node scripts/add-colleague-to-agency.js colleague@email.com');
    console.log('2. The colleague will be added to the same agency as Eleanor');
    console.log('3. They will have access to Ashwood House once they sign up');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

setupEleanorAgency();
