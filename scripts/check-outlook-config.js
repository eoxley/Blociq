require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking Outlook OAuth configuration...\n');

const requiredEnvVars = [
  'NEXT_PUBLIC_OUTLOOK_CLIENT_ID',
  'NEXT_PUBLIC_OUTLOOK_REDIRECT_URI',
  'OUTLOOK_CLIENT_ID',
  'OUTLOOK_CLIENT_SECRET',
  'OUTLOOK_REDIRECT_URI',
  'OUTLOOK_TENANT_ID'
];

console.log('📋 Environment Variables Status:');
let allConfigured = true;

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${envVar}: Not set`);
    allConfigured = false;
  }
});

console.log('\n🔧 Outlook OAuth URLs:');
if (process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID && process.env.NEXT_PUBLIC_OUTLOOK_REDIRECT_URI) {
  const clientId = process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_OUTLOOK_REDIRECT_URI;
  const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';
  
  const scopes = [
    'Calendars.Read',
    'Calendars.ReadWrite',
    'Mail.Read',
    'User.Read'
  ].join(' ');
  
  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` + 
    new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      response_mode: 'query'
    }).toString();
  
  console.log(`✅ Authorization URL: ${authUrl}`);
} else {
  console.log('❌ Cannot generate authorization URL - missing required environment variables');
}

console.log('\n📝 Summary:');
if (allConfigured) {
  console.log('✅ All required environment variables are configured');
  console.log('✅ Outlook OAuth should work properly');
  console.log('');
  console.log('🔧 To connect Outlook:');
  console.log('1. Go to the homepage');
  console.log('2. Click "Connect Outlook Account" button');
  console.log('3. Complete the Microsoft OAuth flow');
  console.log('4. The connection status will update to "Connected"');
} else {
  console.log('❌ Some environment variables are missing');
  console.log('❌ Outlook OAuth will not work until these are configured');
  console.log('');
  console.log('🔧 Missing variables need to be added to .env.local:');
  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      console.log(`   - ${envVar}`);
    }
  });
}
