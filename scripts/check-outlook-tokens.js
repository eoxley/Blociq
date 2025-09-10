require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOutlookTokens() {
  try {
    console.log('🔍 Checking Outlook tokens for Eleanor...');
    
    // Find Eleanor's user ID
    const { data: eleanor, error: eleanorError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();
    
    if (eleanorError || !eleanor) {
      console.error('❌ Could not find Eleanor:', eleanorError?.message);
      return;
    }
    
    console.log('✅ Found Eleanor:', eleanor.full_name || eleanor.email);
    console.log('   User ID:', eleanor.id);
    
    // Check if Eleanor has Outlook tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', eleanor.id);
    
    if (tokensError) {
      console.error('❌ Error fetching Outlook tokens:', tokensError);
      return;
    }
    
    if (!tokens || tokens.length === 0) {
      console.log('⚠️ Eleanor has no Outlook tokens');
      console.log('   This is why the Outlook connection shows as "Not Connected"');
      console.log('');
      console.log('📝 To fix this:');
      console.log('1. Eleanor needs to connect her Outlook account');
      console.log('2. Go to the homepage and click "Connect Outlook Account"');
      console.log('3. Complete the Microsoft OAuth flow');
      console.log('4. This will create tokens in the outlook_tokens table');
    } else {
      console.log('✅ Eleanor has Outlook tokens:');
      tokens.forEach((token, index) => {
        console.log(`   ${index + 1}. Email: ${token.email || 'Not set'}`);
        console.log(`      Expires: ${token.expires_at || 'Not set'}`);
        console.log(`      Created: ${token.created_at || 'Not set'}`);
        
        if (token.expires_at) {
          const expiresAt = new Date(token.expires_at);
          const now = new Date();
          const isExpired = expiresAt < now;
          console.log(`      Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
        }
      });
    }
    
    // Check all users with Outlook tokens
    console.log('\n📊 All users with Outlook tokens:');
    const { data: allTokens, error: allTokensError } = await supabase
      .from('outlook_tokens')
      .select(`
        user_id,
        email,
        expires_at,
        created_at,
        users!user_id (
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false });
    
    if (allTokensError) {
      console.error('❌ Error fetching all tokens:', allTokensError);
    } else if (allTokens && allTokens.length > 0) {
      allTokens.forEach((token, index) => {
        console.log(`   ${index + 1}. ${token.users?.full_name || token.users?.email || 'Unknown'}`);
        console.log(`      Email: ${token.email || 'Not set'}`);
        console.log(`      Expires: ${token.expires_at || 'Not set'}`);
        if (token.expires_at) {
          const expiresAt = new Date(token.expires_at);
          const now = new Date();
          const isExpired = expiresAt < now;
          console.log(`      Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
        }
      });
    } else {
      console.log('   No users have Outlook tokens');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkOutlookTokens();
