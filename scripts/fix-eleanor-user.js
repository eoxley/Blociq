require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEleanorUser() {
  try {
    console.log('🔧 Fixing Eleanor\'s user record...');
    
    // Step 1: Check Eleanor in users table
    const { data: eleanor, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();
    
    if (userError || !eleanor) {
      console.error('❌ Could not find Eleanor in users table:', userError?.message);
      return;
    }
    
    console.log('✅ Found Eleanor in users table:');
    console.log('   ID:', eleanor.id);
    console.log('   Email:', eleanor.email);
    console.log('   Full Name:', eleanor.full_name);
    console.log('   Created:', eleanor.created_at);
    
    // Step 2: Check if Eleanor exists in auth.users
    console.log('\n🔍 Checking auth.users...');
    
    // We can't directly query auth.users with the service role, but we can try to create the user
    // or check if there's a mismatch between the users table and auth.users
    
    // Step 3: Try to create Eleanor in auth.users if needed
    console.log('📝 Attempting to create Eleanor in auth.users...');
    
    // First, let's try to get the user from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(eleanor.id);
    
    if (authError) {
      console.log('⚠️ Eleanor not found in auth.users, creating...');
      
      // Create user in auth.users
      const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
        email: eleanor.email,
        email_confirm: true,
        user_metadata: {
          full_name: eleanor.full_name,
          first_name: eleanor.first_name,
          last_name: eleanor.last_name
        }
      });
      
      if (createAuthError) {
        console.error('❌ Error creating Eleanor in auth.users:', createAuthError);
        
        // If the user already exists but with a different ID, let's try to find them
        console.log('🔍 Trying to find Eleanor by email...');
        const { data: foundUser, error: findError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        });
        
        if (!findError && foundUser?.users) {
          const eleanorAuth = foundUser.users.find(u => u.email === eleanor.email);
          if (eleanorAuth) {
            console.log('✅ Found Eleanor in auth.users with different ID:', eleanorAuth.id);
            console.log('   Auth ID:', eleanorAuth.id);
            console.log('   Users table ID:', eleanor.id);
            
            // Update the users table to match the auth ID
            const { error: updateError } = await supabase
              .from('users')
              .update({ id: eleanorAuth.id })
              .eq('email', eleanor.email);
            
            if (updateError) {
              console.error('❌ Error updating users table:', updateError);
            } else {
              console.log('✅ Updated users table ID to match auth.users');
              eleanor.id = eleanorAuth.id;
            }
          }
        }
      } else {
        console.log('✅ Created Eleanor in auth.users:', newAuthUser.user.id);
        eleanor.id = newAuthUser.user.id;
      }
    } else {
      console.log('✅ Eleanor found in auth.users:', authUser.user.id);
      if (authUser.user.id !== eleanor.id) {
        console.log('⚠️ ID mismatch - updating users table...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ id: authUser.user.id })
          .eq('email', eleanor.email);
        
        if (updateError) {
          console.error('❌ Error updating users table:', updateError);
        } else {
          console.log('✅ Updated users table ID to match auth.users');
          eleanor.id = authUser.user.id;
        }
      }
    }
    
    // Step 4: Now try to add Eleanor to the agency
    console.log('\n👤 Adding Eleanor to BlocIQ agency...');
    
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
    
    const { error: addMembershipError } = await supabase
      .from('agency_members')
      .insert({
        agency_id: agency.id,
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
    
    // Step 5: Link Ashwood House to the agency
    console.log('\n🏠 Linking Ashwood House to agency...');
    
    const { data: ashwood, error: ashwoodError } = await supabase
      .from('buildings')
      .select('id, name, agency_id')
      .eq('name', 'Ashwood House')
      .single();
    
    if (ashwoodError || !ashwood) {
      console.log('📝 Creating Ashwood House...');
      const { data: newAshwood, error: createAshwoodError } = await supabase
        .from('buildings')
        .insert({
          name: 'Ashwood House',
          address: '123 Ashwood Gardens, London SW19 8QR',
          agency_id: agency.id,
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
    } else {
      console.log('✅ Found Ashwood House:', ashwood.name);
      
      if (ashwood.agency_id !== agency.id) {
        console.log('🔄 Updating Ashwood House agency...');
        const { error: updateError } = await supabase
          .from('buildings')
          .update({ agency_id: agency.id })
          .eq('id', ashwood.id);
        
        if (updateError) {
          console.error('❌ Error updating Ashwood House:', updateError);
          return;
        }
        
        console.log('✅ Updated Ashwood House to BlocIQ agency');
      } else {
        console.log('ℹ️ Ashwood House is already linked to BlocIQ agency');
      }
    }
    
    console.log('\n🎉 Setup Complete!');
    console.log(`✅ Eleanor is now owner of BlocIQ agency`);
    console.log(`✅ Ashwood House is linked to BlocIQ agency`);
    console.log(`✅ Agency ID: ${agency.id}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixEleanorUser();
