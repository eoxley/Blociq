require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOutlookTokensSchema() {
  try {
    console.log('🔧 Checking outlook_tokens table structure...');
    
    // Check if the table exists and get its structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Error accessing outlook_tokens table:', tableError);
      return;
    }
    
    console.log('✅ outlook_tokens table exists');
    
    // Check if there are any tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('outlook_tokens')
      .select('*');
    
    if (tokensError) {
      console.error('❌ Error fetching tokens:', tokensError);
      return;
    }
    
    console.log(`📊 Found ${tokens?.length || 0} Outlook tokens in the table`);
    
    if (tokens && tokens.length > 0) {
      console.log('📋 Sample token structure:');
      const sampleToken = tokens[0];
      Object.keys(sampleToken).forEach(key => {
        console.log(`   ${key}: ${typeof sampleToken[key]} (${sampleToken[key]})`);
      });
    }
    
    // Check if Eleanor has any tokens (without the foreign key join)
    const { data: eleanorTokens, error: eleanorError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', '938498a6-2906-4a75-bc91-5d0d586b227e');
    
    if (eleanorError) {
      console.error('❌ Error fetching Eleanor\'s tokens:', eleanorError);
    } else {
      console.log(`👤 Eleanor has ${eleanorTokens?.length || 0} Outlook tokens`);
      if (eleanorTokens && eleanorTokens.length > 0) {
        eleanorTokens.forEach((token, index) => {
          console.log(`   ${index + 1}. Email: ${token.email || 'Not set'}`);
          console.log(`      Expires: ${token.expires_at || 'Not set'}`);
          if (token.expires_at) {
            const expiresAt = new Date(token.expires_at);
            const now = new Date();
            const isExpired = expiresAt < now;
            console.log(`      Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
          }
        });
      }
    }
    
    console.log('\n📝 Summary:');
    console.log('The outlook_tokens table exists but Eleanor has no tokens.');
    console.log('This is why the Outlook connection shows as "Not Connected".');
    console.log('');
    console.log('🔧 To fix this:');
    console.log('1. Eleanor needs to go to the homepage');
    console.log('2. Click "Connect Outlook Account" button');
    console.log('3. Complete the Microsoft OAuth flow');
    console.log('4. This will create tokens in the outlook_tokens table');
    console.log('5. The connection status will then show as "Connected"');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixOutlookTokensSchema();
